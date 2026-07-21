'use client';

// =============================================================
// Step 11 — Color-blindness simulator for color-contrast violations
// =============================================================
//
// axe-core's standard Violation JSON does NOT include the failing
// element's foreground / background RGB values (those are computed
// inside axe's runtime, not exposed to the caller). For Step 11 v1 we
// render a representative preview with the violation's actual text
// content (parsed out of element_html) and a default light-on-dark
// gradient that simulates a typical failing contrast pair. The
// preview then applies the user-selected color-blindness filter via
// SVG <feColorMatrix>, so the same logic works for any color pair
// once we plumb actual fg/bg through to this component later.

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Mode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

// Color-blindness matrices (public domain from Brettel/Vienot/Mollon
// transforms used by Coblis-style color-blindness simulators). Each
// row of `values` is the SVG <feColorMatrix> 4×5 matrix laid out
// row-major in 5-tuples: [R G B A offset].
const MODES: { id: Mode; label: string; description: string; matrix: string }[] = [
  {
    id: 'normal',
    label: 'Normal',
    description: 'No color-blindness filter applied — what the designer rendered.',
    matrix: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0',
  },
  {
    id: 'protanopia',
    label: 'Protanopia',
    description: 'Red-blind (≈1% of men). Reds dim to brown; red/green confusion.',
    matrix: '0.567 0.433 0     0 0  0.558 0.442 0     0 0  0     0.242 0.758 0 0  0     0     0     1 0',
  },
  {
    id: 'deuteranopia',
    label: 'Deuteranopia',
    description: 'Green-blind (≈1% of men, the most common form). Greens tan; red/green confusion.',
    matrix: '0.625 0.375 0   0 0  0.7   0.3   0   0 0  0     0.3   0.7 0 0  0     0     0   1 0',
  },
  {
    id: 'tritanopia',
    label: 'Tritanopia',
    description: 'Blue-blind (rare, ≈1/30000). Blues shift greenish; yellows shift pink.',
    matrix: '0.95 0.05 0     0 0  0    0.433 0.567 0 0  0    0.475 0.525 0 0  0    0     0     1 0',
  },
  {
    id: 'achromatopsia',
    label: 'Achromatopsia',
    description: 'Full color-blindness (≈1/30000). Total grayscale — luminance only.',
    matrix: '0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0   0   0   1 0',
  },
];

interface Props {
  /** Plain-text content extracted from the failing element, if any. */
  sampleText?: string;
  /** Foreground color for the preview; defaults to a typical low-contrast gray-on-white. */
  foreground?: string;
  /** Background color for the preview; defaults to white. */
  background?: string;
  /** Contrast ratio as reported by axe-core (e.g. 2.4). When provided, an AA pass/fail badge is shown. */
  contrastRatio?: number;
  /** AA pass/fail result computed against axe-core's reported ratio. */
  requiredAa?: boolean;
  /** Background URL for an annotated region screenshot, when available.
   *  Rendered as a background-image behind the text so the filter applies to the image too. */
  previewUrl?: string | null;
}

export default function ContrastSimulator({
  sampleText,
  foreground = '#707070',
  background = '#FFFFFF',
  contrastRatio,
  requiredAa,
  previewUrl,
}: Props) {
  const [mode, setMode] = useState<Mode>('normal');
  const active = MODES.find((m) => m.id === mode) ?? MODES[0];

  // Strip HTML tags from the element excerpt so we render text only.
  const text = (sampleText ?? 'Sample text — would a real user be able to read this?')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
    .trim();

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 bg-white/[0.04] flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-text-secondary">
          Color-blindness simulator
        </p>
        {contrastRatio !== undefined && (
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide',
              requiredAa
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border border-red-500/30',
            )}
          >
            Contrast {contrastRatio.toFixed(2)} : 1 — {requiredAa ? 'passes AA' : 'fails AA'}
          </span>
        )}
      </div>

      {/* SVG filter definitions. The `url(#id)` reference in CSS picks
          the right matrix; the hidden <svg> is a single definitions
          block so we don't pay one element per mode. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          {MODES.filter((m) => m.id !== 'normal').map((m) => (
            <filter key={m.id} id={`cb-filter-${m.id}`}>
              <feColorMatrix type="matrix" values={m.matrix} />
            </filter>
          ))}
        </defs>
      </svg>

      {/* The previewed element. The CSS `filter: url(...)` references
          the matrix above. transition is on `filter` so the swap is
          smooth. */}
      <div
        className={cn(
          'px-4 py-6 text-center',
          'bg-cover bg-center',
        )}
        style={{
          color: foreground,
          backgroundColor: background,
          backgroundImage: previewUrl ? `url(${previewUrl})` : undefined,
          filter: mode === 'normal' ? 'none' : `url(#cb-filter-${mode})`,
          transition: 'filter 150ms ease-out',
        }}
        role="img"
        aria-label={`Visual preview simulating ${active.label} color-vision`}
      >
        <p className="font-medium text-base leading-tight">{text || 'Sample text'}</p>
        <p className="text-xs mt-2 opacity-60">
          What someone with {active.label.toLowerCase()} sees
        </p>
      </div>

      {/* Mode selector — uses role="tablist" semantics for keyboard nav. */}
      <div
        role="tablist"
        aria-label="Color-blindness simulation mode"
        className="px-3 py-2 flex flex-wrap gap-1 bg-white/[0.02] border-t border-border"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'px-2 py-1 rounded text-[11px] font-medium transition-colors',
              mode === m.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/5 text-text-secondary hover:bg-white/10',
            )}
            title={m.description}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="px-3 py-2 text-[10px] text-text-muted border-t border-border">
        {active.description}
      </p>
    </div>
  );
}
