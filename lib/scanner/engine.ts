/**
 * WCAG Scanner Engine — v2.2 (Clean: axe-core only + new scoring)
 */

import puppeteer, { Browser, Page, Frame, Viewport } from 'puppeteer'
import chromium from '@sparticuz/chromium-min'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

declare global {
  interface Window {
    axe: any
  }
}

export interface ViolationNode {
  html: string
  target: string[]
  failureSummary: string
}

export interface Violation {
  id: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help: string
  helpUrl: string
  target: string[]
  nodes: ViolationNode[]
  nodeCount: number
  tags: string[]
  page_url?: string
  frame_source?: string
}

export interface KeyboardIssue {
  type: 'focus-trap' | 'focus-loss' | 'missing-skip-link' | 'skipped-heading'
      | 'positive-tabindex' | 'missing-focus-indicator' | 'clickable-not-focusable'
      | 'aria-hidden-focusable' | 'duplicate-focusable-id' | 'iframe-no-title'
  element: string
  description: string
}

export interface ViewportBreakdown {
  mobile: { score: number; violations: number }
  tablet: { score: number; violations: number }
  desktop: { score: number; violations: number }
}

export interface BigSixCounts {
  contrast: number
  altText: number
  labels: number
  links: number
  buttons: number
  language: number
}

export interface ScanEngineResult {
  url: string
  score: number
  violations: Violation[]
  passes: number
  totalViolations: number
  hasOverlayWidget: boolean
  critical: number
  serious: number
  moderate: number
  minor: number
  bigSix: BigSixCounts
  keyboardIssues?: KeyboardIssue[]
  annotatedScreenshot?: string | null
  viewportBreakdown?: ViewportBreakdown
}

export interface ScanOptions {
  useResponsive?: boolean
  viewport?: Viewport
}

export interface PageResultLite {
  url: string
  score: number
  violations: { id: string; impact: string; help: string }[]
  critical: number
  serious: number
  moderate: number
  minor: number
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const VIEWPORTS: { name: 'mobile' | 'tablet' | 'desktop'; viewport: Viewport }[] = [
  { name: 'mobile', viewport: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'tablet', viewport: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: false, hasTouch: true } },
  { name: 'desktop', viewport: { width: 1280, height: 720, deviceScaleFactor: 1, isMobile: false, hasTouch: false } },
]

const OVERLAY_SELECTORS = [
  '[class*="accessibe"]', '[id*="accessibe"]',
  '[class*="userway"]', '[id*="userway"]',
  '[class*="accessibility-widget"]',
  'script[src*="accessibe"]', 'script[src*="userway"]',
]

const CONSENT_BANNER_SELECTORS = [
  '[id*="cookie"][class*="banner"]', '[class*="cookie-banner"]',
  '[id*="consent"]', '[class*="consent"]',
  '[id*="gdpr"]', '[class*="gdpr"]',
  '[aria-label*="cookie" i]', '[aria-label*="consent" i]',
]

const CONSENT_ACCEPT_BUTTONS = [
  'button:has-text("Accept")', 'button:has-text("Accept All")',
  'button:has-text("I Agree")', 'button:has-text("Got it")',
  '[id*="accept"]', '[class*="accept"]',
]

// ──────────────────────────────────────────────
// Browser Lifecycle
// ──────────────────────────────────────────────

async function getExecutablePath(): Promise<string> {
  return chromium.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar'
  )
}

let cachedExecutablePath: string | null = null
let executablePathPromise: Promise<string> | null = null

async function resolveExecutablePath(): Promise<string> {
  if (cachedExecutablePath) return cachedExecutablePath
  if (!executablePathPromise) {
    executablePathPromise = getExecutablePath()
      .then((path) => {
        cachedExecutablePath = path
        return path
      })
      .catch((err) => {
        executablePathPromise = null
        throw err
      })
  }
  return executablePathPromise
}

export async function launchBrowser(): Promise<Browser> {
  const executablePath = await resolveExecutablePath()
  return puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    executablePath,
    headless: true,
  })
}

// ──────────────────────────────────────────────
// Core: runScan
// ──────────────────────────────────────────────

export async function runScan(
  url: string,
  wcagVersion: string = '2.1',
  options: ScanOptions = {},
  externalBrowser?: Browser
): Promise<ScanEngineResult> {
  const { useResponsive = false, viewport } = options

  if (useResponsive) {
    return await runResponsiveScan(url, wcagVersion, externalBrowser)
  }

  const browser = externalBrowser || await launchBrowser()
  const shouldCloseBrowser = !externalBrowser
  let page: Page | undefined

  try {
    page = await browser.newPage()
    await page.setBypassCSP(true)

    if (viewport) {
      await page.setViewport(viewport)
    } else {
      await page.setViewport({ width: 1280, height: 720 })
    }

    // ── Timeout resilience: continue with partial load ──
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
    } catch (navErr: any) {
      if (navErr?.message?.includes('timeout') || navErr?.name === 'TimeoutError') {
        console.warn(`[ENGINE] Navigation timeout on main scan, continuing with partial load`)
      } else {
        throw navErr
      }
    }

    await waitForDomStabilization(page, 500, 10000)
    await dismissConsentBanners(page)

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js',
    })
    await page.waitForFunction(
      'typeof window.axe !== "undefined"',
      { timeout: 10000 }
    )

    // 'best-practice' is included alongside the strict WCAG tags because
    // that's where axe-core puts most of its moderate/minor-severity
    // rules (landmark-one-main, region, empty-heading, duplicate-id,
    // etc). The rules carrying literal WCAG tags skew heavily toward
    // critical/serious (missing alt text, contrast, labels are all rated
    // critical/serious by Deque) - without best-practice, moderate/minor
    // counts came back near-zero on virtually every site, not because
    // nothing was found but because those checks never ran at all.
    const runOnlyTags = wcagVersion === '2.2'
      ? ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
      : ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

    const allViolations: Violation[] = []
    let totalPasses = 0

    const mainResult = await runAxeInFrame(page.mainFrame(), runOnlyTags, 'main')
    allViolations.push(...mainResult.violations)
    totalPasses += mainResult.passes

    const frames = page.frames()
    for (const frame of frames) {
      if (frame === page.mainFrame()) continue
      try {
        await frame.addScriptTag({
          url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js',
        })
        await frame.waitForFunction(
          'typeof window.axe !== "undefined"',
          { timeout: 5000 }
        )
        const frameResult = await runAxeInFrame(frame, runOnlyTags, frame.url())
        allViolations.push(...frameResult.violations)
        totalPasses += frameResult.passes
      } catch (frameErr) {
        console.warn(`[ENGINE] iframe scan failed for ${frame.url()}:`, (frameErr as Error).message)
      }
    }

    const hasOverlayWidget = await detectOverlayWidget(page)
    const keyboardIssues = await testKeyboardNavigation(page)
      const { score, critical, serious, moderate, minor } = computeScore(allViolations, totalPasses)
    const bigSix = computeBigSix(allViolations)

    return {
      url,
      score,
      violations: allViolations,
      passes: totalPasses,
      totalViolations: critical + serious + moderate + minor,
      hasOverlayWidget,
      critical,
      serious,
      moderate,
      minor,
      bigSix,
      keyboardIssues,
      annotatedScreenshot: null,
    }

  } finally {
    if (page) {
      await page.close().catch(() => {})
    }
    if (shouldCloseBrowser) {
      await browser.close()
    }
  }
}

// ──────────────────────────────────────────────
// Responsive Scan
// ──────────────────────────────────────────────

export async function runResponsiveScan(
  url: string,
  wcagVersion: string = '2.1',
  externalBrowser?: Browser
): Promise<ScanEngineResult> {
  const browser = externalBrowser || await launchBrowser()
  const shouldCloseBrowser = !externalBrowser

  try {
    const viewportResults: Record<string, ScanEngineResult> = {}
    const allViolations: Violation[] = []
    let totalPasses = 0
    let hasOverlayWidget = false
    const allKeyboardIssues: KeyboardIssue[] = []

    let skipSecondaryViewports = false

    for (const { name, viewport } of VIEWPORTS) {
      const page = await browser.newPage()
      await page.setBypassCSP(true)
      await page.setViewport(viewport)

      try {
        const navStart = Date.now()
        const isDesktop = name === 'desktop'
        const waitUntil = isDesktop ? 'networkidle0' : 'domcontentloaded'
        const navTimeout = isDesktop ? 30000 : 20000

        // ── Timeout resilience ──
        try {
          await page.goto(url, { waitUntil, timeout: navTimeout })
        } catch (navErr: any) {
          if (navErr?.message?.includes('timeout') || navErr?.name === 'TimeoutError') {
            console.warn(`[ENGINE] ${name} navigation timeout, continuing with partial load`)
          } else {
            throw navErr
          }
        }

        const navDuration = Date.now() - navStart

        if (isDesktop) {
          if (navDuration > 20000) {
            skipSecondaryViewports = true
            console.warn(`[ENGINE] Slow site detected (${navDuration}ms). Skipping mobile/tablet viewports.`)
          }
        }

        if (!isDesktop && skipSecondaryViewports) {
          console.warn(`[ENGINE] Skipping ${name} viewport due to slow desktop navigation`)
          viewportResults[name] = emptyViewportResult(url)
          continue
        }

        await waitForDomStabilization(page, 500, 10000)
        await dismissConsentBanners(page)

        await page.addScriptTag({
          url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js',
        })
        await page.waitForFunction(
          'typeof window.axe !== "undefined"',
          { timeout: 10000 }
        )

        const runOnlyTags = wcagVersion === '2.2'
          ? ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
          : ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

        const mainResult = await runAxeInFrame(page.mainFrame(), runOnlyTags, 'main')
        const frameViolations = [...mainResult.violations]
        let framePasses = mainResult.passes

        const frames = page.frames()
        for (const frame of frames) {
          if (frame === page.mainFrame()) continue
          try {
            await frame.addScriptTag({
              url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js',
            })
            await frame.waitForFunction(
              'typeof window.axe !== "undefined"',
              { timeout: 5000 }
            )
            const frameResult = await runAxeInFrame(frame, runOnlyTags, frame.url())
            frameViolations.push(...frameResult.violations)
            framePasses += frameResult.passes
          } catch (e) {
            console.warn(`[ENGINE] ${name} iframe scan failed:`, (e as Error).message)
          }
        }

        for (const v of frameViolations) {
          if (!v.frame_source || v.frame_source === 'main') {
            v.frame_source = 'main'
          }
        }

        const { score, critical, serious, moderate, minor } = computeScore(frameViolations, framePasses)
        const kbd = await testKeyboardNavigation(page)

        viewportResults[name] = {
          url,
          score,
          violations: frameViolations,
          passes: framePasses,
          totalViolations: critical + serious + moderate + minor,
          hasOverlayWidget: await detectOverlayWidget(page),
          critical,
          serious,
          moderate,
          minor,
          bigSix: computeBigSix(frameViolations),
          keyboardIssues: kbd,
          annotatedScreenshot: null,
        }

        allViolations.push(...frameViolations)
        totalPasses += framePasses
        if (viewportResults[name].hasOverlayWidget) hasOverlayWidget = true
        allKeyboardIssues.push(...kbd)

      } catch (err) {
        console.error(`[ENGINE] ${name} viewport scan failed:`, (err as Error).message)
        viewportResults[name] = emptyViewportResult(url)
      } finally {
        await page.close()
      }
    }

    const scores = Object.values(viewportResults).map(r => r.score)
    const mergedScore = Math.min(...scores)

    const mergedViolationsMap = new Map<string, Violation>()
    for (const v of allViolations) {
      const baseFrame = v.frame_source || 'main'
      const key = `${v.id}::${v.target?.join(',') || ''}::${baseFrame}`

      if (!mergedViolationsMap.has(key)) {
        mergedViolationsMap.set(key, { ...v, frame_source: baseFrame })
      } else {
        const existing = mergedViolationsMap.get(key)!
        if ((v.nodeCount || 1) > (existing.nodeCount || 1)) {
          existing.nodeCount = v.nodeCount
          existing.nodes = v.nodes
          existing.target = v.target
        }
      }
    }
    const uniqueViolations = Array.from(mergedViolationsMap.values())

    const { critical, serious, moderate, minor } = computeScore(uniqueViolations, totalPasses)
    const bigSix = computeBigSix(uniqueViolations)

    const uniqueKeyboardIssues = allKeyboardIssues.filter((issue, idx, self) =>
      idx === self.findIndex(i => i.type === issue.type && i.element === issue.element)
    )

    return {
      url,
      score: mergedScore,
      violations: uniqueViolations,
      passes: totalPasses,
      totalViolations: critical + serious + moderate + minor,
      hasOverlayWidget,
      critical,
      serious,
      moderate,
      minor,
      bigSix,
      keyboardIssues: uniqueKeyboardIssues,
      annotatedScreenshot: null,
      viewportBreakdown: {
        mobile: { score: viewportResults.mobile.score, violations: viewportResults.mobile.totalViolations },
        tablet: { score: viewportResults.tablet.score, violations: viewportResults.tablet.totalViolations },
        desktop: { score: viewportResults.desktop.score, violations: viewportResults.desktop.totalViolations },
      },
    }

  } finally {
    if (shouldCloseBrowser) {
      await browser.close()
    }
  }
}

// ──────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────

function emptyViewportResult(url: string): ScanEngineResult {
  return {
    url,
    score: 0,
    violations: [],
    passes: 0,
    totalViolations: 0,
    hasOverlayWidget: false,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    bigSix: { contrast: 0, altText: 0, labels: 0, links: 0, buttons: 0, language: 0 },
    keyboardIssues: [],
    annotatedScreenshot: null,
  }
}

async function waitForDomStabilization(
  page: Page,
  stableDurationMs: number = 500,
  timeoutMs: number = 10000
): Promise<void> {
  const startTime = Date.now()

  await page.evaluate(
    (stableDuration: number, timeout: number) => {
      return new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | null = null
        const observer = new MutationObserver(() => {
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            observer.disconnect()
            resolve()
          }, stableDuration)
        })

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
        })

        setTimeout(() => {
          observer.disconnect()
          if (timer) clearTimeout(timer)
          resolve()
        }, timeout)

        timer = setTimeout(() => {
          observer.disconnect()
          resolve()
        }, stableDuration)
      })
    },
    stableDurationMs,
    timeoutMs
  )

  const elapsed = Date.now() - startTime
  if (elapsed < stableDurationMs) {
    await new Promise(r => setTimeout(r, stableDurationMs - elapsed))
  }
}

async function dismissConsentBanners(page: Page): Promise<void> {
  try {
    for (const selector of CONSENT_ACCEPT_BUTTONS) {
      try {
        const btn = await page.$(selector)
        if (btn) {
          await btn.click()
          await new Promise(r => setTimeout(r, 500))
          return
        }
      } catch {
        // Try next selector
      }
    }

    await page.evaluate((selectors: string[]) => {
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach((el: Element) => {
          (el as HTMLElement).style.display = 'none'
        })
      })
    }, CONSENT_BANNER_SELECTORS)
  } catch {
    // Non-critical
  }
}

async function runAxeInFrame(
  frame: Frame,
  tags: string[],
  frameSource: string
): Promise<{ violations: Violation[]; passes: number }> {
  const rawJson = await frame.evaluate((axeTags: string[], source: string) => {
    return new Promise<string>((resolve, reject) => {
      window.axe.run(
        { runOnly: { type: 'tag', values: axeTags } },
        function (err: any, results: any) {
          if (err) return reject(err.toString())
          try {
            const output = {
              url: results.url,
              violations: results.violations.map(function (v: any) {
                return {
                  id: v.id,
                  impact: v.impact || 'minor',
                  description: v.description,
                  help: v.help,
                  helpUrl: v.helpUrl,
                  target: v.nodes && v.nodes[0] ? v.nodes[0].target.map(function (t: any) {
                    return typeof t === 'string' ? t : String(t)
                  }) : [],
                  nodeCount: v.nodes ? v.nodes.length : 1,
                  tags: v.tags || [],
                  // ── Cap examples at 10 per rule (was 3) ──
                  nodes: v.nodes.slice(0, 10).map(function (n: any) {
                    return {
                      html: (n.html || '').substring(0, 300),
                      target: n.target.map(function (t: any) {
                        return typeof t === 'string' ? t : String(t)
                      }),
                      failureSummary: n.failureSummary || '',
                    }
                  }),
                  frame_source: source,
                }
              }),
              passes: results.passes.length,
            }
            resolve(JSON.stringify(output))
          } catch (e: any) {
            reject(e.toString())
          }
        }
      )
    })
  }, tags, frameSource)

  const data = JSON.parse(rawJson)
  return {
    violations: data.violations || [],
    passes: data.passes || 0,
  }
}

async function detectOverlayWidget(page: Page): Promise<boolean> {
  try {
    return await page.evaluate((selectors: string[]) => {
      return selectors.some(sel => document.querySelector(sel) !== null)
    }, OVERLAY_SELECTORS)
  } catch {
    return false
  }
}

async function testKeyboardNavigation(page: Page): Promise<KeyboardIssue[]> {
  const issues: KeyboardIssue[] = []

  try {
    const setup = await page.evaluate(() => {
      const focusableSelectors = [
        'a[href]', 'button', 'input', 'textarea', 'select',
        '[tabindex]:not([tabindex="-1"])', '[contenteditable]',
        '[role="button"]', '[role="link"]', '[role="menuitem"]',
        '[role="tab"]', '[role="checkbox"]', '[role="radio"]'
      ]
      const allFocusable = Array.from(document.querySelectorAll(focusableSelectors.join(',')))
      const visibleFocusable = allFocusable.filter((el: Element) => {
        const style = window.getComputedStyle(el as HTMLElement)
        return style.display !== 'none' && style.visibility !== 'hidden'
      }) as HTMLElement[]

      const positiveTabindex = visibleFocusable.filter(el => {
        const tab = parseInt(el.getAttribute('tabindex') || '0', 10)
        return tab > 0
      })

      const missingIndicator = visibleFocusable.filter(el => {
        const tag = el.tagName.toLowerCase()
        if (['input', 'textarea', 'select', 'button'].includes(tag)) return false
        const style = window.getComputedStyle(el)
        const hasOutline = style.outlineWidth !== '0px' && style.outlineStyle !== 'none'
        const hasBoxShadow = style.boxShadow !== 'none'
        return !hasOutline && !hasBoxShadow
      })

      const clickableNotFocusable = Array.from(document.querySelectorAll(
        '[onclick], [onmousedown], [onmouseup], [ondblclick]'
      )).filter((el: Element) => {
        const tab = el.getAttribute('tabindex')
        const isNatural = (el as HTMLElement).matches(
          'a[href], button, input, textarea, select, [contenteditable]'
        )
        return !isNatural && (tab === null || tab === '-1')
      })

      const ariaHiddenFocusable = visibleFocusable.filter(el => {
        let parent: Element | null = el
        while (parent) {
          if (parent.getAttribute('aria-hidden') === 'true') return true
          parent = parent.parentElement
        }
        return false
      })

      const ids = visibleFocusable.map(el => el.id).filter(Boolean)
      const seen = new Set<string>()
      const duplicates = new Set<string>()
      ids.forEach(id => { if (seen.has(id)) duplicates.add(id); else seen.add(id); })

      const badIframes = Array.from(document.querySelectorAll('iframe')).filter((iframe: Element) => {
        const t = iframe.getAttribute('title')
        return !t || t.trim() === ''
      })

      const hasSkipLink = visibleFocusable.some((el: HTMLElement) => {
        const text = (el.textContent || '').toLowerCase()
        const href = (el.getAttribute('href') || '').toLowerCase()
        return text.includes('skip') || href.includes('main') || href.includes('content')
      })

      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))

      ;(document.activeElement as HTMLElement | null)?.blur()

      return {
        focusableCount: visibleFocusable.length,
        hasSkipLink,
        headingCount: headings.length,
        positiveTabindexCount: positiveTabindex.length,
        missingIndicatorCount: missingIndicator.length,
        clickableNotFocusableCount: clickableNotFocusable.length,
        ariaHiddenFocusableCount: ariaHiddenFocusable.length,
        duplicateIds: Array.from(duplicates).slice(0, 3),
        badIframeCount: badIframes.length,
      }
    })

    const tabPresses = Math.min(30, setup.focusableCount + 5)
    const focusPath: string[] = []

    for (let i = 0; i < tabPresses; i++) {
      await page.keyboard.press('Tab')

      const selector = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null
        if (!active || active === document.body) return active === document.body ? 'BODY' : 'null'
        if (active.id) return `#${active.id}`
        const cls = active.getAttribute('class')
        if (cls) return `${active.tagName.toLowerCase()}.${cls.split(' ')[0]}`
        return active.tagName.toLowerCase()
      })

      focusPath.push(selector)
    }

    const cycleLength = 3
    if (focusPath.length >= cycleLength * 2) {
      const lastSegment = focusPath.slice(-cycleLength)
      const prevSegment = focusPath.slice(-cycleLength * 2, -cycleLength)
      if (lastSegment.every((el, i) => el === prevSegment[i]) && lastSegment[0] !== 'BODY' && lastSegment[0] !== 'null') {
        issues.push({
          type: 'focus-trap',
          element: lastSegment[0] || 'unknown',
          description: 'Focus is trapped in a repeating cycle. Users cannot Tab out.',
        })
      }
    }

    const midPath = focusPath.slice(0, -3)
    if (midPath.some(el => el === 'null')) {
      issues.push({
        type: 'focus-loss',
        element: 'document.body',
        description: 'Focus was lost mid-navigation (activeElement became null).',
      })
    }

    if (!setup.hasSkipLink && setup.focusableCount > 5) {
      issues.push({
        type: 'missing-skip-link',
        element: focusPath[0] || 'body',
        description: 'No skip-to-content link found as the first focusable element.',
      })
    }

    if (setup.headingCount === 0) {
      issues.push({
        type: 'skipped-heading',
        element: 'body',
        description: 'No h1-h3 headings found. Headings are essential for screen reader navigation.',
      })
    }

    if (setup.positiveTabindexCount > 0) {
      issues.push({
        type: 'positive-tabindex',
        element: 'multiple elements',
        description: `${setup.positiveTabindexCount} element(s) use positive tabindex, breaking natural tab order.`,
      })
    }

    if (setup.missingIndicatorCount > 0) {
      issues.push({
        type: 'missing-focus-indicator',
        element: 'custom interactive elements',
        description: `${setup.missingIndicatorCount} custom focusable element(s) have no visible focus indicator.`,
      })
    }

    if (setup.clickableNotFocusableCount > 0) {
      issues.push({
        type: 'clickable-not-focusable',
        element: 'scripted elements',
        description: `${setup.clickableNotFocusableCount} element(s) have mouse handlers but are not keyboard focusable.`,
      })
    }

    if (setup.ariaHiddenFocusableCount > 0) {
      issues.push({
        type: 'aria-hidden-focusable',
        element: 'descendants',
        description: `${setup.ariaHiddenFocusableCount} focusable element(s) are inside aria-hidden containers.`,
      })
    }

    if (setup.duplicateIds.length > 0) {
      issues.push({
        type: 'duplicate-focusable-id',
        element: setup.duplicateIds.join(', '),
        description: `Duplicate IDs among focusable elements: ${setup.duplicateIds.join(', ')}.`,
      })
    }

    if (setup.badIframeCount > 0) {
      issues.push({
        type: 'iframe-no-title',
        element: 'iframe',
        description: `${setup.badIframeCount} iframe(s) missing an accessible title attribute.`,
      })
    }

  } catch (err) {
    console.warn('[ENGINE] Keyboard test failed:', (err as Error).message)
  }

  return issues
}

// ──────────────────────────────────────────────
// Scoring
// ──────────────────────────────────────────────

function computeScore(violations: Violation[], passes: number): {
  score: number; critical: number; serious: number; moderate: number; minor: number
} {
  let critical = 0, serious = 0, moderate = 0, minor = 0

  // 1. Count total failing instances by impact
  violations.forEach((v) => {
    const n = Math.max(1, v.nodeCount || v.nodes?.length || 1)
    if (v.impact === 'critical') critical += n
    else if (v.impact === 'serious') serious += n
    else if (v.impact === 'moderate') moderate += n
    else minor += n
  })

  // 2. Convert to "fail points" — CAPPED so 500-of-same-error doesn't nuke everything
  const failPoints = 
    Math.min(critical, 50) * 10 +    // max 50 critical instances count
    Math.min(serious, 80) * 6 +      // max 80 serious instances count  
    Math.min(moderate, 100) * 3 +
    Math.min(minor, 200) * 1

  // 3. "Pass points" — each passing axe check = 2 points
  const passPoints = passes * 2

  // 4. Baseline 100 = "perfect site" buffer so score never collapses
  const totalPoints = passPoints + failPoints + 100

  // 5. Ratio: (passes + perfect buffer) / total
  const ratio = (passPoints + 100) / totalPoints
  const score = Math.round(ratio * 100)

  // 6. Floor at 18, cap at 100
  return { 
    score: Math.max(18, Math.min(100, score)), 
    critical, serious, moderate, minor 
  }
}

function computeBigSix(violations: Violation[]): BigSixCounts {
  const countFor = (ruleId: string) =>
    violations
      .filter((v: Violation) => v.id === ruleId)
      .reduce((sum, v) => sum + Math.max(1, v.nodeCount || v.nodes?.length || 1), 0)

  return {
    contrast: countFor('color-contrast'),
    altText: countFor('image-alt'),
    labels: countFor('label'),
    links: countFor('link-name'),
    buttons: countFor('button-name'),
    language: countFor('html-has-lang'),
  }
}