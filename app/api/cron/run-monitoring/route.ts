import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Runs on a schedule (see vercel.json). For each monitored site that's due
// for a check, triggers a GitHub Actions workflow that scans up to 25 pages
// of that site using Puppeteer + axe-core, then emails the results.
//
// WHY GitHub Actions instead of runScan():
// - runScan() only scans 1 page — monitoring should scan the entire website
// - GH Actions has more RAM (7GB) and no 5-min Vercel timeout
// - Can discover + scan 25 pages in a single workflow run
//
// The workflow (`monitoring-scan.yml`) calls back to /api/cron/monitoring-callback
// for email notification after the scan completes.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const results: Array<{ siteId: string; status: string; error?: string }> = []

  try {
    const { data: sites, error: sitesError } = await db
      .from('monitored_sites')
      .select('id, url, user_id, scan_frequency, last_scanned_at')
      .eq('revoked_at', true)

    if (sitesError) {
      console.error('[CRON:monitoring] Failed to fetch sites:', sitesError)
      return NextResponse.json({ error: sitesError.message }, { status: 500 })
    }

    if (!sites || sites.length === 0) {
      console.log('[CRON:monitoring] No monitored sites found')
      return NextResponse.json({ scanned: 0, results: [] })
    }

    const now = new Date()
    let triggeredCount = 0
    let skipCount = 0

    for (const site of sites) {
      const lastScanned = site.last_scanned_at ? new Date(site.last_scanned_at) : new Date(0)
      const hoursSince = (now.getTime() - lastScanned.getTime()) / (1000 * 60 * 60)
      const isDue = site.scan_frequency === 'daily'
        ? hoursSince >= 24
        : site.scan_frequency === 'weekly'
          ? hoursSince >= 168
          : hoursSince >= 720

      if (!isDue) {
        skipCount++
        continue
      }

      try {
        // Trigger GitHub Actions workflow for this site
        const githubToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
        const repoOwner = process.env.GITHUB_REPO_OWNER
        const repoName = process.env.GITHUB_REPO_NAME

        if (!repoOwner || !repoName) {
          console.error(`[CRON:monitoring] GITHUB_REPO_OWNER or GITHUB_REPO_NAME not configured`)
          results.push({ siteId: site.id, status: 'failed', error: 'GitHub config missing' })
          continue
        }

        if (!githubToken) {
          console.error(`[CRON:monitoring] GITHUB_PAT not configured`)
          results.push({ siteId: site.id, status: 'failed', error: 'GITHUB_PAT missing' })
          continue
        }

        const workflowResponse = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/monitoring-scan.yml/dispatches`,
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
                site_id: site.id,
                user_id: site.user_id,
                base_url: site.url,
                max_pages: '25',
              },
            }),
          }
        )

        if (!workflowResponse.ok) {
          const errorText = await workflowResponse.text()
          console.error(`[CRON:monitoring] Failed to trigger workflow for ${site.url}:`, workflowResponse.status, errorText)
          results.push({ siteId: site.id, status: 'failed', error: `GitHub trigger failed: ${workflowResponse.status}` })
          continue
        }

        console.log(`[CRON:monitoring] Triggered monitoring scan for ${site.url} (${site.id})`)
        triggeredCount++
        results.push({ siteId: site.id, status: 'triggered' })
      } catch (err: any) {
        console.error(`[CRON:monitoring] Failed to trigger scan for ${site.url}:`, err.message)
        results.push({ siteId: site.id, status: 'failed', error: err.message })
      }
    }

    return NextResponse.json({
      scanned: triggeredCount,
      skipped: skipCount,
      failed: results.filter(r => r.status === 'failed').length,
      total_sites: sites.length,
      results,
    })
  } catch (error: any) {
    console.error('[CRON:monitoring] Run failed:', error)
    return NextResponse.json({ error: error?.message || 'Cron execution failed' }, { status: 500 })
  }
}
