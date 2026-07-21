'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="p-6 min-h-screen bg-background text-text-primary">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-text-secondary text-sm mb-4 break-words">
        {error.message}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-neutral-700 px-4 py-2 rounded-lg text-sm hover:bg-neutral-800"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="bg-surface-elevated px-4 py-2 rounded-lg text-sm hover:bg-[#2A2A3A] border border-border"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}