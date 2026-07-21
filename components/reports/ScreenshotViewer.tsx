'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ZoomIn, ZoomOut, Maximize2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScreenshotMarker {
  index: number
  selector: string
  x: number
  y: number
  visible: boolean
}

interface ScreenshotViewerProps {
  screenshot: string | null
  violations: Array<{
    id: string
    impact: string
    description: string
    help: string
    target: string[]
  }>
  /** Real pixel positions computed server-side (see lib/scanner/screenshot.ts). */
  markers?: ScreenshotMarker[]
  /** Full-page screenshot dimensions in pixels, needed to convert marker
   * x/y into percentages that stay accurate at any display size. */
  screenshotWidth?: number
  screenshotHeight?: number
  onMarkerClick?: (index: number) => void
  className?: string
}

export function ScreenshotViewer({
  screenshot,
  violations,
  markers = [],
  screenshotWidth = 0,
  screenshotHeight = 0,
  onMarkerClick,
  className,
}: ScreenshotViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [hoveredMarker, setHoveredMarker] = useState<number | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })

  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setZoom(1)
    setImageLoaded(false)
    setSelectedMarker(null)
  }, [screenshot])

  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.25, 3)), [])
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.25, 1)), [])
  const handleReset = useCallback(() => setZoom(1), [])

  const handleMarkerClick = useCallback((index: number) => {
    setSelectedMarker(prev => (prev === index ? null : index))
    onMarkerClick?.(index)
  }, [onMarkerClick])

  // Width/height to use for percentage math — prefer the server-reported
  // full-page dimensions, fall back to the loaded image's natural size.
  const baseWidth = screenshotWidth || naturalSize.width
  const baseHeight = screenshotHeight || naturalSize.height

  const markerByIndex = new Map(markers.map(m => [m.index, m]))

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-500'
      case 'serious': return 'bg-orange-500'
      case 'moderate': return 'bg-yellow-500'
      case 'minor': return 'bg-blue-400'
      default: return 'bg-gray-400'
    }
  }

  const getImpactRingColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'ring-red-300'
      case 'serious': return 'ring-orange-300'
      case 'moderate': return 'ring-yellow-300'
      case 'minor': return 'ring-blue-300'
      default: return 'ring-gray-300'
    }
  }

  if (!screenshot) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed",
        "border-border bg-card p-8 md:p-12 text-center",
        className
      )}>
        <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-text-muted mb-3" />
        <p className="text-text-secondary text-sm font-medium">
          Screenshot not available for this scan
        </p>
        <p className="text-text-muted text-xs mt-1">
          The page may have blocked screenshot capture or timed out.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Visual Report
          </span>
          <span className="text-xs text-text-muted">
            {markers.filter(m => m.visible).length} of {violations.length} violation{violations.length !== 1 ? 's' : ''} located on page
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className={cn(
              "p-2 rounded-lg transition-colors",
              zoom <= 1 ? "text-text-muted cursor-not-allowed" : "text-text-secondary hover:bg-border hover:text-text-primary"
            )}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-text-secondary w-12 text-center">
            {zoom.toFixed(1)}x
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className={cn(
              "p-2 rounded-lg transition-colors",
              zoom >= 3 ? "text-text-muted cursor-not-allowed" : "text-text-secondary hover:bg-border hover:text-text-primary"
            )}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-text-secondary hover:bg-border hover:text-text-primary transition-colors"
            aria-label="Reset view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={cn(
              "p-2 rounded-lg transition-colors ml-1",
              isFullscreen ? "bg-neutral-500/20 text-neutral-400" : "text-text-secondary hover:bg-border hover:text-text-primary"
            )}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/*
        Image container — scrolls in both directions instead of squishing
        the full-page screenshot to fit a fixed box. A full-page capture is
        often 3-6x taller than it is wide; the old "object-contain" approach
        shrank the whole thing down to fit a ~400px-tall box, which is why
        it looked tiny (worst on mobile, where the box is shortest).
        Now the image renders at its natural width (scaled to container
        width) and the container scrolls vertically to see the rest.
      */}
      <div
        className={cn(
          "relative overflow-auto rounded-xl border border-border bg-card",
          isFullscreen && "fixed inset-0 z-50 rounded-none border-0 bg-black"
        )}
        style={{
          maxHeight: isFullscreen ? '100vh' : '75vh',
        }}
      >
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
            aria-label="Close fullscreen"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div
          className="relative"
          style={{
            width: `${100 * zoom}%`,
            minWidth: '100%',
          }}
        >
          <img
            ref={imageRef}
            src={screenshot}
            alt="Full-page screenshot of the scanned site with violation markers"
            className="block w-full h-auto"
            draggable={false}
            onLoad={(e) => {
              setImageLoaded(true)
              setNaturalSize({
                width: (e.target as HTMLImageElement).naturalWidth,
                height: (e.target as HTMLImageElement).naturalHeight,
              })
            }}
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />

          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center min-h-[300px]">
              <div className="w-10 h-10 border-3 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {/* Violation markers — placed at their REAL position on the page,
              as a percentage of the full screenshot size, so they land in
              the right spot regardless of zoom or container width. */}
          {imageLoaded && baseWidth > 0 && baseHeight > 0 && violations.map((v, i) => {
            const marker = markerByIndex.get(i)
            if (!marker || !marker.visible) return null

            const isHovered = hoveredMarker === i
            const isSelected = selectedMarker === i
            const leftPct = (marker.x / baseWidth) * 100
            const topPct = (marker.y / baseHeight) * 100

            return (
              <button
                key={`${v.id}-${i}`}
                onClick={(e) => { e.stopPropagation(); handleMarkerClick(i) }}
                onMouseEnter={() => setHoveredMarker(i)}
                onMouseLeave={() => setHoveredMarker(null)}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 z-10",
                  "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center",
                  "text-white text-xs md:text-sm font-bold border-2 border-white shadow-lg",
                  "transition-transform duration-150 hover:scale-125",
                  "focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2",
                  getImpactColor(v.impact),
                  (isHovered || isSelected) && "scale-125 z-50 ring-2 ring-offset-2",
                  (isHovered || isSelected) && getImpactRingColor(v.impact)
                )}
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                aria-label={`Violation ${i + 1}: ${v.help}`}
              >
                {i + 1}

                {(isHovered || isSelected) && (
                  <div className={cn(
                    "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
                    "w-56 md:w-72 p-3 rounded-lg bg-black/90 text-white text-xs text-left",
                    "pointer-events-none z-50 shadow-xl backdrop-blur-sm"
                  )}>
                    <p className="font-semibold mb-1">{v.help}</p>
                    <p className="text-white/70 text-[10px] md:text-xs line-clamp-3">{v.description}</p>
                    <div className={cn(
                      "mt-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                      v.impact === 'critical' && "bg-red-500/30 text-red-300",
                      v.impact === 'serious' && "bg-orange-500/30 text-orange-300",
                      v.impact === 'moderate' && "bg-yellow-500/30 text-yellow-300",
                      v.impact === 'minor' && "bg-blue-400/30 text-blue-300",
                    )}>
                      {v.impact}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {markers.some(m => !m.visible) && (
        <p className="text-[10px] text-text-muted">
          {markers.filter(m => !m.visible).length} violation{markers.filter(m => !m.visible).length !== 1 ? 's' : ''} could not be located on the captured page (dynamic content, off-screen, or hidden elements) and aren't shown as markers.
        </p>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-text-muted">Impact:</span>
        {[
          { label: 'Critical', color: 'bg-red-500', text: 'text-red-400' },
          { label: 'Serious', color: 'bg-orange-500', text: 'text-orange-400' },
          { label: 'Moderate', color: 'bg-yellow-500', text: 'text-yellow-400' },
          { label: 'Minor', color: 'bg-blue-400', text: 'text-blue-400' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
            <span className={cn("text-text-secondary", item.text)}>{item.label}</span>
          </span>
        ))}
      </div>

      {/* Mobile selected violation panel */}
      {selectedMarker !== null && violations[selectedMarker] && (
        <div className="md:hidden bg-surface border border-border rounded-lg p-3 mt-2">
          <div className="flex items-start gap-2">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5",
              violations[selectedMarker].impact === 'critical' && "bg-red-500/20 text-red-400",
              violations[selectedMarker].impact === 'serious' && "bg-orange-500/20 text-orange-400",
              violations[selectedMarker].impact === 'moderate' && "bg-yellow-500/20 text-yellow-400",
              violations[selectedMarker].impact === 'minor' && "bg-blue-400/20 text-blue-400",
            )}>
              {violations[selectedMarker].impact}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium">{violations[selectedMarker].help}</p>
              <p className="text-text-muted text-xs mt-0.5">{violations[selectedMarker].description}</p>
            </div>
            <button onClick={() => setSelectedMarker(null)} className="text-text-muted hover:text-text-primary p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}