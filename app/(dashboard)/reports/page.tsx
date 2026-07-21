import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reports | WCAG Scanner',
  description: 'Browse and review your website accessibility scan reports, compliance scores, and detailed WCAG violation breakdowns.',
  openGraph: {
    title: 'Reports | WCAG Scanner',
    description: 'Browse and review your website accessibility scan reports, compliance scores, and detailed WCAG violation breakdowns.',
    url: 'https://www.wcagscannerr.com/reports',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

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

export default async function ReportsPage() {
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

  // Individual scan reports only. Batch scans are shown under /batch-reports.
  const { data: reports, error } = await supabase
    .from('reports')
    .select(`
      id,
      name,
      created_at,
      is_public,
      scan_id,
      scans (
        url,
        compliance_score,
        total_violations,
        critical_count,
        serious_count,
        status,
        created_at,
        batch_id
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const singleReports = (reports || []).filter((r: any) => !r.scans?.batch_id)

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Reports</h1>
        <p className="text-red-400">Error loading reports: {error.message}</p>
      </div>
    )
  }

  if (singleReports.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Reports</h1>
        <p className="text-text-secondary">No reports yet. Run a scan to get started.</p>
        <Link href="/scanner"
          className="mt-4 inline-block bg-neutral-700 text-text-primary px-4 py-2 rounded-lg">
          Run First Scan
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Reports</h1>
      <p className="text-text-secondary mb-6">
        Your individual scan reports.
      </p>

      <div className="space-y-4">
        {singleReports.map((report: any) => {
          const scan = report.scans as any
          const score = scan?.compliance_score ?? 0
          const scoreColor = scoreColorFor(score)

          return (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <div className="bg-surface border border-border rounded-xl p-6
                hover:border-neutral-500 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">
                      {scan?.url || 'Unknown URL'}
                    </p>
                    <p className="text-text-secondary text-sm mt-1">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-sm text-text-secondary">Violations</p>
                      <p className="text-text-primary font-medium">
                        {scan?.total_violations ?? 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-secondary">Score</p>
                      <p className="font-bold text-xl" style={{ color: scoreColor }}>
                        {score}/100
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: scoreColor + '20', color: scoreColor }}>
                      {scoreLabelFor(score)}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}