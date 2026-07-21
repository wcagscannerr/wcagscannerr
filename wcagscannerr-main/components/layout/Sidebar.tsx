'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
  LayoutDashboard, ScanLine, FileText, Monitor, 
  Settings, CreditCard, HelpCircle, Building2, 
  Layers, X, LogOut, ChevronRight, ShieldCheck, Lock
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useSubscription } from '@/hooks/useSubscription'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scanner', label: 'Scanner', icon: ScanLine },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/monitoring', label: 'Monitoring', icon: Monitor },
  { href: '/batch', label: 'Batch Scans', icon: Layers },
  { href: '/batch-reports', label: 'Batch Reports', icon: Layers },
  { href: '/vpat', label: 'VPAT Reports', icon: ShieldCheck, agencyOnly: true },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help', icon: HelpCircle },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const { isAgency } = useSubscription()

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ScanLine className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-sm text-foreground tracking-tight">WCAG Scanner</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const isLocked = item.agencyOnly && !isAgency

          // Agency-only items: show as disabled with a lock icon for non-agency users
          if (isLocked) {
            return (
              <div
                key={item.href}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground/50 border border-transparent cursor-not-allowed"
                title="Agency plan required"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'
                }
              `}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-border">
        <div className="glass-panel rounded-xl p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center text-xs font-bold text-primary">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}