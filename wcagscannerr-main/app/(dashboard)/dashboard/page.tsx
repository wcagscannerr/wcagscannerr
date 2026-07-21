import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ScanLine, TrendingUp, TrendingDown, Activity, Globe, AlertTriangle, ArrowUpRight, Clock } from 'lucide-react'
import { PLANS } from '@/lib/dodo/plans'
import { Metadata } from 'next'
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart'
// Step 4: scans-remaining comes from the credit ledger SUM.
// Step 8: also fetch page-renders remaining (compute-cost tail cap).
import { getScansRemaining, getPageRendersRemaining } from '@/lib/scanner/credits'

export const metadata: Metadata = {
  title: 'Dashboard | WCAG Scanner',
  description: 'Manage your WCAG accessibility scans, monitor websites, and view compliance reports from your WCAG Scanner dashboard.',
  openGraph: {
    title: 'Dashboard | WCAG Scanner',
    description: 'Manage your WCAG accessibility scans, monitor websites, and view compliance reports from your WCAG Scanner dashboard.',
    url: 'https://www.wcagscannerr.com/dashboard',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default async function DashboardPage() {
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

  // Fetch profile for plan info (scans_used_this_month dropped in Step 4;
  // remaining count comes from the ledger via getScansRemaining).
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const planName: string = profile?.subscription_status || 'free'
  // Step 8: parallel reads — both calls hit the same SUM query pattern,
  // so we run them simultaneously and avoid two serial DB roundtrips.
  const [scansRemaining, rendersRemaining] = await Promise.all([
    getScansRemaining(user.id),
    getPageRendersRemaining(user.id),
  ])

  // Total scans count
  const { count: totalScans } = await supabase
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Recent completed scans
  const { data: recentScans } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch recent scan history for the trend chart.
  // We intentionally avoid a hard limit here so newly completed scans are
  // included instead of being cut off by the older first-20-row slice.
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: scanHistory } = await supabase
    .from('scans')
    .select('completed_at, compliance_score, total_violations, critical_count, serious_count')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('completed_at', ninetyDaysAgo.toISOString())
    .order('completed_at', { ascending: true })

  const chartData = (scanHistory || []).map((s) => ({
    date: s.completed_at,
    score: s.compliance_score || 0,
    total: s.total_violations || 0,
    critical: s.critical_count || 0,
    serious: s.serious_count || 0,
  }))

  // Average score
  const avgScore = recentScans && recentScans.length > 0
    ? Math.round(
        recentScans.reduce((sum, s) => sum + (s.compliance_score || 0), 0)
        / recentScans.length
      )
    : null

  // Monitored sites count
  const { count: monitoredCount } = await supabase
    .from('monitored_sites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Fetch reports for linking
  const { data: reports } = await supabase
    .from('reports')
    .select('id, scan_id')
    .eq('user_id', user.id)

  const reportByScanId = new Map<string, string>()
  if (reports) {
    reports.forEach((r: any) => {
      if (r.scan_id) reportByScanId.set(r.scan_id, r.id)
    })
  }

  // Limit info from PLANS
  const planLimits = PLANS[planName as keyof typeof PLANS]?.limits || PLANS.free.limits

  const scoreColor = (score: number) => {
    if (score >= 90) return '#22D3A0'
    if (score >= 75) return '#22c55e'
    if (score >= 50) return '#F59E0B'
    return '#EF4444'
  }

  const scoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Good'
    if (score >= 50) return 'Fair'
    return 'Poor'
  }

  // Calculate trend (compare last scan to average)
  const lastScan = recentScans?.[0]
  const trend = lastScan && avgScore ? lastScan.compliance_score! - avgScore : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </p>
        </div>
        <Link
          href="/scanner"
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl btn-magnetic shadow-lg shadow-primary/20"
        >
          <ScanLine className="w-4 h-4" />
          New Scan
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {/* Stats Grid - Premium Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans */}
        <div className="glass-panel rounded-2xl p-5 glow-border card-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            {trend !== 0 && (
              <span className={`badge-glow ${trend > 0 ? 'badge-glow-success' : 'badge-glow-danger'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Total Scans</p>
          <p className="text-3xl font-bold text-foreground mt-1">{totalScans ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {Math.max(0, scansRemaining)} scans · {Math.max(0, rendersRemaining)} page renders remaining
          </p>
        </div>

        {/* Average Score */}
        <div className="glass-panel rounded-2xl p-5 glow-border card-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            {avgScore !== null && (
              <span className="badge-glow badge-glow-success">
                {avgScore >= 75 ? 'Healthy' : 'Needs Work'}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Avg Score</p>
          <p className="text-3xl font-bold mt-1" style={{ color: avgScore != null ? scoreColor(avgScore) : '#8B8BA7' }}>
            {avgScore != null ? avgScore : '-'}
            <span className="text-lg text-muted-foreground font-normal">/100</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {avgScore != null ? scoreLabel(avgScore) : 'No scans yet'}
          </p>
        </div>

        {/* Sites Monitored */}
        <div className="glass-panel rounded-2xl p-5 glow-border card-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <span className="badge-glow badge-glow-info">
              {monitoredCount ?? 0}/{planLimits.monitoredSites}
            </span>
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Sites Monitored</p>
          <p className="text-3xl font-bold text-foreground mt-1">{monitoredCount ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-2">
            of {planLimits.monitoredSites} max on {planName} plan
          </p>
        </div>

        {/* Plan Status */}
        <div className="glass-panel rounded-2xl p-5 glow-border card-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className={`badge-glow ${planName === 'free' ? 'badge-glow-warning' : 'badge-glow-success'}`}>
              {planName}
            </span>
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Plan</p>
          <p className="text-3xl font-bold text-foreground mt-1 capitalize">{planName}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {planLimits.scansPerMonth} scans/mo · {planLimits.pageRendersPerMonth} page renders/mo · {planLimits.pagesPerScan} pages/scan
          </p>
        </div>
      </div>

      {/* Score Trend Chart */}
      {chartData.length > 1 && (
        <div className="glass-panel rounded-2xl p-6 glow-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Score Trend</h2>
              <p className="text-sm text-muted-foreground">Compliance score over time</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Score</span>
            </div>
          </div>
          <ScoreTrendChart history={chartData} />
        </div>
      )}

      {/* Recent Scans - Premium List */}
      <div className="glass-panel rounded-2xl overflow-hidden glow-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Recent Scans</h2>
            <p className="text-sm text-muted-foreground">Your latest accessibility checks</p>
          </div>
          <Link href="/reports" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center gap-1">
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentScans && recentScans.length > 0 ? (
            recentScans.map((scan) => {
              const color = scoreColor(scan.compliance_score || 0)
              const reportId = reportByScanId.get(scan.id)
              const href = reportId ? `/reports/${reportId}` : '#'
              return (
                <Link
                  key={scan.id}
                  href={href}
                  className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold border-2"
                      style={{ 
                        backgroundColor: `${color}10`, 
                        color,
                        borderColor: `${color}30`
                      }}
                    >
                      {scan.compliance_score || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground truncate max-w-[300px] group-hover:text-primary transition-colors">{scan.url}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(scan.created_at).toLocaleDateString()} · {scan.total_violations} issues
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge-glow" style={{ 
                      backgroundColor: `${color}10`, 
                      color, 
                      borderColor: `${color}30`,
                      border: '1px solid'
                    }}>
                      {scoreLabel(scan.compliance_score || 0)}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )
            })
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-4">
                <ScanLine className="w-8 h-8 text-primary/40" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No scans yet</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Run your first WCAG compliance scan to see results here.
              </p>
              <Link
                href="/scanner"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium btn-magnetic"
              >
                <ScanLine className="w-4 h-4" />
                Start Your First Scan
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}