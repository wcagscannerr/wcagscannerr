import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { FileText, Lock, ArrowUpRight } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/dodo/plans'
import { GenerateVpatButton } from '@/components/reports/GenerateVpatButton'
import { ShareReportButton } from '@/components/reports/ShareReportButton'

export const metadata: Metadata = {
  title: 'VPAT Reports | WCAG Scanner',
  description: 'Generate Voluntary Product Accessibility Template (VPAT) / Accessibility Conformance Reports (ACR) from your scan results.',
}

function scoreColorFor(score: number) {
  return score >= 90 ? '#22D3A0'
    : score >= 75 ? '#22c55e'
    : score >= 50 ? '#F59E0B'
    : '#EF4444'
}

export default async function VpatListPage() {
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

  // Check if user has agency plan — VPAT is agency-exclusive
  const db = createServiceClient()
  const { data: profile } = await db
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const planId = profile?.subscription_status || 'free'
  const hasVpatAccess = PLANS[planId as keyof typeof PLANS]?.limits?.vpatGeneration === true

  if (!hasVpatAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Agency-Only Feature</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          VPAT / ACR generation is exclusive to Agency plan subscribers. 
          Upgrade to generate formal accessibility conformance reports for your clients.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowUpRight className="w-4 h-4" />
          Upgrade to Agency
        </Link>
      </div>
    )
  }

  // Fetch individual scan reports (non-batch) only
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id,
      name,
      created_at,
      scan_id,
      scans (
        url,
        compliance_score,
        total_violations,
        status,
        batch_id
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const singleReports = (reports || []).filter((r: any) => !r.scans?.batch_id)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">VPAT Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a scan to generate a Voluntary Product Accessibility Template / ACR
        </p>
      </div>

      {singleReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No scans yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Run a scan first, then come here to generate a VPAT from the results.
          </p>
          <Link
            href="/scanner"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <FileText className="w-4 h-4" />
            Run a Scan
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {singleReports.map((report: any) => {
            const scan = report.scans as any
            const score = scan?.compliance_score ?? 0
            const scoreColor = scoreColorFor(score)

            return (
              <div
                key={report.id}
                className="bg-surface border border-border rounded-xl p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">
                      {scan?.url || 'Unknown URL'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-text-secondary text-xs">
                        {new Date(report.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      <span className="text-xs font-semibold" style={{ color: scoreColor }}>
                        {score}/100
                      </span>
                      <span className="text-xs text-text-secondary">
                        {scan?.total_violations ?? 0} violations
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <GenerateVpatButton scanId={report.scan_id} defaultProductName={scan?.url} />
                    <ShareReportButton scanId={report.scan_id} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}