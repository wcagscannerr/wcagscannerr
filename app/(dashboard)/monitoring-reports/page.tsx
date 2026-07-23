'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Layers, Loader2, Monitor, Clock, Zap } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { motion } from 'framer-motion'

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

function formatRelative(dateStr: string | null) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function MonitoringReportsPage() {
  const { isPaid, loading: planLoading } = useSubscription()
  const [batches, setBatches] = useState<any[]>([])
  const [scansByBatch, setScansByBatch] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch monitoring batches (name starts with "Monitoring scan of")
      const res = await fetch('/api/scan/batch?monitoring=true')
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to load monitoring reports')
      }
      const data = await res.json()
      setBatches(data.batches || [])
      setScansByBatch(data.scansByBatch || {})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Starter+ gating
  if (!planLoading && !isPaid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          <Monitor className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Starter+ Feature</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Monitoring reports with per-page breakdowns, score trends, and violation history are available on Starter and above plans.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity btn-magnetic shadow-lg shadow-primary/20"
        >
          <Zap className="w-4 h-4" />
          Upgrade to Starter
        </Link>
      </motion.div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoring Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Per-page breakdowns from your automated monitoring scans.
          </p>
        </div>
        <Link
          href="/monitoring"
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-foreground hover:bg-secondary/30 transition-all"
        >
          <Monitor className="w-4 h-4" />
          Manage Sites
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm"
          >
            Retry
          </button>
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No monitoring reports yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Monitoring scans run on a schedule. Reports appear here automatically after each scan.
          </p>
          <Link
            href="/monitoring"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            <Monitor className="w-4 h-4" />
            Go to Monitoring
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {batches.map((batch) => {
            const scans = scansByBatch[batch.id] || []
            const completedScans = scans.filter((s: any) => s.status === 'completed')
            const avgScore = completedScans.length > 0
              ? Math.round(completedScans.reduce((sum: number, s: any) => sum + (s.compliance_score || 0), 0) / completedScans.length)
              : 0
            const totalViolations = completedScans.reduce((sum: number, s: any) => sum + (s.total_violations || 0), 0)
            const totalCritical = completedScans.reduce((sum: number, s: any) => sum + (s.critical_count || 0), 0)
            const isInProgress = batch.status === 'queued' || batch.status === 'running'

            return (
              <div key={batch.id} className="glass-panel rounded-2xl overflow-hidden glow-border">
                {/* Batch Header */}
                <div className="p-5 border-b border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Monitor className="w-4 h-4 text-primary shrink-0" />
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {batch.name || 'Monitoring Scan'}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {batch.completed_urls}/{batch.total_urls} pages scanned
                        {batch.failed_urls > 0 && ` · ${batch.failed_urls} failed`}
                        {' · '}
                        {new Date(batch.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {batch.base_url && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{batch.base_url}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {isInProgress ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Scanning
                        </span>
                      ) : completedScans.length > 0 ? (
                        <>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</p>
                            <p className="font-bold text-lg" style={{ color: scoreColorFor(avgScore) }}>
                              {avgScore}
                              <span className="text-xs text-muted-foreground font-normal">/100</span>
                            </p>
                          </div>
                          <div className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                            style={{
                              backgroundColor: scoreColorFor(avgScore) + '15',
                              color: scoreColorFor(avgScore),
                              borderColor: scoreColorFor(avgScore) + '30',
                            }}>
                            {scoreLabelFor(avgScore)}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Mini stats */}
                  {completedScans.length > 0 && (
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{totalViolations} total violations</span>
                      {totalCritical > 0 && (
                        <span className="text-red-400 font-medium">{totalCritical} critical</span>
                      )}
                      <span>{formatRelative(batch.completed_at)}</span>
                    </div>
                  )}
                </div>

                {/* Per-page list */}
                {scans.length > 0 && (
                  <div className="divide-y divide-border/50">
                    {scans.map((scan: any) => {
                      const score = scan.compliance_score ?? 0
                      const reportId = scan.reports?.[0]?.id
                      return (
                        <Link
                          key={scan.id}
                          href={reportId ? `/reports/${reportId}` : `/batch/${batch.id}`}
                          className="flex items-center justify-between px-5 py-3 hover:bg-secondary/10 transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="text-sm text-foreground truncate">{scan.url}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {scan.total_violations ?? 0} violations · {scan.critical_count ?? 0} critical
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-xs font-bold" style={{ color: scoreColorFor(score) }}>
                                {score}/100
                              </p>
                            </div>
                            {scan.status === 'completed' ? (
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: score >= 75 ? '#22D3A0' : score >= 50 ? '#F59E0B' : '#EF4444' }}
                              />
                            ) : scan.status === 'failed' ? (
                              <span className="text-[10px] text-red-400">Failed</span>
                            ) : (
                              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* View Per-Page Breakdown button */}
                {completedScans.length > 0 && (
                  <div className="px-5 py-3 border-t border-border/50">
                    <Link
                      href={`/batch/${batch.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      <Layers className="w-3 h-3" />
                      View Per-Page Breakdown →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Auto-refresh badge */}
      {batches.length > 0 && !loading && (
        <div className="flex items-center gap-1.5 mt-6 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          Reports update automatically after each monitoring scan.
        </div>
      )}
    </div>
  )
}
