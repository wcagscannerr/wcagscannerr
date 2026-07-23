'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, ScanLine, Bell, X } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import { AlertDropdown } from '@/components/dashboard/AlertDropdown'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.title = 'Dashboard — WCAG Scanner'
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 h-screen md:h-full
        w-64 bg-[hsl(var(--surface-elevated))]/80 backdrop-blur-xl border-r border-border
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full h-screen overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-[hsl(var(--surface-elevated))]/80 backdrop-blur-xl shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Open menu">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            <span className="text-foreground font-semibold text-sm">WCAG Scanner</span>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-[hsl(var(--surface-elevated))]/60 backdrop-blur-xl shrink-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">WCAG Scanner</span>
          </Link>
        </div>

        {/* Single AlertDropdown for both mobile & desktop */}
        <div className="fixed top-3 right-4 md:top-4 md:right-8 z-[9999]">
          <AlertDropdown />
        </div>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}