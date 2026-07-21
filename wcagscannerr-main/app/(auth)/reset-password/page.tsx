'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  // 'checking' | 'ready' | 'invalid'
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>(
    'checking'
  )
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // FIXED: Check for an active session FIRST (set by /auth callback),
  // then fall back to verifying token_hash/code from URL params.
  const verifySession = useCallback(async () => {
    // 1. Check if we already have an active session from the /auth flow
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      // Session exists — user came through /auth callback, we're good to go
      setStatus('ready')
      return
    }

    // 2. No session — try to verify token params from the URL directly
    //    (handles cases where Supabase redirects straight here with tokens)
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const code = searchParams.get('code')

    if (tokenHash && type === 'recovery') {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      })

      if (error) {
        console.error('Token verification failed:', error.message)
        setStatus('invalid')
        return
      }
      setStatus('ready')
      return
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('Code exchange failed:', error.message)
        setStatus('invalid')
        return
      }
      setStatus('ready')
      return
    }

    // No session and no valid tokens
    setStatus('invalid')
  }, [supabase, searchParams])

  useEffect(() => {
    verifySession()
  }, [verifySession])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-panel rounded-2xl p-6 glow-border text-center">
          <p className="text-muted-foreground">Verifying your reset link...</p>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-2xl p-8 glow-border text-center">
            <h1 className="text-xl font-bold text-foreground mb-2">
              This link is invalid or has expired
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              Password reset links expire after a short time and can only be used
              once. This can happen if you opened the link in a different browser
              or device than the one you used to request it. Try requesting a new
              link and opening it in the same browser tab.
            </p>
            <Link
              href="/forgot-password"
              className="text-primary hover:text-primary/80 font-medium text-sm"
            >
              Request a new link →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl p-8 glow-border">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mb-6">
            <Lock size={22} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Set a new password
          </h1>

          {done ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle size={18} /> Password updated! Redirecting...
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4 mt-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                required
                className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:opacity-90 text-primary-foreground py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}