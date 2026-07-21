/**
 * WCAG Scanner — Screenshot Engine
 *
 * Takes a clean full-page screenshot and computes the real pixel position
 * of every violation's DOM element. Markers are NOT drawn into the image
 * itself — the frontend (ScreenshotViewer) draws them as an interactive
 * overlay using these coordinates converted to percentages.
 */

import { Page } from 'puppeteer-core'

export interface ScreenshotMarker {
  index: number
  selector: string
  x: number
  y: number
  visible: boolean
}

export interface AnnotatedScreenshotResult {
  base64Png: string | null
  markers: ScreenshotMarker[]
  width: number
  height: number
}

/**
 * Takes a full-page screenshot of an ALREADY LOADED page and returns
 * real element positions for each violation.
 *
 * CRITICAL: This function does NOT navigate. The page must already be
 * at the target URL with content loaded. This prevents cascading timeouts
 * when the target site is slow.
 *
 * @param page - Puppeteer Page instance, ALREADY navigated to target URL
 * @param violations - Violations with `target` CSS selectors
 */
export async function takeAnnotatedScreenshot(
  page: Page,
  violations: Array<{ target: string[]; id: string; impact: string }>
): Promise<AnnotatedScreenshotResult> {
  try {
    // Ensure viewport is set correctly before screenshot
    const viewport = page.viewport()
    if (!viewport || viewport.width < 100) {
      await page.setViewport({ width: 1280, height: 720 })
    }

    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))

    const markers = await page.evaluate(
      (violationData: Array<{ target: string[]; index: number }>) => {
        const found: Array<{ index: number; selector: string; x: number; y: number; visible: boolean }> = []

        violationData.forEach((v) => {
          if (!v.target || v.target.length === 0) return
          const selector = v.target[0]

          try {
            const el = document.querySelector(selector) as HTMLElement | null
            if (!el) {
              found.push({ index: v.index, selector, x: 0, y: 0, visible: false })
              return
            }

            const rect = el.getBoundingClientRect()
            const x = rect.left + (window.scrollX || window.pageXOffset) + rect.width / 2
            const y = rect.top + (window.scrollY || window.pageYOffset) + rect.height / 2

            const visible = rect.width > 0 && rect.height > 0 && x >= 0 && y >= 0
            found.push({ index: v.index, selector, x, y, visible })
          } catch {
            found.push({ index: v.index, selector, x: 0, y: 0, visible: false })
          }
        })

        return found
      },
      violations.map((v, i) => ({ target: v.target, index: i }))
    )

    const base64 = await page.screenshot({ fullPage: true, encoding: 'base64' })

    return {
      base64Png: `data:image/png;base64,${base64}`,
      markers,
      width: dimensions.width,
      height: dimensions.height,
    }
  } catch (err) {
    console.error('[SCREENSHOT] Failed:', (err as Error).message)

    // Last resort: try plain screenshot without markers
    try {
      const plainBase64 = await page.screenshot({ fullPage: true, encoding: 'base64' })
      return { base64Png: `data:image/png;base64,${plainBase64}`, markers: [], width: 0, height: 0 }
    } catch {
      return { base64Png: null, markers: [], width: 0, height: 0 }
    }
  }
}

export async function takeThumbnailScreenshot(page: Page): Promise<string | null> {
  try {
    const base64 = await page.screenshot({ fullPage: false, encoding: 'base64' })
    return `data:image/png;base64,${base64}`
  } catch (err) {
    console.warn('[SCREENSHOT] Thumbnail failed:', (err as Error).message)
    return null
  }
}