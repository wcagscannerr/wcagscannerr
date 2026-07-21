'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ComplianceScoreProps {
  score: number
  total: number
}

export default function ComplianceScore({ score, total }: ComplianceScoreProps) {
  const getColor = (s: number) => {
    if (s >= 90) return { main: '#22D3A0', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' }
    if (s >= 75) return { main: '#22c55e', bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' }
    if (s >= 50) return { main: '#F59E0B', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' }
    return { main: '#EF4444', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' }
  }

  const colors = getColor(score)
  const circumference = 2 * Math.PI * 52
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="glass-panel rounded-2xl p-6 glow-border flex items-center gap-6">
      {/* Circular Score */}
      <div className="relative w-28 h-28 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={colors.main}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold text-foreground"
          >
            {score}
          </motion.span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>

      {/* Score Details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground mb-1">Compliance Score</h3>
        <p className={`text-xs ${colors.text} font-medium mb-2`}>
          {score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'Poor'}
        </p>
        <p className="text-xs text-muted-foreground">
          {total} violation{total !== 1 ? 's' : ''} detected across all severity levels
        </p>
      </div>
    </div>
  )
}