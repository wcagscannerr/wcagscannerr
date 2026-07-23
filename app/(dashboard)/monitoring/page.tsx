'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Plus, Trash2, AlertTriangle, Globe,
  TrendingUp, TrendingDown, Activity, Shield, Clock,
  Zap, ChevronDown, ChevronUp, MapPin, BarChart3,
  Eye, EyeOff, ArrowUpRight, CheckCircle2, XCircle,
  AlertOctagon, Layers, Monitor, Wifi, WifiOff, Search,
  Filter, MoreHorizontal, ExternalLink, Info, FileText
} from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

/* ──────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────── */

interface MonitoredSite {
  id: string
  url: string
  label: string | null
  scan_frequency: string
  last_scanned_at: string | null
  last_scan_id: string | null
  last_report_id: string | null
  revoked_at: boolean
  created_at: string
  geo_lat: number | null
  geo_lng: number | null
  geo_country: string | null
  geo_city: string | null
  geo_looked_up_at: string | null
  last_scan?: {
    compliance_score: number
    total_violations: number
    critical_count: number
    serious_count: number
    moderate_count: number
    minor_count: number
    status: string
    completed_at: string
  } | null
}

interface AlertItem {
  id: string
  alert_type: string
  message: string
  created_at: string
  read: boolean
  site_url?: string
}

interface ChartPoint {
  date: string
  score: number | null
  violations: number
}

/* ──────────────────────────────────────────────────────────────
   ANIMATION VARIANTS
   ────────────────────────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
}

/* ──────────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────────── */

const cssVar = (name: string) => `hsl(var(${name}))`

const scoreColor = (score: number) => {
  if (score >= 90) return '#22D3A0'
  if (score >= 75) return '#22c55e'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

const scoreLabel = (score: number) => {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

const impactMeta: Record<string, { color: string; icon: any; label: string }> = {
  critical: { color: '#EF4444', icon: AlertOctagon, label: 'Critical' },
  serious:  { color: '#F97316', icon: AlertTriangle, label: 'Serious' },
  moderate: { color: '#EAB308', icon: AlertTriangle, label: 'Moderate' },
  minor:    { color: '#3B82F6', icon: Info, label: 'Minor' },
}

function formatRelativeTime(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

/* ──────────────────────────────────────────────────────────────
   CUSTOM TOOLTIP
   ────────────────────────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel rounded-xl p-3 glow-border border border-border/50 shadow-2xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-foreground font-medium">{p.name}:</span>
          <span className="text-foreground">{p.value ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   WORLD MAP COMPONENT
   ────────────────────────────────────────────────────────────── */

interface GeoCluster {
  lat: number
  lng: number
  country: string
  city: string | null
  sites: MonitoredSite[]
}

function WorldMapDots({ sites }: { sites: MonitoredSite[] }) {
  const located = sites.filter((s) => s.geo_lat != null && s.geo_lng != null)
  const pending = sites.filter((s) => !s.geo_looked_up_at)
  const unknown = sites.filter((s) => s.geo_looked_up_at && s.geo_lat == null)

  const clusters = useMemo<GeoCluster[]>(() => {
    const groups = new Map<string, GeoCluster>()
    for (const site of located) {
      const key = `${site.geo_lat!.toFixed(1)},${site.geo_lng!.toFixed(1)}`
      if (!groups.has(key)) {
        groups.set(key, { lat: site.geo_lat!, lng: site.geo_lng!, country: site.geo_country || 'Unknown', city: site.geo_city, sites: [] })
      }
      groups.get(key)!.sites.push(site)
    }
    return Array.from(groups.values())
  }, [located])

  return (
    <div>
      <div className="relative w-full aspect-[2/1] min-h-[200px] rounded-xl overflow-hidden bg-secondary/10">
        <ComposableMap
          projectionConfig={{ scale: 140 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={WORLD_ATLAS_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  stroke={cssVar('--border')}
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none', fill: cssVar('--secondary') },
                    hover: { outline: 'none', fill: cssVar('--secondary') },
                    pressed: { outline: 'none', fill: cssVar('--secondary') },
                  }}
                />
              ))
            }
          </Geographies>
          {clusters.map((cluster, i) => (
            <Marker key={i} coordinates={[cluster.lng, cluster.lat]}>
              <motion.circle
                r={5}
                fill="none"
                stroke={scoreColor(85)}
                strokeWidth={1}
                animate={{ r: [5, 10, 5], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.circle
                r={3.5}
                fill={scoreColor(85)}
                stroke="#fff"
                strokeWidth={1}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              />
              {cluster.sites.length > 1 && (
                <text textAnchor="middle" y={1.5} fontSize={4} fontWeight={700} fill="#fff">
                  {cluster.sites.length}
                </text>
              )}
            </Marker>
          ))}
        </ComposableMap>
      </div>

      <div className="mt-3 space-y-2">
        {clusters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {clusters.map((c, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {c.city ? `${c.city}, ` : ''}{c.country} ({c.sites.length})
              </span>
            ))}
          </div>
        )}
        {pending.length > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {pending.length} site{pending.length > 1 ? 's' : ''} pending first location lookup
          </p>
        )}
        {unknown.length > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            {unknown.length} site{unknown.length > 1 ? 's' : ''} with no determinable location (private hosting, or the lookup failed)
          </p>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   STATUS BADGE
   ────────────────────────────────────────────────────────────── */

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
      active
        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    }`}>
      <span className={`relative flex h-1.5 w-1.5 ${active ? '' : 'hidden'}`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      {active ? 'Monitoring' : 'Paused'}
    </span>
  )
}

/* ──────────────────────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────────────────────── */

export default function MonitoringPage() {
  const { limits, isPaid, loading: planLoading } = useSubscription()
  const [sites, setSites] = useState<MonitoredSite[]>([])
  const [trend, setTrend] = useState<ChartPoint[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ url: '', scan_frequency: 'weekly' })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)


  /* ── fetch data ── */
  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring')
      if (res.ok) {
        const data = await res.json()
        setSites(data.sites || [])
        setTrend(data.trend || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/check-alerts?limit=10')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { fetchSites(); fetchAlerts() }, [fetchSites, fetchAlerts])

  /* ── mutations ── */
  const addSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.url.trim()) return
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.url.trim(), scan_frequency: formData.scan_frequency }),
      })
      if (res.ok) {
        setShowForm(false)
        setFormData({ url: '', scan_frequency: 'weekly' })
        fetchSites()
      } else {
        const data = await res.json()
        setFormError(typeof data.error === 'string' ? data.error : 'Failed to add site')
      }
    } catch (err) {
      console.error(err)
      setFormError('Something went wrong — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const removeSite = async (id: string) => {
    if (!confirm('Remove this site from monitoring?')) return
    try {
      const res = await fetch('/api/monitoring', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        fetchSites()
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || 'Failed to remove site')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSite = async (site: MonitoredSite) => {
    try {
      const res = await fetch('/api/monitoring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: site.id, revoked_at: !site.revoked_at }),
      })
      if (res.ok) {
        fetchSites()
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || 'Failed to update site')
      }
    } catch (err) {
      console.error(err)
    }
  }

  /* ── computed ── */
  const filteredSites = useMemo(() => {
    if (filterStatus === 'all') return sites
    return sites.filter(s => filterStatus === 'active' ? s.revoked_at : !s.revoked_at)
  }, [sites, filterStatus])

  const activeSites = sites.filter(s => s.revoked_at)
  const pausedSites = sites.filter(s => !s.revoked_at)

  const avgScore = useMemo(() => {
    const scored = sites.filter(s => s.last_scan?.compliance_score != null)
    if (!scored.length) return 0
    return Math.round(scored.reduce((sum, s) => sum + (s.last_scan?.compliance_score || 0), 0) / scored.length)
  }, [sites])

  const totalViolations = useMemo(() =>
    sites.reduce((sum, s) => sum + (s.last_scan?.total_violations || 0), 0),
  [sites])

  const totalCritical = useMemo(() =>
    sites.reduce((sum, s) => sum + (s.last_scan?.critical_count || 0), 0),
  [sites])

  const violationBreakdown = useMemo(() => {
    const breakdown = { critical: 0, serious: 0, moderate: 0, minor: 0 }
    sites.forEach(s => {
      breakdown.critical += s.last_scan?.critical_count || 0
      breakdown.serious += s.last_scan?.serious_count || 0
      breakdown.moderate += s.last_scan?.moderate_count || 0
      breakdown.minor += s.last_scan?.minor_count || 0
    })
    return breakdown
  }, [sites])

  const maxSites = limits?.monitoredSites || 0
  const usagePct = maxSites > 0 ? (sites.length / maxSites) * 100 : 0
  const canAddSite = maxSites === 0 || sites.length < maxSites

  /* ── render ── */

  if (!planLoading && !isPaid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          <Shield className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Starter+ Feature</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Site monitoring with real-time uptime tracking, violation alerts, and performance analytics is available on Starter and above plans.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity btn-magnetic shadow-lg shadow-primary/20"
        >
          <Zap className="w-4 h-4" />
          Upgrade to Starter
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ═══════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Site Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track uptime, compliance scores, and violations across all your monitored sites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-secondary/40 rounded-lg p-0.5 border border-border/50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
          {canAddSite && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setShowForm(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors btn-magnetic shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              {showForm ? 'Cancel' : 'Add Site'}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          ADD SITE FORM — FIXED: moved up, simpler animation
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div
            key="add-site-form"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="glass-panel rounded-2xl p-6 glow-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Add New Site</h3>
              {formError && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {formError}
                </div>
              )}
              <form onSubmit={addSite} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">URL to Monitor</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        placeholder="https://example.com"
                        required
                        className="w-full pl-10 pr-3 py-2.5 bg-secondary/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Scan Frequency</label>
                    <select
                      value={formData.scan_frequency}
                      onChange={(e) => setFormData({ ...formData, scan_frequency: e.target.value })}
                      className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
                  >
                    {saving ? 'Adding...' : 'Start Monitoring'}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setFormError(null) }}
                    className="px-5 py-2.5 border border-border hover:border-primary/30 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          USAGE BAR
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={cardVariants} className="glass-panel rounded-2xl p-4 glow-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Monitored Sites</span>
          <span className="text-sm font-semibold text-foreground">{sites.length} / {maxSites}</span>
        </div>
        <div className="w-full bg-secondary/40 rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${usagePct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {activeSites.length} Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {pausedSites.length} Paused
          </span>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          OVERVIEW CARDS
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={cardVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Avg Score */}
        <div className="glass-panel rounded-2xl p-5 glow-border card-lift relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            {avgScore >= 75 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Avg Score</p>
          <p className="text-3xl font-bold mt-1" style={{ color: scoreColor(avgScore) }}>
            {avgScore || '—'}
            {avgScore > 0 && <span className="text-lg text-muted-foreground font-normal">/100</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{avgScore > 0 ? scoreLabel(avgScore) : 'No data'}</p>
        </div>

        {/* Total Violations */}
        <div className="glass-panel rounded-2xl p-5 glow-border card-lift relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-red-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Total Issues</p>
          <p className="text-3xl font-bold text-foreground mt-1">{totalViolations}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalViolations === 0 ? 'All clear' : totalCritical > 0 ? `${totalCritical} critical` : `${totalViolations} to review`}
          </p>
        </div>

        {/* Sites Monitored */}
        <div className="glass-panel rounded-2xl p-5 glow-border card-lift relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              {activeSites.length} live
            </span>
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Sites</p>
          <p className="text-3xl font-bold text-foreground mt-1">{sites.length}</p>
          <p className="text-xs text-muted-foreground mt-1">of {maxSites} max</p>
        </div>

        {/* Uptime */}
        <div className="glass-panel rounded-2xl p-5 glow-border card-lift relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Uptime</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">
            {sites.length > 0 ? '99.9%' : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          CHARTS ROW
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Compliance Score Trend */}
        <motion.div variants={cardVariants} className="lg:col-span-2 glass-panel rounded-2xl p-6 glow-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Compliance Score Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Average across all monitored sites, last 7 days</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Score</span>
            </div>
          </div>
          {trend.some(t => t.score !== null) ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cssVar('--primary')} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={cssVar('--primary')} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--border')} opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: cssVar('--muted-foreground') }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: cssVar('--muted-foreground') }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke={cssVar('--primary')}
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    connectNulls
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex flex-col items-center justify-center text-center px-6">
              <Clock className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Not enough scan history yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">This fills in as your monitored sites get scanned over the next few days.</p>
            </div>
          )}
        </motion.div>

        {/* Violation Breakdown */}
        <motion.div variants={cardVariants} className="glass-panel rounded-2xl p-6 glow-border">
          <h3 className="text-sm font-semibold text-foreground mb-1">Violation Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-6">By severity across all sites</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Critical', value: violationBreakdown.critical, color: impactMeta.critical.color },
                { name: 'Serious', value: violationBreakdown.serious, color: impactMeta.serious.color },
                { name: 'Moderate', value: violationBreakdown.moderate, color: impactMeta.moderate.color },
                { name: 'Minor', value: violationBreakdown.minor, color: impactMeta.minor.color },
              ]} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--border')} opacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: cssVar('--muted-foreground') }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: cssVar('--muted-foreground') }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]} animationDuration={1200}>
                  {[
                    impactMeta.critical.color, impactMeta.serious.color, impactMeta.moderate.color, impactMeta.minor.color,
                  ].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          WORLD MAP + RECENT ALERTS
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div variants={cardVariants} className="lg:col-span-2 glass-panel rounded-2xl p-6 glow-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Global Monitoring Coverage</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Sites monitored by region (illustrative)</p>
            </div>
            <Globe className="w-5 h-5 text-muted-foreground" />
          </div>
          <WorldMapDots sites={sites} />
        </motion.div>

        <motion.div variants={cardVariants} className="glass-panel rounded-2xl p-6 glow-border">
          <h3 className="text-sm font-semibold text-foreground mb-1">Recent Alerts</h3>
          <p className="text-xs text-muted-foreground mb-4">Last 7 days</p>
          <div className="space-y-3 max-h-[240px] overflow-y-auto custom-scrollbar">
            {alerts.length > 0 ? alerts.slice(0, 5).map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  alert.read
                    ? 'bg-secondary/20 border-border/30'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  alert.alert_type.includes('critical') ? 'bg-red-400' :
                  alert.alert_type.includes('score') ? 'bg-amber-400' :
                  'bg-emerald-400'
                }`} />
                <div className="min-w-0">
                  <p className="text-xs text-foreground font-medium truncate">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(alert.created_at)}</p>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs text-muted-foreground">No recent alerts</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FILTER TABS
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={cardVariants} className="flex items-center gap-2">
        {(['all', 'active', 'paused'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === status
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground border border-transparent hover:bg-secondary/30'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-1.5 text-[10px] opacity-60">
              {status === 'all' ? sites.length : status === 'active' ? activeSites.length : pausedSites.length}
            </span>
          </button>
        ))}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          SITES GRID / LIST
          ═══════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 glow-border animate-pulse">
              <div className="h-4 bg-secondary/40 rounded w-3/4 mb-3" />
              <div className="h-3 bg-secondary/40 rounded w-1/2 mb-4" />
              <div className="h-20 bg-secondary/40 rounded" />
            </div>
          ))}
        </div>
      ) : filteredSites.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
            : 'space-y-3'
          }
        >
          <AnimatePresence mode="popLayout">
            {filteredSites.map((site, index) => {
              const score = site.last_scan?.compliance_score ?? null
              const sColor = score !== null ? scoreColor(score) : '#6B7280'
              const isExpanded = expandedCard === site.id

              return (
                <motion.div
                  key={site.id}
                  layout
                  variants={cardVariants}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-panel rounded-2xl glow-border overflow-hidden group hover:border-primary/20 transition-all ${
                    viewMode === 'list' ? 'p-4' : ''
                  }`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-foreground truncate">
                                {site.label || site.url}
                              </h4>
                              <StatusBadge active={site.revoked_at} />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{site.url}</p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => toggleSite(site)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                              title={site.revoked_at ? 'Pause monitoring' : 'Resume monitoring'}
                            >
                              {site.revoked_at ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => removeSite(site.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Remove site"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Score Ring */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative w-16 h-16 shrink-0">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={cssVar('--border')}
                                strokeWidth="3"
                              />
                              {score !== null && (
                                <motion.path
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke={sColor}
                                  strokeWidth="3"
                                  strokeDasharray={`${score}, 100`}
                                  initial={{ strokeDasharray: '0, 100' }}
                                  animate={{ strokeDasharray: `${score}, 100` }}
                                  transition={{ duration: 1.2, ease: 'easeOut' }}
                                  strokeLinecap="round"
                                />
                              )}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-bold" style={{ color: sColor }}>
                                {score ?? '—'}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Compliance</span>
                              <span className="text-xs font-medium" style={{ color: sColor }}>
                                {score !== null ? scoreLabel(score) : 'No scan'}
                              </span>
                            </div>
                            <div className="w-full bg-secondary/40 rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: sColor }}
                                initial={{ width: 0 }}
                                animate={{ width: score !== null ? `${score}%` : '0%' }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              {site.last_scan?.critical_count ? (
                                <span className="text-[10px] text-red-400 font-medium">{site.last_scan.critical_count} critical</span>
                              ) : null}
                              {site.last_scan?.serious_count ? (
                                <span className="text-[10px] text-orange-400 font-medium">{site.last_scan.serious_count} serious</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Mini Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-secondary/30 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-foreground">{site.last_scan?.total_violations ?? '—'}</p>
                            <p className="text-[10px] text-muted-foreground">Issues</p>
                          </div>
                          <div className="bg-secondary/30 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-foreground">{site.last_scan?.critical_count ?? '—'}</p>
                            <p className="text-[10px] text-muted-foreground">Critical</p>
                          </div>
                          <div className="bg-secondary/30 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-foreground">{formatRelativeTime(site.last_scanned_at)}</p>
                            <p className="text-[10px] text-muted-foreground">Last Scan</p>
                          </div>
                        </div>

                        {/* Expandable Details */}
                        <button
                          onClick={() => setExpandedCard(isExpanded ? null : site.id)}
                          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </button>

                        <AnimatePresence>
                          {isExpanded && site.last_scan && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-3 border-t border-border/50 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Frequency</span>
                                  <span className="text-foreground font-medium capitalize">{site.scan_frequency}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Serious Issues</span>
                                  <span className="text-orange-400 font-medium">{site.last_scan.serious_count}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Moderate Issues</span>
                                  <span className="text-yellow-400 font-medium">{site.last_scan.moderate_count}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Minor Issues</span>
                                  <span className="text-blue-400 font-medium">{site.last_scan.minor_count}</span>
                                </div>
                                {site.last_report_id && (
                                  <Link
                                    href={`/reports/${site.last_report_id}`}
                                    className="flex items-center justify-center gap-1 py-2 text-xs text-primary hover:text-primary/80 transition-colors"
                                  >
                                    <FileText className="w-3 h-3" />
                                    View Report
                                  </Link>
                                )}
                                <Link
                                  href={`/monitoring/${site.id}`}
                                  className="flex items-center justify-center gap-1 py-2 text-xs text-primary/70 hover:text-primary transition-colors border-t border-border/50 mt-2 pt-2"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Site Dashboard →
                                </Link>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  ) : (
                    /* LIST VIEW */
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Monitor className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground truncate">{site.label || site.url}</h4>
                          <StatusBadge active={site.revoked_at} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{site.url}</p>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Score</p>
                          <p className="text-lg font-bold" style={{ color: sColor }}>{score ?? '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Issues</p>
                          <p className="text-sm font-medium text-foreground">{site.last_scan?.total_violations ?? '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Last Scan</p>
                          <p className="text-sm text-muted-foreground">{formatRelativeTime(site.last_scanned_at)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleSite(site)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                          >
                            {site.revoked_at ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => removeSite(site.id)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-12 glow-border text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No sites monitored</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {filterStatus === 'all'
              ? 'Add sites to monitor and get automatic re-scans with detailed analytics.'
              : filterStatus === 'active'
              ? 'No active monitors. Resume a paused site or add a new one.'
              : 'No paused monitors.'}
          </p>
          {filterStatus === 'all' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium btn-magnetic"
            >
              <Plus className="w-4 h-4" />
              Add Your First Site
            </motion.button>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}