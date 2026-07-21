import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { Layers, Loader2 } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Batch Reports | WCAG Scanner',
  description: 'Review your batch scan results with per-page breakdowns and compliance scores.',
}

function scoreColorFor(score: number) {
  return score >= 90 ? '#22D3A0'
    : score >= 75 ? '#22c55e'
    : score >= 50 ? '#F59E0B'
    : '#EF4444'
}

function scoreLabelFor(score: number) {
  return score >= 90 ? 'Excellent'
    : score >= 75 ? 'Good'
    : score >= 50 ? 'Fair'
    : 'Poor'
}

export default async function BatchReportsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceDb = createServiceClient()

  // Fetch all completed/partial batch scans for this user
  const { data: batches, error: batchesError } = await serviceDb
    .from('batch_scans')
    .select('id, name, status, total_urls, completed_urls, failed_urls, created_at, completed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (batchesError) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Batch Reports</h1>
        <p className="text-red-400">Error loading batch reports: {batchesError.message}</p>
      </div>
    )
  }

  // Fetch all individual scans that belong to any of these batches,
  // plus their report IDs so we can deep-link to the report detail page.
  const batchIds = (batches || []).map(b => b.id)
  let batchScans: any[] = []
  if (batchIds.length > 0) {
    const { data: scans } = await serviceDb
      .from('scans')
      .select('id, url, compliance_score, total_violations, critical_count, serious_count, status, created_at, batch_id, reports(id)')
      .in('batch_id', batchIds)
      .order('created_at', { ascending: false })
    batchScans = scans || []
  }

  // Group scans by batch
  const scansByBatch: Record<string, any[]> = {}
  for (const scan of batchScans) {
    if (!scan.batch_id) continue
    if (!scansByBatch[scan.batch_id]) scansByBatch[scan.batch_id] = []
    scansByBatch[scan.batch_id].push(scan)
  }

  if (!batches || batches.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Batch Reports</h1>
        <p className="text-text-secondary">No batch scans yet. Create one to get started.</p>
        <Link href="/batch"
          className="mt-4 inline-block bg-neutral-700 text-text-primary px-4 py-2 rounded-lg">
          Create Batch Scan
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Batch Reports</h1>
      <p className="text-text-secondary mb-6">
        Your batch scan results with per-page breakdowns.
      </p>

      <div className="space-y-8">
        {batches.map((batch) => {
          const scans = scansByBatch[batch.id] || []
          const inProgress = batch.status === 'queued' || batch.status === 'running'
          const completedScans = scans.filter(s => s.status === 'completed')
          const avgScore = completedScans.length > 0
            ? Math.round(completedScans.reduce((sum, s) => sum + (s.compliance_score || 0), 0) / completedScans.length)
            : 0
          const totalViolations = completedScans.reduce((sum, s) => sum + (s.total_violations || 0), 0)

          return (
            <div key={batch.id} className="space-y-3">
              {/* Batch header */}
              <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-neutral-500/10 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4 text-neutral-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-text-primary font-medium truncate">
                      {batch.name || `Batch scan — ${batch.total_urls} URLs`}
                    </p>
                    <p className="text-text-secondary text-sm mt-1">
                      {batch.completed_urls}/{batch.total_urls} scanned
                      {batch.failed_urls > 0 && ` · ${batch.failed_urls} failed`}
                      {' · '}
                      {new Date(batch.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4 shrink-0">
                  {inProgress ? (
                    <div className="flex items-center gap-2 text-text-secondary text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      In progress
                    </div>
                  ) : completedScans.length > 0 ? (
                    <>
                      <div className="text-right">
                        <p className="text-sm text-text-secondary">Violations</p>
                        <p className="text-text-primary font-medium">{totalViolations}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-text-secondary">Avg Score</p>
                        <p className="font-bold text-xl" style={{ color: scoreColorFor(avgScore) }}>
                          {avgScore}/100
                        </p>
                      </div>
                      <div className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: scoreColorFor(avgScore) + '20', color: scoreColorFor(avgScore) }}>
                        {scoreLabelFor(avgScore)}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400">
                      {batch.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Individual scan results within this batch */}
              {scans.length > 0 && (
                <div className="ml-4 space-y-2 border-l border-border pl-4">
              {scans.map((scan) => {
                const score = scan.compliance_score ?? 0
                const scoreColor = scoreColorFor(score)
                // Each batch child-scan has a report row (created in
                // batchProcessor). Use that report id for the deep link.
                const reportId = scan.reports?.[0]?.id
                if (!reportId) return null
                return (
                  <Link key={scan.id} href={`/reports/${reportId}`}>
                        <div className="bg-surface border border-border rounded-lg p-4
                          hover:border-neutral-500 transition-all cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-text-primary font-medium truncate text-sm">
                                {scan.url}
                              </p>
                              <p className="text-text-secondary text-xs mt-1">
                                {new Date(scan.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 ml-4 shrink-0">
                              <div className="text-right">
                                <p className="text-xs text-text-secondary">Violations</p>
                                <p className="text-text-primary font-medium text-sm">{scan.total_violations ?? 0}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-text-secondary">Score</p>
                                <p className="font-bold text-lg" style={{ color: scoreColor }}>{score}/100</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}