'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import ScanForm from '@/components/scanner/ScanForm'
import ScanProgress from '@/components/scanner/ScanProgress'
import ScanResults from '@/components/scanner/ScanResults'
import ComplianceScore from '@/components/scanner/ComplianceScore'
import BigSixSummary from '@/components/scanner/BigSixSummary'
import { useScan } from '@/hooks/useScan'
import { useSubscription } from '@/hooks/useSubscription'
import { useMultiscan } from '@/hooks/useMultiscan'
import { ArrowLeft, Sparkles, Layers } from 'lucide-react'

export default function ScannerPage() {
  const router = useRouter()
  const { scanResult, loading, error, startScan, resetScan } = useScan()
  const { limits, isPaid } = useSubscription()
  const { 
    loading: multiscanLoading, 
    error: multiscanError, 
    result: multiscanResult,
    batchStatus,
    startMultiscan, 
    reset: resetMultiscan 
  } = useMultiscan()

  const handleScan = async (
    url: string,
    wcagLevel: 'AA' | 'A' | 'AAA',
    wcagVersion?: '2.1' | '2.2',
    scanType?: 'single' | 'multiscan',
    pageCount?: number
  ) => {
    if (scanType === 'multiscan') {
      startMultiscan(url, pageCount || 5, wcagVersion, wcagLevel)
    } else {
      startScan(url, wcagLevel, wcagVersion)
    }
  }

  const handleReset = () => {
    resetScan()
    resetMultiscan()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">WCAG Scanner</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scan your website for accessibility violations using the axe-core engine.
        </p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-8">
        {/* Scan form */}
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-5 glow-border">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              New Scan
            </h2>
            <ScanForm
              onSubmit={handleScan}
              loading={loading}
            />
          </div>

          <AnimatePresence>
            {(scanResult || multiscanResult) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Run Another Scan
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <div>
          <AnimatePresence mode="wait">
            {(loading || multiscanLoading) && !multiscanResult && (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ScanProgress />
              </motion.div>
            )}

            {/* Multiscan Progress */}
            {multiscanResult && multiscanResult.status === 'queued' && (
              <motion.div
                key="multiscan-progress"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-8 glow-border"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Multi-Page Scan Started</h3>
                    <p className="text-sm text-muted-foreground">Scanning {multiscanResult.total_pages} pages in the background</p>
                  </div>
                </div>

                {batchStatus && (
                  <div className="space-y-3">
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ 
                          width: `${batchStatus.total_urls > 0 
                            ? Math.round((batchStatus.completed_urls / batchStatus.total_urls) * 100) 
                            : 0}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{batchStatus.completed_urls} / {batchStatus.total_urls} pages scanned</span>
                      {batchStatus.failed_urls > 0 && (
                        <span className="text-red-400">{batchStatus.failed_urls} failed</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3">
                    You can safely close this page. Your results will be available in Batch Reports when complete.
                  </p>
                  <a
                    href={`/batch/${multiscanResult.batch_id}`}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    View detailed progress →
                  </a>
                </div>
              </motion.div>
            )}

            {scanResult && scanResult.status === 'completed' && !loading && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <ComplianceScore
                    score={scanResult.compliance_score || 0}
                    total={scanResult.total_violations}
                  />
                  <BigSixSummary
                    bigSix={scanResult.big_six || {
                      contrast: 0, alt_text: 0, labels: 0, links: 0, buttons: 0, lang: 0,
                    }}
                  />
                </div>
                <ScanResults result={scanResult} />
              </motion.div>
            )}

            {scanResult && scanResult.status === 'failed' && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel rounded-2xl p-8 glow-border text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-danger font-medium mb-2">Scan Failed</p>
                <p className="text-muted-foreground text-sm">{scanResult.error_message}</p>
              </motion.div>
            )}

            {!scanResult && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel rounded-2xl p-12 glow-border text-center min-h-[320px] flex flex-col items-center justify-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Ready to Scan</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Enter a URL on the left to start scanning. First scan is free!
                </p>
              </motion.div>
            )}
          </AnimatePresence>            {(error || multiscanError) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl p-3"
              >
                {error || multiscanError}
              </motion.p>
            )}
        </div>
      </div>
    </div>
  )
}