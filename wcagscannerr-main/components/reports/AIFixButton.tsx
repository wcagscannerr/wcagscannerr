'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

export default function AIFixButton({
  violationId,
  existingFix,
}: {
  violationId: string
  existingFix?: { html: string; explanation: string } | null
}) {
  const [loading, setLoading] = useState(false)
  const [fix, setFix] = useState(existingFix || null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const generateFix = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/violations/${violationId}/ai-fix`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'UPGRADE_REQUIRED') {
          setError('Upgrade to Pro to unlock AI-generated fixes')
        } else {
          setError(data.error || 'Failed to generate fix')
        }
        return
      }
      setFix({ html: data.fixHtml, explanation: data.explanation })
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!fix) return
    navigator.clipboard.writeText(fix.html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (fix) {
    return (
      <div className="mt-3 bg-neutral-800/20 border border-neutral-500/20 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-neutral-300 text-xs font-semibold flex items-center gap-1">
            <span className="text-xs">✦</span> AI-Generated Fix
          </p>
          <button
            onClick={copyToClipboard}
            className="text-xs text-neutral-400 hover:text-neutral-300 flex items-center gap-1"
          >
            {copied ? <Check size={12} /> : <X size={12} />}
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
        <pre className="bg-background rounded p-2 text-xs text-green-300 overflow-x-auto">
          {fix.html}
        </pre>
        <p className="text-text-secondary text-xs mt-2">{fix.explanation}</p>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <button
        onClick={generateFix}
        disabled={loading}
        className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-800 
          disabled:opacity-50 text-text-primary text-xs px-3 py-2 rounded-lg transition-colors"
      >
        {loading ? <span className="inline-block text-sm animate-pulse">⏳</span> : <span className="text-sm">✦</span>}
        {loading ? 'Generating fix...' : 'Generate AI Fix'}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}