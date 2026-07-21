import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AIFixButton from '@/components/reports/AIFixButton'
import { calculateLawsuitRisk } from '@/lib/scanner/riskScore'
import ComplianceAssistant from '@/components/chat/ComplianceAssistant'
import { Metadata } from 'next'
import { KeyboardIssuesSection } from '@/components/reports/KeyboardIssuesSection'
import { ViewportBreakdownSection } from '@/components/reports/ViewportBreakdownSection'
import { ReportVisualSection } from '@/components/reports/ReportVisualSection'
import { ShareReportButton } from '@/components/reports/ShareReportButton'

export const metadata: Metadata = {
  title: 'Scan Report | WCAG Scanner',
  description: 'View a detailed WCAG accessibility scan report with compliance score, violations by severity, and step-by-step fix guidance.',
  openGraph: {
    title: 'Scan Report | WCAG Scanner',
    description: 'View a detailed WCAG accessibility scan report with compliance score, violations by severity, and step-by-step fix guidance.',
    url: 'https://www.wcagscannerr.com/reports',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default async function ReportDetailPage({
  params
}: {
  params: { id: string }
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

  // Fetch plan for gated features
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const { data: report, error } = await supabase
    .from('reports')
    .select('*, scans(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !report) notFound()

  const scan = report.scans as any
  // Step 2: any paid tier (starter/growth/enterprise) unlocks the
  // Pro-tier screenshot + viewport breakdown + keyboard-issue UI.
  const planId = profile?.subscription_status || 'free'
  const isProOrAgency =
    planId === 'starter' || planId === 'growth' || planId === 'enterprise'

  const { data: violations } = await supabase
    .from('violations')
    .select('*')
    .eq('scan_id', report.scan_id)
    .order('impact', { ascending: false })

  // Same rows, but in original scan order — needed to correctly match
  // screenshot markers below (marker.index refers to this order, not the
  // impact-sorted order used for display).
  const violationsInScanOrder = [...(violations || [])].sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )

  const score = scan?.compliance_score ?? 0
  const scoreColor = score >= 90 ? '#22D3A0'
    : score >= 75 ? '#22c55e'
    : score >= 50 ? '#F59E0B'
    : '#EF4444'

  // Calculate lawsuit risk
  const risk = calculateLawsuitRisk({
    compliance_score: score,
    critical_count: scan?.critical_count ?? 0,
    serious_count: scan?.serious_count ?? 0,
    big_six: scan?.big_six || {},
    has_overlay_widget: scan?.has_overlay_widget ?? false,
  })

  const impactColors: Record<string, string> = {
    critical: '#FF3B3B',
    serious: '#FF7A00',
    moderate: '#FFB800',
    minor: '#64B5F6'
  }

  // Multi-URL results now live under /batch/[id] (see components/scanner
  // batch UI) instead of on individual scan reports — a single scan is
  // always exactly one URL now.
  const batchId = scan?.batch_id || null

  // ── Screenshot Violations Mapping (scan-order aligned with markers) ──
  const screenshotViolations = violationsInScanOrder.map((v: any, index: number) => ({
    id: v.rule_id || v.id || `v-${index}`,
    impact: v.impact || 'minor',
    description: v.rule_description || v.description || '',
    help: v.fix_summary || v.help || '',
    target: v.element_selector ? [v.element_selector] : [],
  }))

  return (
    <>
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/reports"
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm 
          mb-6 inline-flex items-center gap-2">
        ← Back to Reports
      </Link>

      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--text-primary)] break-all">
              {scan?.url}
            </h1>
            {scan?.wcag_version === '2.2' && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-neutral-500/20 text-neutral-400 border border-neutral-500/30 flex-shrink-0">
                WCAG 2.2
              </span>
            )}
          </div>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            {new Date(report.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <a href={`/api/reports/${params.id}/pdf`}
            className="bg-neutral-700 hover:bg-neutral-800 text-white 
              px-4 py-2 rounded-lg text-sm transition-colors">
            Download PDF
          </a>
          <a href={`/api/reports/${params.id}/csv`}
            className="bg-[var(--surface-elevated)] hover:bg-[var(--border)] border 
              border-[var(--border)] text-[var(--text-primary)] px-4 py-2 rounded-lg 
              text-sm transition-colors">
            Export CSV
          </a>
          <a href={`/api/reports/${params.id}/statement`}
            className="bg-[var(--surface-elevated)] hover:bg-[var(--border)] border 
              border-[var(--border)] text-[var(--text-primary)] px-4 py-2 rounded-lg 
              text-sm transition-colors">
            Generate Statement
          </a>
          <ShareReportButton scanId={report.scan_id} />
        </div>
      </div>

      {/* Lawsuit Risk Assessment */}
      <div
        className="rounded-xl p-5 mb-6 border"
        style={{
          backgroundColor: risk.color + '15',
          borderColor: risk.color + '40',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              Lawsuit Risk Assessment
            </p>
            <p className="text-2xl font-bold" style={{ color: risk.color }}>
              {risk.label}
            </p>
          </div>
          <div
            className="text-3xl font-bold w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: risk.color + '20', color: risk.color }}
          >
            {risk.score}
          </div>
        </div>
        <ul className="mt-4 space-y-1">
          {risk.factors.map((f, i) => (
            <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2">
              <span style={{ color: risk.color }}>•</span> {f}
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Based on documented 2025 ADA lawsuit data. Not a legal prediction — consult an attorney for case-specific advice.
        </p>
      </div>

      {/*
        FIX: this grid used to only render 4 cards (Score, Total Issues,
        Critical, Serious). scan.moderate_count and scan.minor_count were
        already being written to the DB on every scan path — they just
        were never rendered anywhere. Added Moderate + Minor cards below
        and widened the grid to fit all six.
      */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Score</p>
          <p className="text-3xl font-bold mt-1" style={{ color: scoreColor }}>
            {score}/100
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Total Issues</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {scan?.total_violations ?? 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Critical</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#FF3B3B' }}>
            {scan?.critical_count ?? 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Serious</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#FF7A00' }}>
            {scan?.serious_count ?? 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Moderate</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#FFB800' }}>
            {scan?.moderate_count ?? 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 glow-border">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Minor</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#64B5F6' }}>
            {scan?.minor_count ?? 0}
          </p>
        </div>
      </div>

      {/* Annotated Screenshot (Pro/Agency only) */}
      {isProOrAgency && scan?.screenshot_url && (
        <ReportVisualSection
          screenshot={scan.screenshot_url}
          violations={screenshotViolations}
          markers={scan.screenshot_markers || []}
          screenshotWidth={scan.screenshot_width || 0}
          screenshotHeight={scan.screenshot_height || 0}
        />
      )}

      {/* Show placeholder if Pro/Agency but no screenshot yet */}
      {isProOrAgency && !scan?.screenshot_url && (
        <div className="mb-8 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Visual report with violation overlays will appear here for new scans.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Re-scan this URL to generate the annotated screenshot.
          </p>
        </div>
      )}

      {/* Responsive Breakdown (Pro/Agency only) */}
      {isProOrAgency && scan?.viewport_breakdown && scan.viewport_breakdown.length > 1 && (
        <ViewportBreakdownSection breakdown={scan.viewport_breakdown} className="mb-8" />
      )}

      {/* Keyboard Issues (Pro/Agency only) */}
      {isProOrAgency && scan?.keyboard_issues && scan.keyboard_issues.length > 0 && (
        <KeyboardIssuesSection 
          issues={scan.keyboard_issues} 
          className="mb-8" 
        />
      )}

      {/* This scan is one URL from a larger batch — link to the full breakdown */}
      {batchId && (
        <div className="mb-8 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            This scan is part of a batch. See how every URL in the batch scored.
          </p>
          <Link
            href={`/batch/${batchId}`}
            className="text-sm font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
          >
            View Per-Page Breakdown →
          </Link>
        </div>
      )}

      {scan?.big_six && (
        <div className="bg-[var(--surface)] border border-[var(--border)] 
          rounded-xl p-6 mb-8">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Big Six Violations
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(scan.big_six as Record<string, number>)
              .map(([key, count]) => (
              <div key={key} className="flex items-center justify-between
                bg-[var(--background)] rounded-lg p-3">
                <span className="text-[var(--text-secondary)] text-sm capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className={`font-bold text-sm ${
                  count > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
        All Violations ({violations?.length ?? 0})
      </h2>

    {!violations || violations.length === 0 ? (
  <div className="glass-panel rounded-xl p-8 glow-border text-center">
    <p className="text-emerald-400 text-lg font-medium">
      No violations found!
    </p>
    <p className="text-muted-foreground text-sm mt-2">
      This site passed all automated WCAG checks.
    </p>
  </div>
) : (
  <div className="space-y-3">
    {violations.map((v, index) => {
      const color = impactColors[v.impact] || '#64B5F6'
      return (
        <div 
          key={v.id}
          id={`violation-${index}`}
          className="glass-panel rounded-xl p-5 glow-border scroll-mt-24"
        >
          <div className="flex items-start gap-3">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0 mt-0.5"
              style={{
                backgroundColor: color + '15',
                color,
                border: `1px solid ${color}30`
              }}>
              {v.impact}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-sm">
                {v.rule_description || v.description || v.rule_id}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Rule ID: {v.rule_id || v.id}
                {v.wcag_criterion && ` • WCAG ${v.wcag_criterion}`}
              </p>
              {v.element_html && (
                <pre className="bg-secondary/30 rounded-lg p-3 mt-3 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all border border-border">
                  {v.element_html}
                </pre>
              )}
              {(v.fix_summary || v.help) && (
                <div className="mt-3 bg-primary/5 border border-primary/15 rounded-lg p-3">
                  <p className="text-primary text-xs font-semibold mb-1">
                    How to fix:
                  </p>
                  <p className="text-foreground/80 text-sm">
                    {v.fix_summary || v.help}
                  </p>
                </div>
              )}
              <AIFixButton
                violationId={v.id}
                existingFix={v.ai_fix_html ? { html: v.ai_fix_html, explanation: v.ai_fix_explanation } : null}
              />
              {(v.help_url || v.helpUrl) && (
                <a href={v.help_url || v.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 text-xs mt-2 inline-flex items-center gap-1 transition-colors">
                  Learn more →
                </a>
              )}
            </div>
          </div>
        </div>
      )
    })}
  </div>
)}  
      
    </div>
    <ComplianceAssistant
      reportId={params.id}
      userPlan={profile?.subscription_status || 'free'}
    />
    </>
  )
}