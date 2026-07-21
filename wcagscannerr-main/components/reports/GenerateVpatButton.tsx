'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileCheck2, X, Loader2 } from 'lucide-react'

interface Props {
  scanId: string
  /** No longer used to pre-fill Product Name - a scanned URL isn't a
   * product name, and pre-filling it produced VPATs with "PRODUCT NAME:
   * https://example.com" on the cover page. Kept as an optional prop so
   * existing call sites don't need to change. */
  defaultProductName?: string
}

export function GenerateVpatButton({ scanId, defaultProductName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [productName, setProductName] = useState('')
  const [productVersion, setProductVersion] = useState('')
  const [evaluatorName, setEvaluatorName] = useState('')
  const [evaluatorContact, setEvaluatorContact] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/vpat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_id: scanId,
          product_name: productName,
          product_version: productVersion || undefined,
          evaluator_name: evaluatorName,
          evaluator_contact: evaluatorContact || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate VPAT')

      router.push(`/vpat/${data.vpat_id}`)
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-surface-elevated hover:bg-border border
          border-border text-text-primary px-4 py-2 rounded-lg
          text-sm transition-colors"
      >
        <FileCheck2 className="w-4 h-4" />
        Generate VPAT
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setOpen(false)}>
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-text-primary">Generate VPAT / ACR</h2>
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-5">
              This creates a draft conformance report from this scan's results. You'll be able to review and edit every row before finalizing.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Product Name *</label>
                <input
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Acme Client Portal"
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Product Version</label>
                <input
                  value={productVersion}
                  onChange={(e) => setProductVersion(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Evaluator / Agency Name *</label>
                <input
                  required
                  value={evaluatorName}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  placeholder="Your agency or your name"
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Evaluator Contact</label>
                <input
                  value={evaluatorContact}
                  onChange={(e) => setEvaluatorContact(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !productName || !evaluatorName}
                className="w-full mt-2 py-2.5 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                {submitting ? 'Creating draft...' : 'Create Draft VPAT'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}