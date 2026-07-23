import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isValidUrl } from '@/lib/utils';
import { isUrlSafe } from '@/lib/security/validateUrl';
import { PLANS } from '@/lib/dodo/plans';
import { z } from 'zod';
// Step 4: ledger-driven quota reads; multi-URL consumes go in as one row.
import {
  getScansRemaining,
  consumeBatchCredits,
  refundCredit,
} from '@/lib/scanner/credits';
// Step 8: page-render cap (compute-cost tail).
import {
  getPageRendersRemaining,
  consumePageRenders,
  refundBatchPageRenders,
  logPageOveragePending,
} from '@/lib/scanner/credits';
import { classifyFailure } from '@/lib/scanner/failure';

// ── GET  /api/scan/batch?monitoring=true ──
// Returns batch scans filtered by monitoring name prefix.
export async function GET(request: NextRequest) {
  const authClient = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monitoring = searchParams.get('monitoring') === 'true';

  let query = db
    .from('batch_scans')
    .select('id, name, status, total_urls, completed_urls, failed_urls, created_at, completed_at, base_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (monitoring) {
    // Filter to monitoring batches (named by monitoring-worker.mjs)
    query = query.ilike('name', 'Monitoring scan of%');
  }

  const { data: batches, error: batchesError } = await query;

  if (batchesError) {
    return NextResponse.json({ error: batchesError.message }, { status: 500 });
  }

  // Fetch individual scans + reports for each batch
  const batchIds = (batches || []).map(b => b.id);
  const scansByBatch: Record<string, any[]> = {};

  if (batchIds.length > 0) {
    const { data: scans } = await db
      .from('scans')
      .select('id, url, compliance_score, total_violations, critical_count, serious_count, moderate_count, minor_count, status, created_at, batch_id, reports(id)')
      .in('batch_id', batchIds)
      .order('created_at', { ascending: true });

    for (const scan of scans || []) {
      if (!scan.batch_id) continue;
      if (!scansByBatch[scan.batch_id]) scansByBatch[scan.batch_id] = [];
      scansByBatch[scan.batch_id].push(scan);
    }
  }

  return NextResponse.json({ batches, scansByBatch });
}

// Creates a batch of URLs to scan. This route does NOT run any browser
// scans itself — it just validates and queues rows in `scans`
// with status 'queued'. The actual scanning happens a few URLs at a time
// via the /api/cron/process-batch worker, so this request always returns
// in well under a second regardless of batch size.
const batchRequestSchema = z.object({
  urls: z.array(z.string().min(1)).min(1).max(25),
  name: z.string().max(200).optional(),
  wcag_level: z.enum(['A', 'AA', 'AAA']).optional().default('AA'),
  wcag_version: z.enum(['2.1', '2.2']).optional().default('2.1'),
});

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = batchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { urls, name, wcag_level, wcag_version } = parsed.data;

  // Step 4: scans_used_this_month column was dropped; remaining count
  // is read from the ledger via getScansRemaining() below.
  const { data: profileData } = await db
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  // Step 2: batch gating mirrors multiscan — any paid tier, but the
  // upper bound reads from plan.limits.multiscanPageCap so each tier
  // has its own batch ceiling instead of hardcoded 10/25.
  const planId = profileData?.subscription_status || 'free';
  const isPaidForBatch =
    planId === 'starter' || planId === 'growth' || planId === 'enterprise';
  if (!isPaidForBatch) {
    return NextResponse.json(
      { error: 'Batch scanning is a paid feature. Upgrade to scan multiple URLs at once.' },
      { status: 403 }
    );
  }

  const planLimits = PLANS[planId as keyof typeof PLANS].limits;
  // Step 4: read quota from ledger; plan cap is the upper bound on a single batch.
  const remaining = await getScansRemaining(user.id);
  const maxBatchSize = planLimits.multiscanPageCap;

  if (urls.length > maxBatchSize) {
    return NextResponse.json(
      { error: `Your plan allows up to ${maxBatchSize} URLs per batch.` },
      { status: 400 }
    );
  }

  if (urls.length > remaining) {
    return NextResponse.json(
      {
        error: 'Scan limit reached',
        code: 'SCAN_LIMIT_REACHED',
        message: `This batch (${urls.length} URLs) would exceed your remaining monthly scans (${remaining} left).`,
      },
      { status: 429 }
    );
  }

  // Step 8: page-render hard cap (mirrors multiscan behaviour). Pre-check
  // BEFORE consumption so a rejected batch costs zero credits.
  const rendersRemaining = await getPageRendersRemaining(user.id);
  if (urls.length > rendersRemaining) {
    await logPageOveragePending(
      user.id, null, urls.length, planLimits.pageRendersPerMonth,
    );
    return NextResponse.json(
      {
        error: 'Page render limit reached',
        code: 'PAGE_RENDER_LIMIT_REACHED',
        message: `This batch (${urls.length} URLs) would exceed your remaining monthly page renders (${rendersRemaining} of ${planLimits.pageRendersPerMonth} left).`,
        upgrade_url: '/pricing',
      },
      { status: 429 }
    );
  }

  // Validate + de-dupe URLs
  const seen = new Set<string>();
  const validUrls: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url || seen.has(url) || !isValidUrl(url)) continue;
    const safety = await isUrlSafe(url);
    if (!safety.safe) continue;
    seen.add(url);
    validUrls.push(url);
  }

  if (validUrls.length === 0) {
    return NextResponse.json({ error: 'No valid, safe URLs provided.' }, { status: 400 });
  }

  const batchId = crypto.randomUUID();
  const { error: batchError } = await db.from('batch_scans').insert({
    id: batchId,
    user_id: user.id,
    name: name || `Batch scan — ${validUrls.length} URLs`,
    status: 'queued',
    total_urls: validUrls.length,
    wcag_level,
    wcag_version,
  });

  if (batchError) {
    console.error('Failed to create batch:', batchError);
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }

  const scanRows = validUrls.map((url, i) => ({
    id: crypto.randomUUID(),
    batch_id: batchId,
    user_id: user.id,
    url,
    status: 'queued' as const,
    queue_position: i,
    pages_requested: 1,
    wcag_level,
    wcag_version,
  }));

  const { error: scansError } = await db.from('scans').insert(scanRows);
  if (scansError) {
    console.error('Failed to queue batch scans:', scansError);
    await db.from('batch_scans').delete().eq('id', batchId);
    return NextResponse.json({ error: 'Failed to queue scans' }, { status: 500 });
  }

  // Step 4: reserve the batch as ONE ledger row with delta = -page_count.
  // Per-URL failures inside batchProcessor.ts refund individually.
  // Step 8: also reserve page-render credits in parallel so per-URL
  // refunds inside batchProcessor.ts can roll back both metrics.
  try {
    await consumeBatchCredits(user.id, batchId, validUrls.length);
    await consumePageRenders(user.id, null, validUrls.length, { batch_id: batchId });
  } catch (ledgerErr) {
    console.error('[BATCH] Ledger-consume write failed:', ledgerErr);
  }

  return NextResponse.json({
    batch_id: batchId,
    total_urls: validUrls.length,
    status: 'queued',
    message: `Batch queued. Scans process a few at a time in the background — check /batch/${batchId} for progress.`,
  });
}