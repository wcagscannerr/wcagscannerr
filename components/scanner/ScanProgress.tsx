'use client'

import { motion } from 'framer-motion'
import { Loader2, ScanLine } from 'lucide-react'

export default function ScanProgress() {
  return (
    <div className="glass-panel rounded-2xl p-8 glow-border flex flex-col items-center justify-center min-h-[320px]">
      <div className="relative mb-6">
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full border-2 border-primary/20 border-t-primary/80"
        />
        {/* Inner icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <ScanLine className="w-8 h-8 text-primary/60" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">Scanning in Progress</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
        Analyzing your page for WCAG accessibility violations using axe-core...
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: ['0%', '40%', '60%', '80%', '90%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>This may take 10-30 seconds</span>
      </div>
    </div>
  )
}