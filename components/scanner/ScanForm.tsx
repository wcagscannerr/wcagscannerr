'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScanLine, ChevronDown, Globe, Shield, Zap, Layers } from 'lucide-react'

interface ScanFormProps {
  onSubmit: (
    url: string,
    wcagLevel: 'AA' | 'A' | 'AAA',
    wcagVersion?: '2.1' | '2.2',
    scanType?: 'single' | 'multiscan',
    pageCount?: number
  ) => void
  loading: boolean
}

export default function ScanForm({ onSubmit, loading }: ScanFormProps) {
  const [url, setUrl] = useState('')
  const [wcagLevel, setWcagLevel] = useState<'AA' | 'A' | 'AAA'>('AA')
  const [wcagVersion, setWcagVersion] = useState<'2.1' | '2.2'>('2.1')
  const [showOptions, setShowOptions] = useState(false)
  const [scanType, setScanType] = useState<'single' | 'multiscan'>('single')
  const [pageCount, setPageCount] = useState<2 | 5 | 10 | 15>(5)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || loading) return
    onSubmit(url.trim(), wcagLevel, wcagVersion, scanType, pageCount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* URL Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Globe className="w-4 h-4 text-muted-foreground" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Options Toggle */}
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
        Scan Options
      </button>

      {/* Collapsible Options */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: showOptions ? 'auto' : 0, opacity: showOptions ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="space-y-3 pb-2">
          {/* WCAG Level */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">WCAG Level</label>
            <div className="flex gap-2">
              {(['A', 'AA', 'AAA'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setWcagLevel(level)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    wcagLevel === level
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* WCAG Version */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">WCAG Version</label>
            <div className="flex gap-2">
              {(['2.1', '2.2'] as const).map((version) => (
                <button
                  key={version}
                  type="button"
                  onClick={() => setWcagVersion(version)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    wcagVersion === version
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  WCAG {version}
                </button>
              ))}
            </div>
          </div>

          {/* Scan Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Scan Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScanType('single')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                  scanType === 'single'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="w-3 h-3" />
                Single Page
              </button>
              <button
                type="button"
                onClick={() => setScanType('multiscan')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                  scanType === 'multiscan'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="w-3 h-3" />
                Multi-Page
              </button>
            </div>
          </div>

          {/* Page Count (only shown for multiscan) */}
          {scanType === 'multiscan' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Number of Pages</label>
              <div className="grid grid-cols-4 gap-2">
                {([2, 5, 10, 15] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPageCount(count)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      pageCount === count
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {count} pages
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Scans multiple pages of your website. Uses GitHub Actions for reliable multi-page scanning.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={loading || !url.trim()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl btn-magnetic shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Scanning...
          </>
        ) : scanType === 'multiscan' ? (
          <>
            <Layers className="w-4 h-4" />
            Start Multi-Scan
          </>
        ) : (
          <>
            <ScanLine className="w-4 h-4" />
            Start Scan
          </>
        )}
      </motion.button>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 pt-1">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3" /> Secure
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Zap className="w-3 h-3" /> Fast
        </span>
      </div>
    </form>
  )
}
