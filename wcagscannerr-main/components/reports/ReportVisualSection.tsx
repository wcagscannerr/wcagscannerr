'use client'

import { ScreenshotViewer } from './ScreenshotViewer'

interface ViolationLite {
  id: string
  impact: string
  description: string
  help: string
  target: string[]
}

interface ScreenshotMarker {
  index: number
  selector: string
  x: number
  y: number
  visible: boolean
}

interface Props {
  screenshot: string | null
  violations: ViolationLite[]
  markers?: ScreenshotMarker[]
  screenshotWidth?: number
  screenshotHeight?: number
}

export function ReportVisualSection({ screenshot, violations, markers, screenshotWidth, screenshotHeight }: Props) {
  const handleMarkerClick = (index: number) => {
    const el = document.getElementById(`violation-${index}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (!screenshot) return null

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-text-primary mb-4">
        Visual Report
      </h2>
      <ScreenshotViewer
        screenshot={screenshot}
        violations={violations}
        markers={markers}
        screenshotWidth={screenshotWidth}
        screenshotHeight={screenshotHeight}
        onMarkerClick={handleMarkerClick}
      />
    </div>
  )
}