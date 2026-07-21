import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isValidUrl } from '@/lib/utils';
import { isUrlSafe } from '@/lib/security/validateUrl';
import { PLANS } from '@/lib/dodo/plans';
import { z } from 'zod';
// Step 4: ledger-driven quota reads/writes/refunds.
import {
  getScansRemaining,
  consumeBatchCredits,
  refundBatchCredits,
} from '@/lib/scanner/credits';
// Step 8: page-render cap (compute-cost tail).
import {
  getPageRendersRemaining,
  consumePageRenders,
  refundBatchPageRenders,
  logPageOveragePending,
} from '@/lib/scanner/credits';

// Step 2: the per-request upper bound comes from the plan's
// multiscanPageCap (free:1 starter:15 growth:25 enterprise:50).
// Cap the request body to enterprise's max (50) so Zod never accepts
// a request the plan can't honour — actual enforcement uses the
// resolved plan limit below, not this number.
const multiscanSchema = z.object({
  url: z.string().min(1, 'URL is required').refine(isValidUrl, 'Invalid URL format'),
  page_count: z.number().int().min(2).max(50),
  wcag_version: z.enum(['2.1', '2.2']).optional().default('2.1'),
  wcag_level: z.enum(['A', 'AA', 'AAA']).optional().default('AA'),
});

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = multiscanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { url, page_count, wcag_version, wcag_level } = parsed.data;

  // Safety check
  const safetyCheck = await isUrlSafe(url);
  if (!safetyCheck.safe) {
    return NextResponse.json({ error: safetyCheck.reason }, { status: 400 });
  }

  // Check plan limits - multiscan is a Starter/Growth/Enterprise feature.
  const { data: profileData } = await db
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  // Step 2: gate is on any paid tier.
  const planId = profileData?.subscription_status || 'free';
  const isPaidForMultiscan =
    planId === 'starter' || planId === 'growth' || planId === 'enterprise';
  if (!isPaidForMultiscan) {
    return NextResponse.json(
      { error: 'Multi-page scanning is a Starter feature. Upgrade to scan multiple pages at once.' },
      { status: 403 }
    );
  }

  const planLimits = PLANS[planId as keyof typeof PLANS].limits;

  // Step 2: page_count must not exceed the tier's multiscanPageCap
  // (this is what feeds Step-1's discoverPages()).
  if (page_count > planLimits.multiscanPageCap) {
    return NextResponse.json(
      {
        error: 'Page cap exceeded',
        code: 'MULTISCAN_PAGE_CAP_EXCEEDED',
        message: `Your ${planId} plan allows up to ${planLimits.multiscanPageCap} pages per multi-scan.`,
      },
      { status: 400 }
    );
  }

  // Step 4: read quota from ledger.
  const remaining = await getScansRemaining(user.id);
  if (page_count > remaining) {
    return NextResponse.json(
      {
        error: 'Scan limit reached',
        code: 'SCAN_LIMIT_REACHED',
        message: `This multi-scan (${page_count} pages) would exceed your remaining monthly scans (${remaining} left).`,
      },
      { status: 429 }
    );
  }

  // Step 8: page-render hard cap. Same shape as the scan cap check above;
  // pre-check before any consumption so we never need to refund.
  const rendersRemaining = await getPageRendersRemaining(user.id);
  if (page_count > rendersRemaining) {
    await logPageOveragePending(
      user.id, null, page_count, planLimits.pageRendersPerMonth,
    );
    return NextResponse.json(
      {
        error: 'Page render limit reached',
        code: 'PAGE_RENDER_LIMIT_REACHED',
        message: `This multi-scan (${page_count} pages) would exceed your remaining monthly page renders (${rendersRemaining} of ${planLimits.pageRendersPerMonth} left).`,
        upgrade_url: '/pricing',
      },
      { status: 429 }
    );
  }

  // Create batch scan record
  const batchId = crypto.randomUUID();
  const { error: batchError } = await db.from('batch_scans').insert({
    id: batchId,
    user_id: user.id,
    name: `Multi-scan: ${new URL(url).hostname} (${page_count} pages)`,
    status: 'queued',
    total_urls: page_count,
    wcag_level,
    wcag_version,
    scan_type: 'multiscan',
    base_url: url,
  });

  if (batchError) {
    console.error('Failed to create batch:', batchError);
    return NextResponse.json({ error: 'Failed to create multi-scan batch' }, { status: 500 });
  }

  // Step 4: reserve the batch as ONE ledger row with delta = -page_count.
  // Per-URL refunds inside the worker happen via batchProcessor.refundCredit.
  // Step 8: also reserve page-render credits; per-URL refunds must include
  // both scan and page-render credits so the user doesn't lose renders
  // when one URL in a batch engine-fails.
  try {
    await consumeBatchCredits(user.id, batchId, page_count);
    await consumePageRenders(user.id, null, page_count, { batch_id: batchId });
  } catch (ledgerErr) {
    console.error('[MULTISCAN] Ledger-consume write failed:', ledgerErr);
  }

  // Trigger GitHub Actions workflow
  try {
    // IMPORTANT: GITHUB_PAT must be a Personal Access Token (PAT), NOT the default GITHUB_TOKEN.
    // The default GITHUB_TOKEN cannot trigger workflow_dispatch events.
    // Create a PAT at https://github.com/settings/tokens with 'repo' scope.
    const githubToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;

    if (!repoOwner || !repoName) {
      console.error('GITHUB_REPO_OWNER or GITHUB_REPO_NAME not configured');
      // Step 4: refund the batch's reserved credits.
      await refundBatchCredits(user.id, batchId, page_count, 'engine_failure');
      // Step 8: page-render refund for the whole aborted batch.
      await refundBatchPageRenders(user.id, batchId, page_count, 'engine_failure');
      await db.from('batch_scans').delete().eq('id', batchId);
      return NextResponse.json(
        { error: 'Multi-scan service configuration error. Please contact support.' },
        { status: 503 }
      );
    }

    if (!githubToken) {
      console.error('GITHUB_PAT not configured');
      // Step 4: refund the batch's reserved credits.
      await refundBatchCredits(user.id, batchId, page_count, 'engine_failure');
      // Step 8: page-render refund for the whole aborted batch.
      await refundBatchPageRenders(user.id, batchId, page_count, 'engine_failure');
      await db.from('batch_scans').delete().eq('id', batchId);
      return NextResponse.json(
        { error: 'Multi-scan service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const workflowResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/multiscan.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            batch_id: batchId,
            user_id: user.id,
            base_url: url,
            page_count: page_count.toString(),
            wcag_version,
            wcag_level,
          },
        }),
      }
    );

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      console.error(`Failed to trigger GitHub Actions (${workflowResponse.status}): ${repoOwner}/${repoName}`, errorText);

      // Step 4: refund the batch's reserved credits.
      await refundBatchCredits(user.id, batchId, page_count, 'engine_failure');
      // Step 8: page-render refund for the whole aborted batch.
      await refundBatchPageRenders(user.id, batchId, page_count, 'engine_failure');
      // Mark batch as failed
      await db
        .from('batch_scans')
        .update({ status: 'failed' })
        .eq('id', batchId);

      return NextResponse.json(
        { error: 'Failed to start multi-scan. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      batch_id: batchId,
      total_pages: page_count,
      status: 'queued',
      message: `Multi-scan queued. Scanning ${page_count} pages in the background — check /batch/${batchId} for progress.`,
    });

  } catch (err: any) {
    console.error('GitHub Actions trigger failed:', err);

    // Step 4: refund the batch's reserved credits.
    await refundBatchCredits(user.id, batchId, page_count, 'engine_failure');
    // Step 8: page-render refund for the whole aborted batch.
    await refundBatchPageRenders(user.id, batchId, page_count, 'engine_failure');
    // Mark batch as failed
    await db
      .from('batch_scans')
      .update({ status: 'failed' })
      .eq('id', batchId);

    return NextResponse.json(
      { error: 'Failed to start multi-scan. Please try again.' },
      { status: 500 }
    );
  }
}
