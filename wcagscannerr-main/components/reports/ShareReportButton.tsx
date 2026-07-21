'use client'

import React, { useState, useCallback } from 'react'
import { Share2, Link2, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareReportButtonProps {
  scanId: string
  className?: string
}

export function ShareReportButton({ scanId, className }: ShareReportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleShare = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: scanId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create share link')
      }

      const fullUrl = `${window.location.origin}${data.shareUrl}`
      setShareUrl(fullUrl)

      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }, [scanId])

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }, [shareUrl])

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={handleShare}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
          "border border-border bg-card text-text-primary",
          "hover:bg-border hover:border-text-secondary",
          "focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : copied ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
        {isLoading ? 'Creating link...' : copied ? 'Copied!' : 'Share Report'}
      </button>

      {shareUrl && !isLoading && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary">Shareable Link</span>
            <button
              onClick={() => setShareUrl(null)}
              className="text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 text-xs bg-background border border-border rounded-lg px-3 py-2 text-text-secondary font-mono"
            />
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-neutral-700 hover:bg-neutral-800 text-white transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Anyone with this link can view this report. No login required.
          </p>
        </div>
      )}

      {error && (
        <div className="absolute right-0 top-full mt-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}