import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isValidUrl } from '@/lib/utils';
// Step 6: populate wcag_criterion at insert (was hardcoded 'N/A').
import { mapAxeTagsToCriterion } from '@/lib/vpat/wcagMapping';
import { PLANS } from '@/lib/dodo/plans';
import { isUrlSafe } from '@/lib/security/validateUrl';
import { z } from 'zod';
import { takeAnnotatedScreenshot } from '@/lib/scanner/screenshot';
// Step 4: ledger-driven quota reads/writes/refunds.
import {
  getScansRemaining,
  consumeCredit,
  refundCredit,
} from '@/lib/scanner/credits';
// Step 8: page-render cap (compute-cost tail).
import {
  getPageRendersRemaining,
  consumePageRenders,
  refundPageRenders,
  logPageOveragePending,
} from '@/lib/scanner/credits';
import { classifyFailure } from '@/lib/scanner/failure'
// Step 10: cross-scan violation-status carry-forward.
import { reconcileStatus } from '@/lib/scanner/statusTracker';

const scanRequestSchema = z.object({
  url: z.string().min(1, 'URL is required').refine(isValidUrl, 'Invalid URL format'),
  wcag_level: z.enum(['A', 'AA', 'AAA']).optional().default('AA'),
  wcag_version: z.enum(['2.1', '2.2']).optional().default('2.1'),
});

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const db = createServiceClient();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '0.0.0.0';

  const body = await request.json();
  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { url, wcag_level, wcag_version } = parsed.data;

  const safetyCheck = await isUrlSafe(url);
  if (!safetyCheck.safe) {
    return NextResponse.json({ error: safetyCheck.reason }, { status: 400 });
  }

  const { data: { user } } = await authClient.auth.getUser();
  let userId: string | null = user?.id || null;
  let planLimits = PLANS.free.limits;
  let isAnonymous = !userId;

  let useResponsive = false;
  let allowScreenshot = false;
  let requestedRenders = 1;

  if (user) {
    const { data: profileData } = await db
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    if (profileData) {
      const planId = profileData.subscription_status;
      planLimits = PLANS[planId as keyof typeof PLANS]?.limits || PLANS.free.limits;

      // Step 4: ledger SUM(delta) replaces the mutable counter.
      const remaining = await getScansRemaining(user.id);
      if (remaining <= 0) {
        return NextResponse.json(
          {
            error: 'Scan limit reached',
            code: 'SCAN_LIMIT_REACHED',
            message: `You have used all ${planLimits.scansPerMonth} scans for this month. Upgrade to continue scanning.`,
          },
          { status: 429 }
        );
      }

      // Step 8: page-render hard cap. Pre-check before consuming either
      // credit so a rejection does not need a refund of the scan credit.
      // Responsive scans render 3 viewports; non-responsive render 1.
      requestedRenders = useResponsive ? 3 : 1;
      const rendersRemaining = await getPageRendersRemaining(user.id);
      if (rendersRemaining < requestedRenders) {
        await logPageOveragePending(user.id, null, requestedRenders, planLimits.pageRendersPerMonth);
        return NextResponse.json(
          {
            error: 'Page render limit reached',
            code: 'PAGE_RENDER_LIMIT_REACHED',
            message: `Your ${planLimits.pageRendersPerMonth} page-render allotment is exhausted. Upgrade to continue scanning.`,
            upgrade_url: '/pricing',
          },
          { status: 429 }
        );
      }

      // Step 2: any paid tier signals Pro-equivalent features downstream.
  if (
    planId === 'starter' || planId === 'growth' || planId === 'enterprise'
  ) {
        useResponsive = true;
        allowScreenshot = true;
      }
    }
  } else {
    const { data: usage } = await db
      .from('free_scan_usage')
      .select('id')
      .eq('ip_address', ip)
      .gte('scanned_at', new Date(Date.now() - 86_400_000).toISOString())
      .limit(1);

    if (usage && usage.length > 0) {
      return NextResponse.json(
        { error: 'Free scan limit reached. Sign up for more scans.' },
        { status: 429 }
      );
    }

    await db.from('free_scan_usage').insert({ ip_address: ip, url });
  }

  const scanId = crypto.randomUUID();
  const { error: insertError } = await db.from('scans').insert({
    id: scanId,
    user_id: userId,
    url,
    status: 'running',
    pages_requested: 1,
    wcag_level,
    wcag_version,
    started_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('Failed to insert scan:', insertError);
    return NextResponse.json({ error: 'Failed to create scan record' }, { status: 500 });
  }

  // Step 4: consume one credit up front. The catch branch refunds on
  // engine_failure or capped-unreachable, so a failed scan leaves the
  // user's ledger sum unchanged (the SUM-based remaining count proves
  // it via the scan_failed_refund row).
  if (userId) {
    try {
      await consumeCredit(userId, scanId);
      // Step 8: consume page-render credits in parallel. requestRenders
      // was computed during the quota gate above.
      await consumePageRenders(userId, scanId, requestedRenders);
    } catch (ledgerErr) {
      console.error('[SCAN] Credit-consume write failed:', ledgerErr);
      // Do NOT block the scan — the row insert succeeded, so let the
      // scan attempt run. Worst case the user gets a free scan.
    }
  }

  let browser: import('puppeteer').Browser | null = null;

  try {
    const { launchBrowser, runScan } = await import('@/lib/scanner/engine');
    browser = await launchBrowser();

    const result = await runScan(url, wcag_version, { useResponsive }, browser);

    // ── Screenshot (kept in route, not engine) ──
    let screenshotStorageUrl: string | null = null;
    let screenshotMarkers: any[] = [];
    let screenshotWidth = 0;
    let screenshotHeight = 0;

    if (allowScreenshot && result.violations?.length > 0) {
      try {
        const screenshotPage = await browser.newPage();
        await screenshotPage.setBypassCSP(true);
        await screenshotPage.setViewport({ width: 1280, height: 720 });

        try {
          await screenshotPage.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        } catch {
          await screenshotPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        const shot = await takeAnnotatedScreenshot(
          screenshotPage,
          result.violations.map((v: any) => ({
            target: Array.isArray(v.target) ? v.target : [v.target],
            id: v.id,
            impact: v.impact,
          }))
        );

        screenshotMarkers = shot.markers;
        screenshotWidth = shot.width;
        screenshotHeight = shot.height;

        if (shot.base64Png) {
          const base64Data = shot.base64Png.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `${scanId}.png`;

          const { data: uploadData, error: uploadError } = await db
            .storage
            .from('scan-screenshots')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

          if (uploadError) {
            console.warn('[SCAN] Storage upload error:', uploadError.message);
          } else if (uploadData) {
            const { data: publicUrlData } = db.storage.from('scan-screenshots').getPublicUrl(fileName);
            screenshotStorageUrl = publicUrlData.publicUrl;
          }
        }

        await screenshotPage.close();
      } catch (screenshotErr) {
        console.warn('[SCAN] Screenshot generation failed:', screenshotErr);
      }
    }

    const { error: updateError } = await db
      .from('scans')
      .update({
        status: 'completed',
        pages_scanned: 1,
        compliance_score: result.score,
        wcag_version,
        total_violations: result.totalViolations,
        critical_count: result.critical,
        serious_count: result.serious,
        moderate_count: result.moderate,
        minor_count: result.minor,
        big_six: result.bigSix as any,
        has_overlay_widget: result.hasOverlayWidget === true,
        error_message: null,
        completed_at: new Date().toISOString(),
        keyboard_issues: result.keyboardIssues || [],
        viewport_breakdown: result.viewportBreakdown || [],
        screenshot_url: screenshotStorageUrl,
        screenshot_markers: screenshotMarkers,
        screenshot_width: screenshotWidth,
        screenshot_height: screenshotHeight,
      })
      .eq('id', scanId);

    if (updateError) {
      console.error('Failed to update scan:', updateError);
    }

    let reportId: string | null = null;
    if (userId) {
      // Step 4: consume was already done AFTER the scan row insert and
      // BEFORE runScan — nothing to do here on success.
      const { data: report } = await db
        .from('reports')
        .insert({
          scan_id: scanId,
          user_id: userId,
          name: `Scan of ${url} - ${new Date().toLocaleDateString()}`,
          is_public: false,
        })
        .select()
        .single();
      reportId = report?.id || null;
    }

    // ── Insert ALL violations to DB (complete audit trail) ──
    if (result.violations.length > 0) {
      const violationsToInsert = result.violations.map((v: any, i: number) => ({
        scan_id: scanId,
        rule_id: v.id,
        rule_description: v.description?.slice(0, 500) || v.help?.slice(0, 500) || '',            impact: v.impact,
            wcag_criterion: mapAxeTagsToCriterion(v.tags),
        wcag_level,
        page_url: v.page_url || v.frame_source || result.url,
        element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
        element_selector: v.nodes?.[0]?.target?.join(' ')?.slice(0, 500) || '',
        node_count: v.nodeCount || v.nodes?.length || 1,
        tags: v.tags || [],
        fix_summary: v.help?.slice(0, 500) || '',
        fix_detail: v.description?.slice(0, 2000) || '',
        help_url: v.helpUrl || '',
        sort_order: i,
      }));

      const { error: violationsError } = await db.from('violations').insert(violationsToInsert);
      if (violationsError) {
        console.error('Failed to insert violations:', violationsError);
      }

      // Step 10: reconcile violation_status against the prior scan of the same URL.
      // Best-effort; a failure here MUST NOT block the response. Errors here
      // would only cause status carry-forward to lag (auto-merge on the next
      // scan), which is recoverable.
      if (userId) {
        try {
          await reconcileStatus(userId, scanId, url, result.violations.map((v: any) => ({
            rule_id: v.id,
            page_url: v.page_url || v.frame_source || result.url,
            element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
          })));
        } catch (statusErr) {
          console.warn('[SCAN] reconcileStatus failed (will retry on next scan):', statusErr);
        }
      }
    }

    // ── Send email notification to user ──
    if (userId && reportId) {
      try {
        const { data: profile } = await db
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();

        if (profile?.email) {
          const { sendScanCompleteEmail } = await import('@/lib/email/resend');
          await sendScanCompleteEmail(
            profile.email,
            url,
            result.score,
            result.totalViolations,
            reportId,
            process.env.NEXT_PUBLIC_APP_URL || 'https://wcagscannerr.com'
          );
        }
      } catch (emailErr) {
        console.error('[SCAN] Failed to send email:', emailErr);
      }
    }

    // ── Build response: cap at 10 per impact so UI isn't overwhelmed ──
    const mappedViolations = result.violations.map((v: any) => ({
      id: `${scanId}-${v.id}`,
      rule_id: v.id,
      rule_description: v.description?.slice(0, 500) || v.help?.slice(0, 500) || '',
      impact: v.impact,
      wcag_criterion: v.wcagCriterion || v.wcag_criterion || 'N/A',
      wcag_level,
      page_url: v.page_url || v.frame_source || result.url,
      element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
      element_selector: v.nodes?.[0]?.target?.join(' ')?.slice(0, 500) || '',
      fix_summary: v.help?.slice(0, 500) || '',
      fix_detail: v.description?.slice(0, 2000) || '',
      help_url: v.helpUrl || '',
      created_at: new Date().toISOString(),
    }));

    // Cap: max 10 of each impact type for the frontend response
    const byImpact: Record<string, typeof mappedViolations> = {}
    for (const v of mappedViolations) {
      byImpact[v.impact] ||= []
      byImpact[v.impact].push(v)
    }
    const cappedViolations: typeof mappedViolations = []
    for (const impact of ['critical', 'serious', 'moderate', 'minor']) {
      const group = byImpact[impact] || []
      // Sort by node count (most widespread first) and take top 10
      group.sort((a: any, b: any) => (b.node_count || 1) - (a.node_count || 1))
      cappedViolations.push(...group.slice(0, 10))
    }

    const responsePayload: any = {
      scan_id: scanId,
      id: scanId,
      url,
      status: 'completed',
      pages_scanned: 1,
      pages_requested: 1,
      compliance_score: result.score,
      total_violations: result.totalViolations,
      critical_count: result.critical,
      serious_count: result.serious,
      moderate_count: result.moderate,
      minor_count: result.minor,
      wcag_level,
      wcag_version,
      has_overlay_widget: result.hasOverlayWidget === true,
      big_six: result.bigSix,
      error_message: null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      violations: cappedViolations,
      message: 'Scan completed successfully',
    };

    if (useResponsive) {
      responsePayload.keyboard_issues = result.keyboardIssues || [];
      responsePayload.viewport_breakdown = result.viewportBreakdown || [];
    }
    if (screenshotStorageUrl) {
      responsePayload.screenshot_url = screenshotStorageUrl;
      responsePayload.screenshot_markers = screenshotMarkers;
      responsePayload.screenshot_width = screenshotWidth;
      responsePayload.screenshot_height = screenshotHeight;
    }

    return NextResponse.json(responsePayload);

  } catch (scanError: any) {
    console.error('Scan execution failed:', scanError);

    await db
      .from('scans')
      .update({
        status: 'failed',
        error_message: scanError?.message || 'Unknown scan error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);

    // Step 4: refund if it's on our side. invalid_target is unreachable
    // here because isUrlSafe() rejects BEFORE this catch arm runs and
    // never even creates a scan row.
    let refund: { issued: boolean; capped: boolean; failure_reason: string } = { issued: false, capped: false, failure_reason: 'engine_failure' };
    let pageRefund: { issued: boolean; capped: boolean; failure_reason: string } = { issued: false, capped: false, failure_reason: 'engine_failure' };
    if (userId) {
      try {
        refund = await refundCredit(userId, scanId, classifyFailure(scanError));
        // Step 8: refund the page-render credits consumed at scan-start.
        // Same failure_type gate (invalid_target is unreachable here).
        pageRefund = await refundPageRenders(
          userId,
          scanId,
          requestedRenders,
          classifyFailure(scanError),
        );
      } catch (ledgerErr) {
        // Never let a ledger write failure crash the response.
        console.error('[SCAN] Credit-refund write failed:', ledgerErr);
      }
    }

    return NextResponse.json(
      {
        scan_id: scanId,
        status: 'failed',
        error: scanError?.message || 'Scan failed',
        refund_issued: refund.issued,
        refund_capped: refund.capped,
        failure_reason: refund.failure_reason,
        page_refund_issued: pageRefund.issued,
        page_refund_capped: pageRefund.capped,
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch((err: unknown) =>
        console.warn('[SCAN] Browser close error:', (err as Error).message)
      );
    }
  }
}