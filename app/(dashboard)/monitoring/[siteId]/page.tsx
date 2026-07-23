import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowLeft, Globe, Clock, Activity, CheckCircle, Calendar, BarChart3, FileText, Layers } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Site Dashboard | WCAG Scanner',
  description: 'View scan history, compliance trends, and reports for a monitored site.',
}

function scoreColor(score: number) {
  if (score >= 90) return '#22D3A0'
  if (score >= 75) return '#22c55e'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function scoreLabel(score: number) {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

function formatRelative(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default async function SiteDashboardPage({
  params,
}: {
  params: { siteId: string }
}) {
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

  // Fetch the monitored site
  const { data: site, error: siteError } = await supabase
    .from('monitored_sites')
    .select('*')
    .eq('id', params.siteId)
    .eq('user_id', user.id)
    .single()

  if (siteError || !site) notFound()

  // Fetch all completed scans for this site's URL (for history)
  const { data: allScans } = await supabase
    .from('scans')
    .select('id, compliance_score, total_violations, critical_count, serious_count, moderate_count, minor_count, completed_at, pages_scanned')
    .eq('url', site.url)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)

  const scans = allScans || []
  const latestScan = scans[0] || null

  // Fetch violations for the latest scan
  let latestViolations: any[] = []
  if (latestScan) {
    const { data: violations } = await supabase
      .from('violations')
      .select('rule_id, impact, rule_description, wcag_criterion, page_url')
      .eq('scan_id', latestScan.id)
      .order('impact', { ascending: false })
      .limit(20)
    latestViolations = violations || []
  }

  // Build trend data (last 7 data points)
  const trend = scans.slice(0, 7).reverse().map(s => ({
    date: s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    score: s.compliance_score || 0,
    violations: s.total_violations || 0,
  }))

  const avgScore = scans.length > 0
    ? Math.round(scans.reduce((sum, s) => sum + (s.compliance_score || 0), 0) / scans.length)
    : 0

  // Latest scan's report
  const { data: latestReport } = latestScan ? await supabase
    .from('reports')
    .select('id')
    .eq('scan_id', latestScan.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() : { data: null }

  // ── Fetch per-page breakdown from latest batch ──
  let batchPages: any[] = []
  let batchName: string | null = null
  let batchTotalUrls = 0
  let batchCompletedUrls = 0
  let batchAvgScore = 0
  let batchTotalViolations = 0
  let batchTotalCritical = 0

  if (site.last_batch_id) {
    const { data: batchRecord } = await supabase
      .from('batch_scans')
      .select('id, name, total_urls, completed_urls, failed_urls')
      .eq('id', site.last_batch_id)
      .single()

    if (batchRecord) {
      batchName = batchRecord.name
      batchTotalUrls = batchRecord.total_urls
      batchCompletedUrls = batchRecord.completed_urls

      const { data: batchScans } = await supabase
        .from('scans')
        .select('id, url, compliance_score, total_violations, critical_count, serious_count, moderate_count, minor_count, status, completed_at, reports(id)')
        .eq('batch_id', site.last_batch_id)
        .order('queue_position', { ascending: true })

      const completed = (batchScans || []).filter((s: any) => s.status === 'completed')
      batchPages = (batchScans || []).map((s: any) => ({
        ...s,
        reportId: s.reports?.[0]?.id || null,
      }))

      if (completed.length > 0) {
        batchAvgScore = Math.round(completed.reduce((sum: number, s: any) => sum + (s.compliance_score || 0), 0) / completed.length)
        batchTotalViolations = completed.reduce((sum: number, s: any) => sum + (s.total_violations || 0), 0)
        batchTotalCritical = completed.reduce((sum: number, s: any) => sum + (s.critical_count || 0), 0)
      }
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/monitoring"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Monitoring
      </Link>

      {/* ═══ Site Header ═══ */}
      <div className="glass-panel rounded-2xl p-6 glow-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-foreground">
                  {site.label || site.url.replace(/https?:\/\//, '').split('/')[0]}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                  site.revoked_at
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  <span className={`relative flex h-1.5 w-1.5 ${site.revoked_at ? '' : 'hidden'}`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  {site.revoked_at ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground break-all">{site.url}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {site.scan_frequency} scans
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last scan: {formatRelative(site.last_scanned_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Added {formatRelative(site.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Latest score ring */}
          {latestScan && (
            <div className="text-center shrink-0">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={scoreColor(latestScan.compliance_score || 0)}
                    strokeWidth="3"
                    strokeDasharray={`${latestScan.compliance_score || 0}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xl font-bold" style={{ color: scoreColor(latestScan.compliance_score || 0) }}>
                    {latestScan.compliance_score || '—'}
                  </span>
                  <span className="text-[9px] text-muted-foreground">/100</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{scoreLabel(latestScan.compliance_score || 0)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Stats Grid ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Avg Score</p>
          <p className="text-2xl font-bold mt-1" style={{ color: scoreColor(avgScore) }}>
            {avgScore || '—'}/100
          </p>
          <p className="text-xs text-muted-foreground mt-1">{scans.length} scan{scans.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Issues</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {latestScan?.total_violations ?? '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {latestScan?.pages_scanned 
              ? `Across ${latestScan.pages_scanned} page${latestScan.pages_scanned !== 1 ? 's' : ''}`
              : 'Latest scan'}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Critical</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#EF4444' }}>
            {latestScan?.critical_count ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {latestScan?.serious_count ? `${latestScan.serious_count} serious` : '0 serious'}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Scans Run</p>
          <p className="text-2xl font-bold text-foreground mt-1">{scans.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {scans.filter(s => s.compliance_score >= 75).length} passed
          </p>
        </div>
      </div>

      {/* ═══ Per-Page Breakdown (replaces old Scan History) ═══ */}
      {batchPages.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden glow-border">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Per-Page Breakdown
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {batchCompletedUrls}/{batchTotalUrls} pages · Avg {batchAvgScore}/100 · {batchTotalViolations} total violations
                </p>
              </div>
              <Link
                href={`/batch/${site.last_batch_id}`}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Full Details →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {batchPages.map((page: any) => {
              const score = page.compliance_score ?? 0
              const sColor = scoreColor(score)
              return (
                <Link
                  key={page.id}
                  href={page.reportId ? `/reports/${page.reportId}` : `/batch/${site.last_batch_id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-secondary/10 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-foreground truncate">{page.url}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {page.total_violations ?? 0} violations · {page.critical_count ?? 0} critical
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: sColor }}>
                        {score}/100
                      </p>
                    </div>
                    {page.status === 'completed' ? (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: score >= 75 ? '#22D3A0' : score >= 50 ? '#F59E0B' : '#EF4444' }} />
                    ) : page.status === 'failed' ? (
                      <span className="text-[10px] text-red-400">Failed</span>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Score trend */}
        <div className="glass-panel rounded-2xl p-5 glow-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Score Trend</h3>
          {trend.length > 1 ? (
            <div className="space-y-2">
              {trend.map((point, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">{point.date}</span>
                  <div className="flex-1 h-5 bg-secondary/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${point.score}%`,
                        backgroundColor: scoreColor(point.score),
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color: scoreColor(point.score) }}>
                    {point.score}
                  </span>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">
                    {point.violations}v
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Not enough scan history</p>
              <p className="text-xs text-muted-foreground/70 mt-1">More scans needed for a trend.</p>
            </div>
          )}
        </div>

        {/* Latest violations */}
        <div className="glass-panel rounded-2xl p-5 glow-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Latest Violations
            {latestViolations.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal ml-2">
                ({latestViolations.length})
              </span>
            )}
          </h3>
          {latestViolations.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {latestViolations.slice(0, 10).map((v, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/20 border border-border/50">
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                    v.impact === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    v.impact === 'serious' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                    v.impact === 'moderate' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {v.impact}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate">{v.rule_description || v.rule_id}</p>
                    {v.wcag_criterion && (
                      <p className="text-[10px] text-muted-foreground">WCAG {v.wcag_criterion}</p>
                    )}
                    {v.page_url && v.page_url !== site.url && (
                      <p className="text-[9px] text-muted-foreground truncate mt-0.5 font-mono">{v.page_url}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm text-muted-foreground">No violations in latest scan</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Batch History (replaces old Scan History) ═══ */}
      {!site.last_batch_id && scans.length === 0 && (
        <div className="glass-panel rounded-2xl p-8 glow-border text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No scans yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Waiting for the next scheduled scan.</p>
        </div>
      )}

      {/* ═══ Actions ═══ */}
      <div className="glass-panel rounded-2xl p-5 glow-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {site.last_batch_id && (
            <Link
              href={`/batch/${site.last_batch_id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity btn-magnetic shadow-lg shadow-primary/20"
            >
              <Layers className="w-4 h-4" />
              Per-Page Breakdown
            </Link>
          )}
          {latestReport && (
            <Link
              href={`/reports/${latestReport.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-foreground hover:bg-secondary/30 transition-all"
            >
              <FileText className="w-4 h-4" />
              View Latest Report
            </Link>
          )}
          <Link
            href="/monitoring"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-foreground hover:bg-secondary/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            All Sites
          </Link>
        </div>
      </div>
    </div>
  )
}
