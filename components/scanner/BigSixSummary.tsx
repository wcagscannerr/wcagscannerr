'use client'

import { motion } from 'framer-motion'
import { 
  Contrast, 
  Image, 
  FormInput, 
  Link2, 
  MousePointerClick, 
  Languages 
} from 'lucide-react'

interface BigSixData {
  contrast: number
  alt_text: number
  labels: number
  links: number
  buttons: number
  lang: number
}

interface BigSixSummaryProps {
  bigSix: BigSixData
}

const items = [
  { key: 'contrast' as const, label: 'Color Contrast', icon: Contrast },
  { key: 'alt_text' as const, label: 'Alt Text', icon: Image },
  { key: 'labels' as const, label: 'Form Labels', icon: FormInput },
  { key: 'links' as const, label: 'Link Names', icon: Link2 },
  { key: 'buttons' as const, label: 'Button Names', icon: MousePointerClick },
  { key: 'lang' as const, label: 'Language', icon: Languages },
]

export default function BigSixSummary({ bigSix }: BigSixSummaryProps) {
  const total = Object.values(bigSix).reduce((a, b) => a + b, 0)

  return (
    <div className="glass-panel rounded-2xl p-6 glow-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Big Six Violations</h3>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item, index) => {
          const count = bigSix[item.key] || 0
          const hasIssues = count > 0

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                hasIssues
                  ? 'bg-red-500/5 border-red-500/15'
                  : 'bg-secondary/20 border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hasIssues ? 'bg-red-500/10' : 'bg-emerald-500/10'
              }`}>
                <item.icon className={`w-4 h-4 ${hasIssues ? 'text-red-400' : 'text-emerald-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                <p className={`text-xs ${hasIssues ? 'text-red-400' : 'text-emerald-400'} font-semibold`}>
                  {count} issue{count !== 1 ? 's' : ''}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}