'use client'

/**
 * PerPageTable — Sortable Multi-Page Scan Breakdown
 *
 * Displays a sortable table of all pages scanned in a multi-page scan:
 * - Columns: URL, Score (color badge), Violations, Critical, Top Issues
 * - Default sort: lowest score first
 * - Score badge: red (<50), amber (50-84), green (85+)
 * - URL truncated with middle-ellipsis for long paths
 * - Top Issues column shows max 2 issue names as small badges
 * - Clicking a row expands to show full violation list for that page
 * - Pagination: 10 rows per page
 *
 * Dependencies: lucide-react, @/lib/utils (cn)
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Globe,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageActionsMenu } from './PageActionsMenu'

interface PageViolation {
  id: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  help: string
  description: string
  target: string[]
}

interface PageData {
  url: string
  score: number
  violations: number
  critical: number
  topIssues: string[]
  allViolations?: PageViolation[]
  /** When provided, an Actions column renders with Share/PDF/Statement/View
   * for this row. Omit for callers that don't have per-page report data. */
  scanId?: string
  reportId?: string | null
}

interface PerPageTableProps {
  pages: PageData[]
  className?: string
}

type SortKey = 'url' | 'score' | 'violations' | 'critical'
type SortDir = 'asc' | 'desc'

const ROWS_PER_PAGE = 10

function getScoreColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (score >= 50) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  return 'bg-red-500/10 text-red-400 border-red-500/20'
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url
  const half = Math.floor((maxLength - 3) / 2)
  return url.slice(0, half) + '...' + url.slice(-half)
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case 'critical':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'serious':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'moderate':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    default:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }
}

export function PerPageTable({ pages, className }: PerPageTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const hasActions = pages.some(p => p.scanId)
  const columnCount = hasActions ? 6 : 5

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        // Default: score asc (worst first), others desc
        setSortDir(key === 'score' ? 'asc' : 'desc')
      }
      setCurrentPage(1)
    },
    [sortKey]
  )

  const sortedPages = useMemo(() => {
    const sorted = [...pages].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'url':
          comparison = a.url.localeCompare(b.url)
          break
        case 'score':
          comparison = a.score - b.score
          break
        case 'violations':
          comparison = a.violations - b.violations
          break
        case 'critical':
          comparison = a.critical - b.critical
          break
      }
      return sortDir === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [pages, sortKey, sortDir])

  const totalPages = Math.ceil(sortedPages.length / ROWS_PER_PAGE)
  const paginatedPages = sortedPages.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  )

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ChevronDown className="w-3.5 h-3.5 text-text-muted opacity-30" />
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
    )
  }

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden ${className || ''}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Per-Page Breakdown
          </h3>
          <span className="text-xs text-text-muted">
            {pages.length} page{pages.length !== 1 ? 's' : ''} scanned
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              {[
                { key: 'url' as SortKey, label: 'Page URL', width: 'w-[40%]' },
                { key: 'score' as SortKey, label: 'Score', width: 'w-[13%]' },
                { key: 'violations' as SortKey, label: 'Violations', width: 'w-[13%]' },
                { key: 'critical' as SortKey, label: 'Critical', width: 'w-[11%]' },
                { key: 'topIssues' as SortKey, label: 'Top Issues', width: hasActions ? 'w-[13%]' : 'w-[23%]', sortable: false },
                ...(hasActions ? [{ key: 'actions' as SortKey, label: '', width: 'w-[10%]', sortable: false }] : []),
              ].map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider',
                    col.width,
                    col.sortable !== false && 'cursor-pointer hover:text-text-primary select-none'
                  )}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && <SortIcon column={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedPages.map((page) => (
              <React.Fragment key={page.url}>
                <tr
                  className={cn(
                    'hover:bg-background transition-colors cursor-pointer',
                    expandedRow === page.url && 'bg-neutral-500/5'
                  )}
                  onClick={() =>
                    setExpandedRow(prev => (prev === page.url ? null : page.url))
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span
                        className="text-sm text-text-primary font-mono truncate"
                        title={page.url}
                      >
                        {truncateUrl(page.url)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border',
                          getScoreColor(page.score)
                        )}
                      >
                        {page.score}
                      </span>
                      <span className="text-xs text-text-muted">
                        {getScoreLabel(page.score)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-secondary">
                      {page.violations}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {page.critical > 0 ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span
                        className={cn(
                          'text-sm font-medium',
                          page.critical > 0 ? 'text-red-400' : 'text-emerald-400'
                        )}
                      >
                        {page.critical}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {page.topIssues.slice(0, 2).map((issue, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-background text-text-secondary border border-border"
                        >
                          {issue}
                        </span>
                      ))}
                      {page.topIssues.length > 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium text-text-muted">
                          +{page.topIssues.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  {hasActions && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {page.scanId && (
                        <PageActionsMenu scanId={page.scanId} reportId={page.reportId ?? null} />
                      )}
                    </td>
                  )}
                </tr>

                {/* Expanded row */}
                {expandedRow === page.url && page.allViolations && page.allViolations.length > 0 && (
                  <tr>
                    <td colSpan={columnCount} className="px-4 py-4 bg-background">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-text-secondary mb-3">
                          Violations on this page ({page.allViolations.length})
                        </p>
                        {page.allViolations.map((v, i) => (
                          <div
                            key={`${v.id}-${i}`}
                            className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border"
                          >
                            <span
                              className={cn(
                                'flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border',
                                getImpactColor(v.impact)
                              )}
                            >
                              {v.impact}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-text-primary font-medium">
                                {v.help}
                              </p>
                              <p className="text-xs text-text-muted mt-0.5">
                                {v.description}
                              </p>
                              {v.target.length > 0 && (
                                <code className="block mt-1.5 text-[10px] font-mono text-neutral-400 bg-neutral-500/5 px-2 py-1 rounded">
                                  {v.target.join(' > ')}
                                </code>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <span className="text-xs text-text-muted">
            Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–
            {Math.min(currentPage * ROWS_PER_PAGE, sortedPages.length)} of{' '}
            {sortedPages.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                currentPage === 1
                  ? 'text-text-muted cursor-not-allowed'
                  : 'text-text-secondary hover:bg-border hover:text-text-primary'
              )}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-secondary px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                currentPage === totalPages
                  ? 'text-text-muted cursor-not-allowed'
                  : 'text-text-secondary hover:bg-border hover:text-text-primary'
              )}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}