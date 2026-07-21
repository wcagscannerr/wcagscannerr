import { createServiceClient } from '@/lib/supabase/server'
import { runScan } from '@/lib/scanner/engine'
// Step 4: per-URL refund when an individual scan in a batch fails.
import { refundCredit } from '@/lib/scanner/credits'
import { classifyFailure } from '@/lib/scanner/failure'
// Step 8: per-URL page-render refund on per-URL failure.
import { refundPageRenders } from '@/lib/scanner/credits'
// Step 10: cross-scan violation-status carry-forward (per-URL).
import { reconcileStatus } from '@/lib/scanner/statusTracker'
// Step 6: populate wcag_criterion at insert (was hardcoded 'N/A').
import { mapAxeTagsToCriterion } from '@/lib/vpat/wcagMapping'

// Processes up to `limit` queued batch-scan URLs. Called from two places:
//  1. /api/cron/process-batch — a daily Vercel Cron safety net (Hobby plan
//     caps cron frequency at once/day, so this alone is too slow to be the
//     primary driver of a batch that's supposed to finish in minutes).
//  2. /api/scan/batch/tick — hit repeatedly by the browser while the user
//     has a /batch/[id] page open, which is what actually drives batches
//     forward in near-real-time on the free tier.
export async function processQueuedScans(limit: number) {
  const db = createServiceClient()
  const startedAt = Date.now()
  const TIME_BUDGET_MS = 50_000 // stay under the 60s function limit

  const { data: queued, error: queueError } = await db
    .from('scans')
    .select('id, batch_id, url, user_id, wcag_level, wcag_version')
    .eq('status', 'queued')
    .not('batch_id', 'is', null)
    .order('queue_position', { ascending: true })
    .limit(limit)

  if (queueError) return { processed: 0, error: queueError.message }
  if (!queued || queued.length === 0) return { processed: 0, results: [] }

  const results: Array<{ scanId: string; status: string; error?: string }> = []

  for (const item of queued) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      console.warn('[batchProcessor] Time budget exceeded — stopping early, remaining items stay queued')
      break
    }

    const { data: claimed } = await db
      .from('scans')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', item.id).eq('status', 'queued').select('id').single()
    if (!claimed) continue

    try {
      const result = await runScan(item.url, item.wcag_version || '2.1')

      // ── Insert violations FIRST. If we get killed by the platform
      // timeout right after this, the scan stays 'running' and gets
      // picked up again next tick — instead of lying about being done. ──
      if (result.violations.length > 0) {
        const { error: violationsError } = await db.from('violations').insert(
          result.violations.map((v: any, i: number) => ({
            scan_id: item.id,
            rule_id: v.id,
            rule_description: v.description?.slice(0, 500) || v.help?.slice(0, 500) || '',
            impact: v.impact,
            wcag_criterion: mapAxeTagsToCriterion(v.tags),
            wcag_level: item.wcag_level || 'AA',
            page_url: item.url,
            element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
            element_selector: v.nodes?.[0]?.target?.join(' ')?.slice(0, 500) || '',
            node_count: v.nodeCount || v.nodes?.length || 1,
            tags: v.tags || [],
            fix_summary: v.help?.slice(0, 500) || '',
            fix_detail: v.description?.slice(0, 2000) || '',
            help_url: v.helpUrl || '',
            sort_order: i,
          }))
        )
        if (violationsError) {
          console.error(`[batchProcessor] Failed to insert violations for ${item.url}:`, violationsError)
        }

        // Step 10: reconcile violation_status for this URL.
        if (item.user_id) {
          try {
            await reconcileStatus(item.user_id, item.id, item.url, result.violations.map((v: any) => ({
              rule_id: v.id,
              page_url: item.url,
              element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
            })))
          } catch (statusErr) {
            console.warn(`[batchProcessor] reconcileStatus failed for ${item.url}:`, statusErr)
          }
        }
      }

      await db.from('scans').update({
        status: 'completed',
        pages_scanned: 1,
        compliance_score: result.score,
        total_violations: result.totalViolations,
        critical_count: result.critical,
        serious_count: result.serious,
        moderate_count: result.moderate,
        minor_count: result.minor,
        big_six: result.bigSix as any,
        has_overlay_widget: result.hasOverlayWidget === true,
        keyboard_issues: result.keyboardIssues || [],
        error_message: null,
        completed_at: new Date().toISOString(),
      }).eq('id', item.id)

      if (item.user_id) {
        await db.from('reports').insert({
          scan_id: item.id,
          user_id: item.user_id,
          name: `Scan of ${item.url} - ${new Date().toLocaleDateString()}`,
          is_public: false,
        })
      }

      const { data: batch } = await db.from('batch_scans')
        .select('completed_urls, total_urls').eq('id', item.batch_id).single()
      if (batch) {
        const completed = (batch.completed_urls || 0) + 1
        await db.from('batch_scans').update({
          completed_urls: completed,
          status: completed >= batch.total_urls ? 'completed' : 'running',
          completed_at: completed >= batch.total_urls ? new Date().toISOString() : null,
        }).eq('id', item.batch_id)
      }

      results.push({ scanId: item.id, status: 'completed' })
    } catch (err: any) {
      console.error(`[batchProcessor] Scan failed for ${item.url}:`, err.message)
      await db.from('scans').update({
        status: 'failed',
        error_message: err?.message?.slice(0, 500) || 'Scan failed',
        completed_at: new Date().toISOString(),
      }).eq('id', item.id)

      // Step 4: refund this individual scan's credit if the failure is
      // on our side (enforces the 5/day target_unreachable cap).
      // Step 8: also refund one page-render credit so the user doesn't
      // lose a render for an engine-failed URL within a larger batch.
      if (item.user_id) {
        try {
          await refundCredit(item.user_id, item.id, classifyFailure(err))
          await refundPageRenders(item.user_id, item.id, 1, classifyFailure(err))
        } catch (ledgerErr) {
          console.error(`[batchProcessor] Credit-refund write failed for ${item.url}:`, ledgerErr)
        }
      }

      const { data: batch } = await db.from('batch_scans')
        .select('completed_urls, failed_urls, total_urls').eq('id', item.batch_id).single()
      if (batch) {
        const completed = (batch.completed_urls || 0) + 1
        const failed = (batch.failed_urls || 0) + 1
        const allDone = completed >= batch.total_urls
        await db.from('batch_scans').update({
          completed_urls: completed,
          failed_urls: failed,
          status: allDone ? (failed === batch.total_urls ? 'failed' : 'partial') : 'running',
          completed_at: allDone ? new Date().toISOString() : null,
        }).eq('id', item.batch_id)
      }
      results.push({ scanId: item.id, status: 'failed', error: err.message })
    }
  }
  return { processed: results.length, results }
}