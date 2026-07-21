import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { Shield, ExternalLink, Clock, Eye } from 'lucide-react'

interface SharedReportPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: SharedReportPageProps): Promise<Metadata> {
  const db = createServiceClient()

  const { data: share } = await db
    .from('shared_reports')
    .select('scan_id, revoked_at')
    .eq('slug', params.slug)
    .single()

  if (!share) {
    return {
      title: 'Report Not Found | WCAG Scanner',
      robots: { index: false, follow: false },
    }
  }

  const { data: scan } = await db
    .from('scans')
    .select('url, compliance_score')
    .eq('id', share.scan_id)
    .single()

  const score = scan?.compliance_score ?? 0
  const scoreLabel = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor'

  return {
    title: `Accessibility Report: ${scan?.url || 'Website'} — ${scoreLabel} (${score}/100) | WCAG Scanner`,
    description: `View a detailed WCAG accessibility scan report for ${scan?.url}. Compliance score: ${score}/100.`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `WCAG Accessibility Report — ${score}/100`,
      description: `Detailed accessibility audit for ${scan?.url}`,
      type: 'website',
    },
  }
}

export default async function SharedReportPage({ params }: SharedReportPageProps) {
  const db = createServiceClient()

  const { data: share, error: shareError } = await db
    .from('shared_reports')
    .select('*, scans(*)')
    .eq('slug', params.slug)
    .single()

  if (shareError || !share) {
    notFound()
  }

  if (share.revoked_at && new Date(share.revoked_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <Clock className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            This report link has expired
          </h1>
          <p className="text-text-secondary mb-6">
            The shared report you're looking for is no longer available.
            Ask the person who shared it to generate a new link.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
          >
            <Shield className="w-4 h-4" />
            Run your own scan
          </Link>
        </div>
      </div>
    )
  }

  void (async () => {
    try {
      await db.from('shared_reports')
        .update({ view_count: (share.view_count || 0) + 1 })
        .eq('slug', params.slug)
    } catch {
      // Ignore view counter failures
    }
  })()

  const scan = share.scans as any
  const score = scan?.compliance_score ?? 0

  const scoreColor = score >= 90 ? 'text-emerald-400'
    : score >= 75 ? 'text-green-400'
    : score >= 50 ? 'text-amber-400'
    : 'text-red-400'

  const scoreBg = score >= 90 ? 'bg-emerald-500/10 border-emerald-500/20'
    : score >= 75 ? 'bg-green-500/10 border-green-500/20'
    : score >= 50 ? 'bg-amber-500/10 border-amber-500/20'
    : 'bg-red-500/10 border-red-500/20'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-500" />
            <span className="font-bold text-text-primary">WCAG Scanner</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {share.view_count || 0} views
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className={`rounded-2xl border p-8 mb-8 text-center ${scoreBg}`}>
          <div className={`text-6xl font-black mb-2 ${scoreColor}`}>
            {score}
          </div>
          <div className="text-text-secondary text-lg mb-1">
            Accessibility Score
          </div>
          <div className="text-text-muted text-sm">
            WCAG {scan?.wcag_version || '2.1'} Level {scan?.wcag_level || 'AA'}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Scanned URL
          </div>
          <a
            href={scan?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-primary font-medium flex items-center gap-2 hover:text-purple-400 transition-colors"
          >
            {scan?.url}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Critical', value: scan?.critical_count || 0, color: 'text-red-400' },
            { label: 'Serious', value: scan?.serious_count || 0, color: 'text-orange-400' },
            { label: 'Moderate', value: scan?.moderate_count || 0, color: 'text-yellow-400' },
            { label: 'Minor', value: scan?.minor_count || 0, color: 'text-blue-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-card rounded-xl border border-border p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-text-muted uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {scan?.big_six && (
          <div className="bg-card rounded-xl border border-border p-6 mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              The Big Six Issues
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'contrast', label: 'Contrast', icon: '👁️' },
                { key: 'altText', label: 'Alt Text', icon: '🖼️' },
                { key: 'labels', label: 'Labels', icon: '🏷️' },
                { key: 'links', label: 'Links', icon: '🔗' },
                { key: 'buttons', label: 'Buttons', icon: '🔘' },
                { key: 'language', label: 'Language', icon: '🌐' },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg bg-background">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{item.label}</div>
                    <div className="text-xs text-text-muted">
                      {scan.big_six[item.key] || 0} issue{scan.big_six[item.key] !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center py-8 border-t border-border">
          <p className="text-text-secondary mb-4">
            Get your own detailed accessibility report
          </p>
          <Link
            href="/free-scan"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
          >
            <Shield className="w-4 h-4" />
            Scan your website
          </Link>
        </div>

        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-text-muted">
            Scanned by <span className="font-medium text-text-secondary">WCAG Scanner</span>
            {' · '}
            {new Date(scan?.completed_at || scan?.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
      </main>
    </div>
  )
}