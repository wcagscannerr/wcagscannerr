'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, ExternalLink } from 'lucide-react'
import type { ScanResult as ScanApiResult, ScanViolation } from '@/types/scan'

interface Violation {
  id: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help?: string
  helpUrl?: string
  nodes?: Array<{
    html?: string
    target?: string[]
  }>
}

interface ScanResultsProps {
  result: ScanApiResult
}

const normalizeViolation = (violation: ScanViolation): Violation => ({
  id: violation.id,
  impact: violation.impact,
  description: violation.rule_description || violation.fix_summary || violation.id,
  help: violation.fix_detail || violation.fix_summary,
  helpUrl: violation.help_url,
  nodes: violation.element_html
    ? [{ html: violation.element_html, target: violation.element_selector ? [violation.element_selector] : undefined }]
    : undefined,
})

const impactConfig = {
  critical: {
    color: '#EF4444',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: AlertTriangle,
    label: 'Critical',
  },
  serious: {
    color: '#F59E0B',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: AlertTriangle,
    label: 'Serious',
  },
  moderate: {
    color: '#3B82F6',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Info,
    label: 'Moderate',
  },
  minor: {
    color: '#6B7280',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    icon: Info,
    label: 'Minor',
  },
}

export default function ScanResults({ result }: ScanResultsProps) {
  const violations = (result.violations ?? []).map(normalizeViolation)

  const grouped = violations.reduce((acc, v) => {
    const impact = v.impact || 'minor'
    if (!acc[impact]) acc[impact] = []
    acc[impact].push(v)
    return acc
  }, {} as Record<string, Violation[]>)

  const impactOrder = ['critical', 'serious', 'moderate', 'minor']

  return (
    <div className="space-y-4">
      {impactOrder.map((impact) => {
        const violations = grouped[impact]
        if (!violations || violations.length === 0) return null

        const config = impactConfig[impact as keyof typeof impactConfig]

        return (
          <div key={impact} className="space-y-3">
            <div className="flex items-center gap-2">
              <config.icon className="w-4 h-4" style={{ color: config.color }} />
              <h3 className="text-sm font-semibold" style={{ color: config.color }}>
                {config.label} ({violations.length})
              </h3>
            </div>

            {violations.map((violation, index) => (
              <motion.div
                key={violation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-panel rounded-xl p-4 ${config.border} glow-border`}
              >
                <p className="text-sm font-medium text-foreground mb-1">
                  {violation.description || violation.id}
                </p>

                {violation.nodes && violation.nodes[0]?.html && (
                  <code className="block mt-2 p-2 bg-secondary/50 rounded-lg text-xs text-muted-foreground font-mono break-all">
                    {violation.nodes[0].html}
                  </code>
                )}

                {violation.help && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {violation.help}
                  </p>
                )}

                {violation.helpUrl && (
                  <a
                    href={violation.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Learn more <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )
      })}

      {violations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-2xl p-8 glow-border text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Violations Found!</h3>
          <p className="text-sm text-muted-foreground">
            Your page passed all automated WCAG checks. Great job!
          </p>
        </motion.div>
      )}
    </div>
  )
}