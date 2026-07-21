import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// One-time endpoint to backfill last_report_id for existing monitored sites.
// Run once after deploying the migration that adds last_report_id to monitored_sites.
//
// Usage:
//   curl -X POST "https://www.wcagscannerr.com/api/cron/backfill-monitoring-reports" \
//     -H "Authorization: Bearer $CRON_SECRET"
//
// Or trigger via GitHub Actions workflow_dispatch.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()

  try {
    // Find all monitored sites that have a last_scan_id but no last_report_id
    const { data: sites, error: sitesError } = await db
      .from('monitored_sites')
      .select('id, url, user_id, last_scan_id')
      .not('last_scan_id', 'is', null)
      .is('last_report_id', null)

    if (sitesError) {
      console.error('[BACKFILL] Failed to fetch sites:', sitesError)
      return NextResponse.json({ error: sitesError.message }, { status: 500 })
    }

    if (!sites || sites.length === 0) {
      return NextResponse.json({ message: 'No sites need backfilling', updated: 0 })
    }

    let updated = 0
    let failed = 0

    for (const site of sites) {
      try {
        // Find the report associated with this scan
        const { data: report, error: reportError } = await db
          .from('reports')
          .select('id')
          .eq('scan_id', site.last_scan_id)
          .eq('user_id', site.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (reportError || !report) {
          console.warn(`[BACKFILL] No report found for site ${site.id} (scan: ${site.last_scan_id}):`, reportError?.message)
          failed++
          continue
        }

        const { error: updateError } = await db
          .from('monitored_sites')
          .update({ last_report_id: report.id })
          .eq('id', site.id)

        if (updateError) {
          console.error(`[BACKFILL] Failed to update site ${site.id}:`, updateError)
          failed++
          continue
        }

        updated++
      } catch (err: any) {
        console.error(`[BACKFILL] Error processing site ${site.id}:`, err.message)
        failed++
      }
    }

    return NextResponse.json({
      message: 'Backfill complete',
      total: sites.length,
      updated,
      failed,
    })
  } catch (error: any) {
    console.error('[BACKFILL] Run failed:', error)
    return NextResponse.json({ error: error?.message || 'Backfill failed' }, { status: 500 })
  }
}
