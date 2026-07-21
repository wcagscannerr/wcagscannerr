/**
 * CI/CD API: POST /api/v1/scan
 *
 * Accepts Bearer token authentication for CI/CD pipelines.
 * Returns machine-readable JSON with exit-code-friendly fields.
 * Enforces plan limits (scans per month, pages per scan).
 * Supports GitHub Actions, GitLab CI, Jenkins, etc.
 *
 * Request:
 *   POST /api/v1/scan
 *   Authorization: Bearer wcag_live_...
 *   Content-Type: application/json
 *   { "url": "https://example.com", "wcag_version": "2.1", "fail_threshold": 85 }
 *
 * NOTE: max_pages is currently locked to 1. The old synchronous multi-page
 * crawl (scanning N pages inside a single request) routinely exceeded
 * Vercel's function timeout for anything beyond a handful of pages, which
 * made CI runs unreliable. Multi-URL scanning now goes through the batch
 * queue (POST /api/scan/batch) instead, which isn't wired into this v1 API
 * yet — ping support if you need that for CI.
 *
 * Response (200 if passed, 400 if below threshold):
 *   {
 *     "success": true,
 *     "scan_id": "uuid",
 *     "url": "https://example.com",
 *     "score": 85,
 *     "passed": true,
 *     "violations": [...],
 *     "summary": { "critical": 0, "serious": 2, "moderate": 3, "minor": 1 }
 *   }
 *
 * Response (401/403/429/500):
 *   { "success": false, "error": "...", "code": "..." }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateApiKey, hasPermission } from '@/lib/api-keys/utils'
import { runScan } from '@/lib/scanner/engine'
import { createServiceClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/dodo/plans'
import { checkRateLimit } from '@/lib/security/rateLimit'
// Step 4: ledger-driven quota reads/writes/refunds (v1 Bearer auth
// resolves userId from the API key, not from a session).
import {
  getScansRemaining,
  consumeCredit,
  refundCredit,
  // Step 8: page-render cap (compute-cost tail) — Enterprise API surface.
  getPageRendersRemaining,
  consumePageRenders,
  refundPageRenders,
  logPageOveragePending,
} from '@/lib/scanner/credits'
import { classifyFailure } from '@/lib/scanner/failure'
// Step 6: populate wcag_criterion at insert (was hardcoded 'N/A').
import { mapAxeTagsToCriterion } from '@/lib/vpat/wcagMapping'
// Step 10: cross-scan violation-status carry-forward (Enterprise API surface).
import { reconcileStatus } from '@/lib/scanner/statusTracker'

const scanRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  wcag_version: z.enum(['2.1', '2.2']).default('2.1'),
  max_pages: z.number().int().min(1).max(1).default(1),
  fail_threshold: z.number().int().min(0).max(100).default(85),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ── 1. Authenticate via Bearer token ──
    const authHeader = request.headers.get('authorization')
    const apiKey = await validateApiKey(authHeader)

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing API key',
          code: 'UNAUTHORIZED',
          duration_ms: Date.now() - startTime,
        },
        { status: 401 }
      )
    }

    if (!hasPermission(apiKey, 'scan:create')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API key lacks scan:create permission',
          code: 'FORBIDDEN',
          duration_ms: Date.now() - startTime,
        },
        { status: 403 }
      )
    }

    // ── 2. Rate limit check: 60 requests per minute per key ──
    const rateCheck = await checkRateLimit(`api:v1:${apiKey.id}`, 'scan', 60, 1)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Max 60 requests per minute per key.',
          code: 'RATE_LIMITED',
          duration_ms: Date.now() - startTime,
        },
        { status: 429 }
      )
    }

    // ── 3. Parse and validate body ──
    const body = await request.json()
    const parsed = scanRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
          duration_ms: Date.now() - startTime,
        },
        { status: 400 }
      )
    }

    const { url, wcag_version, max_pages, fail_threshold } = parsed.data

    // ── 4. Get user's subscription plan ──
    const db = createServiceClient()
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('subscription_status')
      .eq('id', apiKey.user_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'User profile not found',
          code: 'USER_NOT_FOUND',
          duration_ms: Date.now() - startTime,
        },
        { status: 500 }
      )
    }

    const planId = profile.subscription_status || 'free'
    const planLimits = PLANS[planId]?.limits

    if (!planLimits) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid subscription plan',
          code: 'INVALID_PLAN',
          duration_ms: Date.now() - startTime,
        },
        { status: 500 }
      )
    }

    // ── 5. Verify plan has API access ──
    // Step 3: apiAccess is true ONLY on enterprise (per lib/dodo/plans.ts).
    // Starter/Growth users get a clear 403 instead of a silent pass-through.
    if (!planLimits.apiAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'API access requires the Enterprise plan',
          code: 'PLAN_INSUFFICIENT',
          upgrade_url: '/pricing',
          duration_ms: Date.now() - startTime,
        },
        { status: 403 }
      )
    }

    // ── 6. Check scan limit (Step 4: ledger-driven) ──      const remaining = await getScansRemaining(apiKey.user_id)
      // Step 8: separate page-render hard cap. Enterprise page-render cap is
      // 2,500/mo. Reject top-up attempts instead of silently over-running
      // (the cap is metered in Phase 2 — Phase 1 logs `overage_pending` rows).
      const requestedRenders = max_pages > 1 ? max_pages : 1
      const rendersRemaining = await getPageRendersRemaining(apiKey.user_id)
      if (rendersRemaining < requestedRenders) {
        await logPageOveragePending(
          apiKey.user_id, null, requestedRenders, planLimits.pageRendersPerMonth,
        )
        return NextResponse.json(
          {
            error: 'Page render limit reached',
            code: 'PAGE_RENDER_LIMIT_REACHED',
            message: `Your plan allows ${planLimits.pageRendersPerMonth} page renders per month. This ${max_pages}-page scan would exceed the remaining quota.`,
            upgrade_url: '/pricing',
          },
          { status: 429 }
        )
      }
    if (remaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Scan limit reached for this month. You have used all ${planLimits.scansPerMonth} scans.`,
          code: 'SCAN_LIMIT_REACHED',
          duration_ms: Date.now() - startTime,
        },
        { status: 429 }
      )
    }

    // ── 7. Check pages-per-scan limit ──
    if (max_pages > planLimits.pagesPerScan) {
      return NextResponse.json(
        {
          success: false,
          error: `Your plan allows max ${planLimits.pagesPerScan} pages per scan`,
          code: 'PAGES_LIMIT_EXCEEDED',
          duration_ms: Date.now() - startTime,
        },
        { status: 400 }
      )
    }

    // ── 8. Create scan record ──
    const scanId = crypto.randomUUID()

    const { error: insertError } = await db.from('scans').insert({
      id: scanId,
      user_id: apiKey.user_id,
      url,
      status: 'running',
      pages_requested: max_pages,
      wcag_level: 'AA',
      wcag_version,
      started_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('[API] Scan insert failed:', insertError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create scan record',
          code: 'DB_ERROR',
          duration_ms: Date.now() - startTime,
        },
        { status: 500 }
      )
    }

    // Step 4: consume one credit on entry. Failure catch below refunds.
    try {
      await consumeCredit(apiKey.user_id, scanId, { via: 'api_v1' })
      // Step 8: parallel page-render consumption
      await consumePageRenders(apiKey.user_id, scanId, requestedRenders, { via: 'api_v1' })
    } catch (ledgerErr) {
      console.error('[API v1/scan] Credit-consume write failed:', ledgerErr)
    }

    // ── 9. Run the scan (single URL — see note above) ──
    try {
      const result = await runScan(url, wcag_version)
      const pagesScanned = 1

      // ── 10. Update scan record with results ──
      await db
        .from('scans')
        .update({
          status: 'completed',
          pages_scanned: pagesScanned,
          compliance_score: result.score,
          total_violations: result.totalViolations,
          critical_count: result.critical,
          serious_count: result.serious,
          moderate_count: result.moderate,
          minor_count: result.minor,
          big_six: result.bigSix as any,
          has_overlay_widget: result.hasOverlayWidget === true,
          error_message: null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', scanId)

      // Step 4: consume was done above, nothing more to do on success.

      // ── 12. Store violations ──
      if (result.violations.length > 0) {
        const violationsToInsert = result.violations.map((v: any) => ({
          scan_id: scanId,
          rule_id: v.id,
          rule_description: v.description?.slice(0, 500) || v.help?.slice(0, 500) || '',
          impact: v.impact,
          wcag_criterion: mapAxeTagsToCriterion(v.tags),
          wcag_level: 'AA',
          page_url: result.url,
          element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
          element_selector: v.nodes?.[0]?.target?.join(' ')?.slice(0, 500) || '',
          fix_summary: v.help?.slice(0, 500) || '',
          fix_detail: v.description?.slice(0, 2000) || '',
          help_url: v.helpUrl || '',
        }))

        await db.from('violations').insert(violationsToInsert)

        // Step 10: reconcile violation_status against the prior scan of
        // the same URL for the API key's owner. Best-effort — must not
        // block the response.
        try {
          await reconcileStatus(apiKey.user_id, scanId, url, result.violations.map((v: any) => ({
            rule_id: v.id,
            page_url: v.page_url || v.frame_source || url,
            element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
          })))
        } catch (statusErr) {
          console.warn('[API v1/scan] reconcileStatus failed:', statusErr)
        }
      }

      // ── 13. Update API key last_used_at ──
      await db
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKey.id)

      // Step 5: log usage (success path) so the Enterprise dashboard
      // shows recent calls per key.
      try {
        await db.from('api_key_usage').insert({
          api_key_id: apiKey.id,
          user_id: apiKey.user_id,
          target_url: url,
          passed,
          status_code: passed ? 200 : 400,
          response_time_ms: Date.now() - startTime,
          score: result.score,
        })
      } catch (usageErr) {
        console.error('[API v1/scan] Usage log write failed:', usageErr)
      }

      // ── 14. Prepare response ──
      const passed = result.score >= fail_threshold

      return NextResponse.json(
        {
          success: true,
          scan_id: scanId,
          url,
          score: result.score,
          passed,
          threshold: fail_threshold,
          violations: result.violations.map((v: any) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            description: v.description,
            target: v.target,
            nodes: (v.nodes || []).map((n: any) => ({
              html: n.html,
              target: n.target,
              failure_summary: n.failureSummary,
            })),
          })),
          summary: {
            critical: result.critical,
            serious: result.serious,
            moderate: result.moderate,
            minor: result.minor,
            total: result.totalViolations,
          },
          big_six: result.bigSix,
          has_overlay_widget: result.hasOverlayWidget,
          keyboard_issues: result.keyboardIssues || [],
          pages_scanned: pagesScanned,
          duration_ms: Date.now() - startTime,
        },
        { status: passed ? 200 : 400 } // 400 if below threshold for CI exit codes
      )
    } catch (scanError: any) {
      console.error('[API] Scan execution failed:', scanError)

      await db
        .from('scans')
        .update({
          status: 'failed',
          error_message: scanError?.message || 'Unknown scan error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', scanId)

      // Step 4: refund if it's on our side.
      let refund = { issued: false, capped: false, failure_reason: 'engine_failure' as const }
      try {
        refund = await refundCredit(apiKey.user_id, scanId, classifyFailure(scanError))
        // Step 8: parallel page-render refund
        const pageRefund = await refundPageRenders(apiKey.user_id, scanId, requestedRenders, classifyFailure(scanError))
      } catch (ledgerErr) {
        console.error('[API v1/scan] Credit-refund write failed:', ledgerErr)
      }

      // Step 5: log usage (failure path) so the dashboard pipeline
      // history shows real call volume even when scans error.
      try {
        await db.from('api_key_usage').insert({
          api_key_id: apiKey.id,
          user_id: apiKey.user_id,
          target_url: url,
          passed: null,
          status_code: 500,
          response_time_ms: Date.now() - startTime,
          score: null,
        })
      } catch (usageErr) {
        console.error('[API v1/scan] Usage log write failed:', usageErr)
      }

      return NextResponse.json(
        {
          success: false,
          error: scanError?.message || 'Scan failed',
          code: 'SCAN_FAILED',
          scan_id: scanId,
          refund_issued: refund.issued,
          refund_capped: refund.capped,
          failure_reason: refund.failure_reason,
          duration_ms: Date.now() - startTime,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[API] Request error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/scan?scan_id=...
 * Retrieve scan results by ID (requires Bearer token auth)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const apiKey = await validateApiKey(authHeader)

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    if (!hasPermission(apiKey, 'scan:read')) {
      return NextResponse.json(
        { success: false, error: 'API key lacks scan:read permission', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scan_id')

    if (!scanId) {
      return NextResponse.json(
        { success: false, error: 'Missing scan_id parameter', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const db = createServiceClient()
    const { data: scan, error } = await db
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .eq('user_id', apiKey.user_id)
      .single()

    if (error || !scan) {
      return NextResponse.json(
        { success: false, error: 'Scan not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, scan })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
