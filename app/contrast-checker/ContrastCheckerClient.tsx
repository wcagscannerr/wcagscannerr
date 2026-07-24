'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Check, X, ArrowLeft, ArrowRight, Shield, Eye, Type, Monitor } from 'lucide-react'
import Link from 'next/link'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean, 16)
  if (isNaN(bigint)) return null
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getContrastRatio(fg: string, bg: string): number {
  const lum1 = getLuminance(fg)
  const lum2 = getLuminance(bg)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

function formatRatio(ratio: number): string {
  return ratio.toFixed(2)
}

function findNearestPassingColor(fg: string, bg: string, targetRatio: number): string | null {
  const fgRgb = hexToRgb(fg)
  if (!fgRgb) return null

  let bestColor: string | null = null
  let bestDistance = Infinity

  for (let delta = -50; delta <= 50; delta += 2) {
    const r = Math.max(0, Math.min(255, fgRgb.r + delta))
    const g = Math.max(0, Math.min(255, fgRgb.g + delta))
    const b = Math.max(0, Math.min(255, fgRgb.b + delta))

    const candidate = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    const ratio = getContrastRatio(candidate, bg)

    if (ratio >= targetRatio) {
      const distance = Math.abs(delta)
      if (distance < bestDistance) {
        bestDistance = distance
        bestColor = candidate
      }
    }
  }

  return bestColor
}

interface ContrastResult {
  ratio: number
  normalAA: boolean
  normalAAA: boolean
  largeAA: boolean
  largeAAA: boolean
}

export function ContrastCheckerClient() {
  const [foreground, setForeground] = useState('#1a1a1a')
  const [background, setBackground] = useState('#ffffff')

  const result: ContrastResult = useMemo(() => {
    const ratio = getContrastRatio(foreground, background)
    return {
      ratio,
      normalAA: ratio >= 4.5,
      normalAAA: ratio >= 7,
      largeAA: ratio >= 3,
      largeAAA: ratio >= 4.5,
    }
  }, [foreground, background])

  const suggestedFg = useMemo(() => {
    if (result.normalAA) return null
    return findNearestPassingColor(foreground, background, 4.5)
  }, [foreground, background, result.normalAA])

  const suggestedBg = useMemo(() => {
    if (result.normalAA) return null
    return findNearestPassingColor(background, foreground, 4.5)
  }, [foreground, background, result.normalAA])

  const handleSwap = useCallback(() => {
    setForeground(background)
    setBackground(foreground)
  }, [foreground, background])

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/"
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm
          mb-6 inline-flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
          WCAG Contrast Checker
        </h1>
        <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
          Instantly check if your color combinations meet WCAG AA and AAA accessibility standards.
          Used by developers, designers, and accessibility teams.
        </p>
      </div>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Text Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
                className="w-14 h-14 rounded-xl border-2 border-[var(--border)] cursor-pointer bg-transparent"
                aria-label="Select text color"
              />
              <input
                type="text"
                aria-label="Text color hex code"
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-mono text-sm uppercase"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Background Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-14 h-14 rounded-xl border-2 border-[var(--border)] cursor-pointer bg-transparent"
                aria-label="Select background color"
              />
              <input
                type="text"
                aria-label="Background color hex code"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-mono text-sm uppercase"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSwap}
          className="mt-4 mx-auto flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-90" />
          Swap colors
        </button>
      </div>

      <div
        className="rounded-2xl p-8 mb-8 text-center transition-colors duration-200"
        style={{ backgroundColor: background, color: foreground }}
      >
        <p className="text-2xl font-bold mb-2">
          The quick brown fox jumps over the lazy dog
        </p>
        <p className="text-lg opacity-80">
          Large text preview (18px+ bold or 24px+ regular)
        </p>
        <p className="text-sm mt-4 opacity-60">
          Small text preview for body copy and paragraphs
        </p>
      </div>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-4xl font-black text-[var(--text-primary)]">
              {formatRatio(result.ratio)}:1
            </div>
            <div className="text-sm text-[var(--text-muted)] mt-1">
              Contrast Ratio
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
            result.normalAA
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {result.normalAA ? 'PASS' : 'FAIL'}
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Normal Text AA', threshold: '4.5:1', pass: result.normalAA, icon: Type },
            { label: 'Normal Text AAA', threshold: '7:1', pass: result.normalAAA, icon: Type },
            { label: 'Large Text AA', threshold: '3:1', pass: result.largeAA, icon: Eye },
            { label: 'Large Text AAA', threshold: '4.5:1', pass: result.largeAAA, icon: Eye },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                item.pass
                  ? 'bg-emerald-500/5 border-emerald-500/10'
                  : 'bg-red-500/5 border-red-500/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${item.pass ? 'text-emerald-400' : 'text-red-400'}`} />
                <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">{item.threshold}</span>
                {item.pass ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <X className="w-5 h-5 text-red-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(suggestedFg || suggestedBg) && (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Suggested Fix
          </h3>
          <div className="space-y-3">
            {suggestedFg && (
              <button
                onClick={() => setForeground(suggestedFg)}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-amber-500/30 transition-colors text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg border border-[var(--border)]"
                  style={{ backgroundColor: suggestedFg }}
                />
                <div>
                  <div className="text-sm text-[var(--text-primary)]">Use text color {suggestedFg}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Contrast: {formatRatio(getContrastRatio(suggestedFg, background))}:1
                  </div>
                </div>
              </button>
            )}
            {suggestedBg && (
              <button
                onClick={() => setBackground(suggestedBg)}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-amber-500/30 transition-colors text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg border border-[var(--border)]"
                  style={{ backgroundColor: suggestedBg }}
                />
                <div>
                  <div className="text-sm text-[var(--text-primary)]">Use background color {suggestedBg}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Contrast: {formatRatio(getContrastRatio(foreground, suggestedBg))}:1
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="text-center py-8 border-t border-[var(--border)]">
        <p className="text-[var(--text-secondary)] mb-4">
          Want to scan your entire website for accessibility issues?
        </p>
        <Link
          href="/free-scan"
          className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-700 hover:bg-neutral-800 text-white rounded-xl font-medium transition-colors"
        >
          <Shield className="w-4 h-4" />
          Run full WCAG scan
        </Link>
      </div>
    </div>
  )
}
