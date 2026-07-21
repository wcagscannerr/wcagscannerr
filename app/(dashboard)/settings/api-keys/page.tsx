'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Key, Copy, Trash2, Plus, Loader2, Shield, AlertTriangle, Lock, Send, CheckCircle2, XCircle, Clock, Code } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { toast } from 'sonner'

interface ApiKey {
  id: string
  name: string
  prefix: string
  tier: string
  rate_limit: number
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

interface UsageRow {
  id: string
  target_url: string
  passed: boolean | null
  status_code: number
  response_time_ms: number
  score: number | null
  created_at: string
}

// Step 5: brand-new keys reveal the plaintext once, so we pre-fill
// the snippet using that raw value before it disappears. Older keys
// use a placeholder — directing customers to set ${{ secrets.WCAG_API_KEY }}
// in their CI the standard way.
const GITHUB_ACTIONS_SNIPPET = (key: string | 'PLACEHOLDER') => `name: WCAG scan
on:
  pull_request:
    paths: ['**/*.tsx', '**/*.ts']
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run WCAG scan
        uses: wcagscannerr/wcag-scanner-action@v1
        with:
          api-key: \${key}
          url: https://staging.example.com
          fail-threshold: 90
`
  .replace('${key}', key)

const CURL_SNIPPET = (key: string | 'PLACEHOLDER') => `curl -fsS \\
  -H "Authorization: Bearer \${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://staging.example.com","fail_threshold":90}' \\
  https://www.wcagscannerr.com/api/v1/scan
`
  .replace('${KEY}', key)

export default function ApiKeysPage() {
  const { isEnterprise, loading: planLoading } = useSubscription()
  const [keys, setKeys] = useState<ApiKey[]>([])
  // Step 5: last 20 calls per key, fetched in one round-trip.
  const [usage, setUsage] = useState<Record<string, UsageRow[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showSecretInSnippet, setShowSecretInSnippet] = useState(false)

  const fetchKeys = useCallback(async () => {
    const [keysRes, usageRes] = await Promise.all([
      fetch('/api/v1/keys'),
      fetch('/api/v1/keys/usage'),
    ])
    if (keysRes.ok) {
      const data = await keysRes.json()
      setKeys(data.keys || [])
    }
    if (usageRes.ok) {
      const data = await usageRes.json()
      setUsage(data.usage || {})
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Only fetch keys once we know the user is enterprise — otherwise the
    // GET would either 403 or return an empty list and we'd flash the
    // management UI for a moment before the upsell card replaces it.
    if (!planLoading && isEnterprise) fetchKeys()
    else if (!planLoading) setIsLoading(false)
  }, [planLoading, isEnterprise, fetchKeys])

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard`)
    } catch {
      toast.error('Could not copy — select the snippet manually')
    }
  }

  const formatMs = (ms: number) => `${(ms / 1000).toFixed(1)}s`
  const formatRel = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setIsCreating(true)

    const res = await fetch('/api/v1/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName }),
    })

    if (res.ok) {
      const data = await res.json()
      setNewKey(data.key) // Show once; raw key for snippet pre-fill
      setNewKeyName('')
      setShowSecretInSnippet(true)
      fetchKeys()
    }
    setIsCreating(false)
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this key? It cannot be undone.')) return
    const res = await fetch(`/api/v1/keys/${id}`, { method: 'DELETE' })
    if (res.ok) fetchKeys()
  }

  const isRevoked = (k: ApiKey) => k.revoked_at !== null
  const activeKeys = keys.filter(k => !isRevoked(k))
  const revokedKeys = keys.filter(k => isRevoked(k))

  // Decide which key value gets substituted into the snippet copy.
  // Only a freshly-created plaintext gets the raw key inline; otherwise
  // the safer "${{ secrets.WCAG_API_KEY }}" pattern.
  const snippetKey: string | 'PLACEHOLDER' =
    newKey && showSecretInSnippet ? newKey : 'PLACEHOLDER'
  const rawKeyHint = newKey && showSecretInSnippet
    ? "(pre-filled with your freshly-created key; replace before committing)."
    : "Save as a GitHub Actions secret: WCAG_API_KEY, then paste below."

  if (!planLoading && !isEnterprise) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            API Keys
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Programmatic access to the WCAG Scanner API for CI/CD pipelines.
          </p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            API Keys are an Enterprise feature
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-5 max-w-md mx-auto">
            API access (Bearer-token auth for CI/CD, VPAT generation, full pipeline
            integration) is included only on the Enterprise plan.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium btn-magnetic shadow-lg shadow-primary/20"
            >
              <Send className="w-4 h-4" />
              Upgrade to Enterprise
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] hover:border-primary/30 rounded-xl text-sm text-[var(--text-primary)]"
            >
              Back to Settings
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">API Keys</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage API keys for CI/CD integration and programmatic access.
        </p>
      </div>

      {/* Create new key */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g., GitHub Actions)"
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-neutral-500/50"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="px-4 py-2 bg-neutral-700 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Key
        </button>
      </form>

      {/* Show new key + pre-filled CI/CD snippet once */}
      {newKey && (
        <div className="space-y-3">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-emerald-400 font-medium">API Key Created</p>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              Copy this now — we don't store the plaintext. Or copy the
              pre-filled CI snippet directly and paste into your workflow file.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] break-all">
                {newKey}
              </code>
              <button
                onClick={() => handleCopy(newKey, 'Key')}
                className="p-2 rounded-lg bg-neutral-700 hover:bg-neutral-800 text-white"
                title="Copy plaintext key"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowSecretInSnippet((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {showSecretInSnippet
              ? 'Hide key from the snippets below (use placeholder pattern)'
              : 'Show key pre-filled in the snippets below (initial-setup convenience)'}
          </button>
        </div>
      )}

      {/* ── Step 5 — CI/CD & Pipeline Integration ── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">CI/CD & Pipeline Integration</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {rawKeyHint} The step returns non-zero on a below-threshold scan,
          turning the workflow red in any CI provider.
        </p>

        <details className="rounded-lg border border-[var(--border)] overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-secondary/30">
            GitHub Actions
          </summary>
          <div className="p-3 bg-[var(--background)] relative">
            <button
              onClick={() => handleCopy(GITHUB_ACTIONS_SNIPPET(snippetKey), 'GitHub Actions snippet')}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-neutral-700 hover:bg-neutral-800 text-white"
              title="Copy snippet"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <pre className="text-xs font-mono text-[var(--text-primary)] overflow-x-auto whitespace-pre pr-10">
              {GITHUB_ACTIONS_SNIPPET(snippetKey)}
            </pre>
          </div>
        </details>

        <details className="rounded-lg border border-[var(--border)] overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-secondary/30">
            curl (GitLab CI, Jenkins, CircleCI, Bitbucket Pipelines…)
          </summary>
          <div className="p-3 bg-[var(--background)] relative">
            <button
              onClick={() => handleCopy(CURL_SNIPPET(snippetKey), 'curl snippet')}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-neutral-700 hover:bg-neutral-800 text-white"
              title="Copy snippet"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <pre className="text-xs font-mono text-[var(--text-primary)] overflow-x-auto whitespace-pre pr-10">
              {CURL_SNIPPET(snippetKey)}
            </pre>
          </div>
        </details>

        <p className="text-xs text-[var(--text-muted)] pt-1">
          Full setup guide:{' '}
          <a
            href="https://github.com/wcagscannerr/wcag-scanner-action"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            wcagscannerr/wcag-scanner-action
          </a>
          .
        </p>
      </div>

      {/* Usage Instructions */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <strong className="text-[var(--text-primary)]">Usage:</strong>{' '}
          Send the key as the{' '}
          <code className="bg-[var(--background)] border border-[var(--border)] rounded px-1 py-0.5 text-[var(--text-primary)]">
            Authorization: Bearer YOUR_KEY
          </code>{' '}
          header to{' '}
          <code className="bg-[var(--background)] border border-[var(--border)] rounded px-1 py-0.5 text-[var(--text-primary)]">
            POST /api/v1/scan
          </code>
        </p>
      </div>

      {/* Active Keys (with per-key usage table) */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Active Keys ({activeKeys.length})
        </h2>

        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--text-muted)]" /></div>
        ) : activeKeys.length === 0 ? (
          <div className="text-center py-6 text-[var(--text-secondary)] text-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl">
            No active API keys
          </div>
        ) : (
          <div className="space-y-4">
            {activeKeys.map((k) => {
              const keyUsage = usage[k.id] || []
              return (
                <div key={k.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Key className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{k.name}</p>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {k.prefix}… • {k.tier} • {k.rate_limit}/hr • Created {new Date(k.created_at).toLocaleDateString()}
                          {k.last_used_at && ` • Last used ${formatRel(k.last_used_at)}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ── Step 5 — Per-key usage stats ── */}
                  <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-2 mt-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        Recent Calls ({keyUsage.length})
                      </p>
                    </div>
                    {keyUsage.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] italic">
                        No calls yet — drop the snippet into a workflow file and push.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[var(--text-muted)]">
                              <th className="text-left font-medium pb-1 pr-3">When</th>
                              <th className="text-left font-medium pb-1 pr-3">Target</th>
                              <th className="text-left font-medium pb-1 pr-3">Result</th>
                              <th className="text-right font-medium pb-1">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {keyUsage.map((row) => {
                              const pass = row.passed === true
                              const errored = row.passed === null || row.status_code >= 500
                              return (
                                <tr key={row.id} className="border-t border-[var(--border)]/50">
                                  <td className="py-1.5 pr-3 text-[var(--text-secondary)] whitespace-nowrap">
                                    {formatRel(row.created_at)}
                                  </td>
                                  <td className="py-1.5 pr-3 text-[var(--text-primary)] max-w-xs truncate" title={row.target_url}>
                                    {row.target_url}
                                  </td>
                                  <td className="py-1.5 pr-3">
                                    {pass && (
                                      <span className="inline-flex items-center gap-1 text-emerald-400">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {row.score ?? '—'}/100
                                      </span>
                                    )}
                                    {row.passed === false && (
                                      <span className="inline-flex items-center gap-1 text-amber-400">
                                        <XCircle className="w-3.5 h-3.5" />
                                        {row.score ?? '—'}/100
                                      </span>
                                    )}
                                    {errored && (
                                      <span className="inline-flex items-center gap-1 text-red-400">
                                        <XCircle className="w-3.5 h-3.5" />
                                        {row.status_code}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1.5 text-right text-[var(--text-muted)] whitespace-nowrap">
                                    {formatMs(row.response_time_ms)}
                                    {row.score !== null && (
                                      <span className="ml-2 text-[var(--text-muted)]/70">score {row.score}</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Revoked Keys ({revokedKeys.length})
          </h2>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] opacity-60">
            {revokedKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-[var(--text-muted)]" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{k.name}</p>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        REVOKED
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {k.prefix}… • {k.tier} • Revoked {new Date(k.revoked_at!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
