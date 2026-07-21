'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, AlertTriangle, TrendingDown, TrendingUp, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MonitoringAlert {
  id: string
  alert_type: 'score_drop' | 'new_critical' | 'fixed' | 'new_serious'
  message: string
  previous_value: number | null
  current_value: number | null
  read: boolean
  created_at: string
  site_id: string
  scan_id: string
  report_id?: string | null
}

export function AlertDropdown() {
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/check-alerts?unread=true&limit=10')
      if (!response.ok) return
      const data = await response.json()
      setAlerts(data.alerts || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const clickedInsideButton = buttonRef.current?.contains(target)
      const clickedInsideDropdown = dropdownRef.current?.contains(target)
      if (!clickedInsideButton && !clickedInsideDropdown) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleScroll = () => setIsOpen(false)
    window.addEventListener('scroll', handleScroll, { capture: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true })
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen])

  const handleMarkRead = useCallback(async (alertId: string) => {
    setMarkingRead(prev => new Set(prev).add(alertId))

    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })

      if (response.ok) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } finally {
      setMarkingRead(prev => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    const unreadAlerts = alerts.filter(a => !a.read)
    await Promise.all(unreadAlerts.map(a => handleMarkRead(a.id)))
  }, [alerts, handleMarkRead])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'score_drop':
        return <TrendingDown className="w-4 h-4 text-red-400" />
      case 'new_critical':
      case 'new_serious':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />
      case 'fixed':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />
      default:
        return <Bell className="w-4 h-4 text-text-muted" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'score_drop':
        return 'border-l-red-400'
      case 'new_critical':
      case 'new_serious':
        return 'border-l-orange-400'
      case 'fixed':
        return 'border-l-emerald-400'
      default:
        return 'border-l-border'
    }
  }

  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-xl transition-colors",
          "text-text-secondary hover:text-text-primary hover:bg-border",
          isOpen && "bg-border text-text-primary"
        )}
        aria-label={`Alerts ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed w-96 bg-card border border-border rounded-2xl shadow-2xl z-[9999] overflow-hidden" style={{ top: dropdownPos.top, right: dropdownPos.right }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-semibold text-text-primary">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No new alerts</p>
                <p className="text-xs text-text-muted mt-1">
                  We'll notify you when your monitored sites change
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-3 p-4 hover:bg-background transition-colors border-l-2",
                      getAlertColor(alert.alert_type),
                      !alert.read && "bg-neutral-500/5"
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm text-text-primary",
                        !alert.read && "font-medium"
                      )}>
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-text-muted">
                          {new Date(alert.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <Link
                          href={`/reports/${alert.report_id || alert.scan_id}`}
                          className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
                          onClick={() => !alert.read && handleMarkRead(alert.id)}
                        >
                          View report →
                        </Link>
                      </div>
                    </div>
                    {!alert.read && (
                      <button
                        onClick={() => handleMarkRead(alert.id)}
                        disabled={markingRead.has(alert.id)}
                        className="flex-shrink-0 p-1 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="Mark as read"
                      >
                        {markingRead.has(alert.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {alerts.length > 0 && (
            <div className="px-4 py-2 border-t border-border text-center">
              <Link
                href="/dashboard/monitoring"
                className="text-xs text-text-secondary hover:text-neutral-400 transition-colors"
              >
                View all monitoring →
              </Link>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}