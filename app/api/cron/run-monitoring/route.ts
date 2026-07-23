import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runScan } from '@/lib/scanner/engine'
// Step 6: populate wcag_criterion at insert (was hardcoded 'N/A').
import { mapAxeTagsToCriterion } from '@/lib/vpat/wcagMapping'
// Step 8: decrement the page-render cap for every monitored-site render so
// cron-driven scanning is bounded by the same tier's monthly allotment.
import { consumePageRenders, refundPageRenders } from '@/lib/scanner/credits'
import { classifyFailure } from '@/lib/scanner/failure'
// Step 10: cross-scan violation-status carry-forward for monitored sites.
import { reconcileStatus } from '@/lib/scanner/statusTracker'

// Runs on a schedule (see vercel.json). Scans every monitored site that's
// due for a check, based on its scan_frequency, then triggers regression
// alert generation for it.
//
// This replaces two previous, broken cron routes:
//  - one queried `check_interval_hours` / `last_checked_at`, columns that
//    don't exist on `monitored_sites` (the real columns are
//    `scan_frequency` / `last_scanned_at`) — every run threw immediately.
//  - the other used the correct columns and worked, but never called
//    /api/monitoring/check-alerts, so the regression-alert feature never
//    actually fired even though the scanning itself succeeded.
// Neither was ever wired into vercel.json's crons, so neither ran on a
// schedule at all until now.
//
// FIX: this route used to insert the `scans` row (with aggregate counts)
// and the `reports` row, but never inserted into `violations` at all —
// so every monitoring report showed correct totals/Big Six but an empty
// violations list. The insert block below mirrors what
// app/api/scan/route.ts and lib/scanner/batchProcessor.ts already do.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const results: Array<{ siteId: string; scanId: string | null; error?: string }> = []

  try {
    const { data: sites, error: sitesError } = await db
      .from('monitored_sites')
      .select('id, url, user_id, scan_frequency, last_scanned_at, profiles(email)')
      .eq('revoked_at', true) // NOTE: on this table, revoked_at is a boolean where TRUE means "monitoring active" — confusing name, but matches app/(dashboard)/monitoring/page.tsx's convention.

    if (sitesError) {
      console.error('[CRON:monitoring] Failed to fetch sites:', sitesError)
      return NextResponse.json({ error: sitesError.message }, { status: 500 })
    }

    if (!sites || sites.length === 0) {
      return NextResponse.json({ scanned: 0, results: [] })
    }

    const now = new Date()

    for (const site of sites) {
      const lastScanned = site.last_scanned_at ? new Date(site.last_scanned_at) : new Date(0)
      const hoursSince = (now.getTime() - lastScanned.getTime()) / (1000 * 60 * 60)
      const isDue = site.scan_frequency === 'daily'
        ? hoursSince >= 24
        : site.scan_frequency === 'weekly'
          ? hoursSince >= 168
          : hoursSince >= 720 // monthly

      if (!isDue) continue

      try {
        const scanResult = await runScan(site.url, '2.1')
        const scanId = crypto.randomUUID()

        // Step 8: charge 1 page-render for the cron-driven render.
        // Done BEFORE the scans-row insert so a scanner-side failure below
        // is symmetrically refunded in the catch branch.
        if (site.user_id) {
          try {
            await consumePageRenders(site.user_id, scanId, 1, { source: 'cron_monitoring' })
          } catch (ledgerErr) {
            console.warn('[CRON:monitoring] Page-render consume failed:', ledgerErr)
          }
        }

        const { error: scanError } = await db.from('scans').insert({
          id: scanId,
          user_id: site.user_id,
          url: site.url,
          status: 'completed',
          compliance_score: scanResult.score,
          total_violations: scanResult.totalViolations,
          critical_count: scanResult.critical,
          serious_count: scanResult.serious,
          moderate_count: scanResult.moderate,
          minor_count: scanResult.minor,
          wcag_level: 'AA',
          wcag_version: '2.1',
          has_overlay_widget: scanResult.hasOverlayWidget,
          big_six: scanResult.bigSix,
          keyboard_issues: scanResult.keyboardIssues || [],
          pages_scanned: 1,
          pages_requested: 1,
          completed_at: new Date().toISOString(),
        })

        if (scanError) throw scanError

        // ── Insert ALL violations to DB — this was missing entirely ──
        // before. Without this, the `scans` row has correct aggregate
        // counts (critical_count, serious_count, big_six, etc.) but the
        // `violations` table — which the report page actually queries
        // for the violation list — has zero rows for this scan_id.
        if (scanResult.violations.length > 0) {
          const violationsToInsert = scanResult.violations.map((v: any, i: number) => ({
            scan_id: scanId,
            rule_id: v.id,
            rule_description: v.description?.slice(0, 500) || v.help?.slice(0, 500) || '',
            impact: v.impact,
            wcag_criterion: mapAxeTagsToCriterion(v.tags),
            wcag_level: 'AA',
            page_url: v.page_url || v.frame_source || site.url,
            element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
            element_selector: v.nodes?.[0]?.target?.join(' ')?.slice(0, 500) || '',
            node_count: v.nodeCount || v.nodes?.length || 1,
            tags: v.tags || [],
            fix_summary: v.help?.slice(0, 500) || '',
            fix_detail: v.description?.slice(0, 2000) || '',
            help_url: v.helpUrl || '',
            sort_order: i,
          }))

          const { error: violationsError } = await db.from('violations').insert(violationsToInsert)
          if (violationsError) {
            console.error(`[CRON:monitoring] Failed to insert violations for ${site.url}:`, violationsError)
          }

          // Step 10: reconcile violation_status against the prior scan.
          if (site.user_id) {
            try {
              await reconcileStatus(site.user_id, scanId, site.url, scanResult.violations.map((v: any) => ({
                rule_id: v.id,
                page_url: v.page_url || v.frame_source || site.url,
                element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
              })))
            } catch (statusErr) {
              console.warn(`[CRON:monitoring] reconcileStatus failed for ${site.url}:`, statusErr)
            }
          }
        }

        const { data: report } = await db
          .from('reports')
          .insert({
            scan_id: scanId,
            user_id: site.user_id,
            name: `Scheduled scan of ${site.url} - ${new Date().toLocaleDateString()}`,
          })
          .select()
          .single()

        // Store both scan_id AND report_id so the monitoring page can link
        // directly to the report (reports page expects a report ID, not a scan ID)
        await db
          .from('monitored_sites')
          .update({
            last_scan_id: scanId,
            last_report_id: report?.id || null,
            last_scanned_at: new Date().toISOString(),
          })
          .eq('id', site.id)

        // Compare against the previous scan and create alerts (score drop,
        // new critical issues, fixed issues) — this is the piece that was
        // silently never running before.
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/monitoring/check-alerts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({ siteId: site.id, newScanId: scanId }),
          })
        } catch (alertErr) {
          console.error(`[CRON:monitoring] Alert check failed for ${site.url}:`, alertErr)
        }

        const profile = (site as any).profiles
        if (profile?.email && report) {
          try {
            const { Resend } = await import('resend')
            const resend = new Resend(process.env.RESEND_API_KEY!)
            const scoreColor = scanResult.score >= 75 ? '#22D3A0' : scanResult.score >= 50 ? '#F59E0B' : '#EF4444'

            await resend.emails.send({
              from: 'WCAG Scanner <reports@wcagscannerr.com>',
              to: profile.email,
              subject: `Scheduled Report: ${site.url} scored ${scanResult.score}/100`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: #F0F0FF; padding: 40px; border-radius: 12px;">
                  <h1 style="color: #6C47FF; margin-bottom: 4px;">Scheduled Scan Report</h1>
                  <p style="color: #8B8BA7;">${site.url}</p>
                  <div style="background: #111118; border: 1px solid #2A2A3A; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                    <div style="font-size: 56px; font-weight: 800; color: ${scoreColor};">${scanResult.score}/100</div>
                    <div style="color: #8B8BA7; margin-top: 8px;">Compliance Score</div>
                  </div>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://wcagscannerr.com'}/reports/${report.id}"
                    style="display: inline-block; background: #6C47FF; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    View Full Report →
                  </a>
                </div>
              `,
            })
          } catch (emailErr) {
            console.error(`[CRON:monitoring] Failed to send email for ${site.url}:`, emailErr)
          }
        }

        results.push({ siteId: site.id, scanId })
      } catch (err: any) {
        console.error(`[CRON:monitoring] Failed to scan ${site.url}:`, err.message)
        // Step 8: refund the page-render we consumed above so an engine-
        // side failure on a monitored site doesn't burn the user's quota.
        if (site.user_id) {
          try {
            await refundPageRenders(site.user_id, null, 1, classifyFailure(err))
          } catch (refundErr) {
            console.warn('[CRON:monitoring] Page-render refund failed:', refundErr)
          }
        }
        results.push({ siteId: site.id, scanId: null, error: err.message })
      }
    }

    return NextResponse.json({
      scanned: results.filter(r => r.scanId).length,
      failed: results.filter(r => r.error).length,
      results,
    })
  } catch (error: any) {
    console.error('[CRON:monitoring] Run failed:', error)
    return NextResponse.json({ error: error?.message || 'Cron execution failed' }, { status: 500 })
  }
}