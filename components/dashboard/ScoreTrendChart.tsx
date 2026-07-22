'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence, type MotionProps } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

// ── FIX: framer-motion strict types don't expose SVG elements ──
const MotionPath = (motion as any).path as React.FC<MotionProps & React.SVGProps<SVGPathElement>>
const MotionCircle = (motion as any).circle as React.FC<MotionProps & React.SVGProps<SVGCircleElement>>
const MotionG = (motion as any).g as React.FC<MotionProps & React.SVGProps<SVGGElement>>

interface HistoryPoint {
  date: string
  score: number
  total: number
  critical: number
  serious: number
}

export function ScoreTrendChart({ history }: { history: HistoryPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const data = useMemo(() => history, [history])

  const width = 800
  const height = 260
  const padding = { top: 20, right: 30, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const xLabels = useMemo(() => {
    if (data.length <= 2) return data.map((d, i) => ({ index: i, date: d.date }))
    const maxLabels = 6
    const step = Math.max(1, Math.floor((data.length - 1) / (maxLabels - 1)))
    const indices = new Set<number>()
    indices.add(0)
    for (let i = step; i < data.length - 1; i += step) indices.add(i)
    indices.add(data.length - 1)
    return Array.from(indices).map(i => ({ index: i, date: data[i].date }))
  }, [data])

  if (data.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 text-center" style={{ minHeight: height }}>
        <p className="text-sm text-muted-foreground">
          Run your first scan to start tracking your score over time.
        </p>
      </div>
    )
  }

  const isSinglePoint = data.length === 1

  const xScale = (index: number) => {
    if (data.length === 1) return chartWidth / 2
    return (index / (data.length - 1)) * chartWidth
  }

  const yScale = (score: number) =>
    chartHeight - ((score - 0) / (100 - 0)) * chartHeight

  const pathData = data.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.score),
    score: d.score,
    date: d.date,
  }))

  const linePath = pathData.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`
    const prev = arr[i - 1]
    const cp1x = prev.x + (point.x - prev.x) / 3
    const cp1y = prev.y
    const cp2x = prev.x + (2 * (point.x - prev.x)) / 3
    const cp2y = point.y
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`
  }, '')

  const areaPath = isSinglePoint
    ? ''
    : `${linePath} L ${pathData[pathData.length - 1].x} ${chartHeight} L ${pathData[0].x} ${chartHeight} Z`

  const firstScore = data[0].score
  const lastScore = data[data.length - 1].score
  const trend = lastScore - firstScore
  const trendPercent = firstScore > 0 ? ((trend / firstScore) * 100).toFixed(1) : '0'

  const gridLines = [0, 25, 50, 75, 100]

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {lastScore}<span className="text-lg text-muted-foreground">/100</span>
            </p>
            <p className="text-xs text-muted-foreground">Latest Score</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="flex items-center gap-1">
              {trend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend >= 0 ? '+' : ''}{trendPercent}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">vs first scan</p>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feFlood floodColor="#8B5CF6" floodOpacity="0.3" result="glowColor" />
              <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow" />
              <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {gridLines.map((value) => (
            <g key={value}>
              <line
                x1={padding.left}
                y1={padding.top + yScale(value)}
                x2={width - padding.right}
                y2={padding.top + yScale(value)}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={padding.top + yScale(value) + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                style={{ fontSize: '10px' }}
              >
                {value}
              </text>
            </g>
          ))}

          {/* Area fill */}
          {!isSinglePoint && (
            <g transform={`translate(${padding.left}, ${padding.top})`}>
              <MotionPath
                d={areaPath}
                fill="url(#areaGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              />
            </g>
          )}

          {/* Trend line */}
          {!isSinglePoint && (
            <g transform={`translate(${padding.left}, ${padding.top})`}>
              <MotionPath
                key={linePath}
                d={linePath}
                fill="none"
                stroke={trend >= 0 ? '#8B5CF6' : '#EF4444'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
            </g>
          )}

          {/* Data points */}
          {pathData.map((point, i) => (
            <g
              key={i}
              transform={`translate(${padding.left + point.x}, ${padding.top + point.y})`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle r="14" fill="transparent" />
              <MotionCircle
                r={hoveredIndex === i ? 6 : 4}
                fill="hsl(var(--background))"
                stroke={trend >= 0 ? '#8B5CF6' : '#EF4444'}
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
              />

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredIndex === i && (
                  <MotionG
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <rect
                      x={-45}
                      y={-38}
                      width={90}
                      height={26}
                      rx={4}
                      fill="hsl(var(--popover))"
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                    />
                    <text
                      x={0}
                      y={-20}
                      textAnchor="middle"
                      style={{ fontSize: '11px', fontWeight: 500, fill: 'hsl(var(--popover-foreground))' }}
                    >
                      {point.score} — {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </text>
                  </MotionG>
                )}
              </AnimatePresence>
            </g>
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-12 mt-1">
        {xLabels.map(({ index, date }) => (
          <span key={index} className="text-[10px] text-muted-foreground">
            {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>

      {isSinglePoint && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          Run another scan to see your score trend over time.
        </p>
      )}
    </div>
  )
}
