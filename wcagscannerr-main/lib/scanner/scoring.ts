import type { BigSixCounts } from '@/types/scan';

// ──────────────────────────────────────────────
// Constants — keep these in sync with engine.ts
// ──────────────────────────────────────────────

const WEIGHT = { critical: 10, serious: 6, moderate: 3, minor: 1 } as const;

interface ScorableViolation {
  impact: string;
  nodeCount?: number;
  nodes?: any[];
}

// ──────────────────────────────────────────────
// FIXED: Logarithmic Scoring (matches engine.ts)
// ──────────────────────────────────────────────

export function calculateComplianceScore(
  violations: ScorableViolation[]
): { score: number; color: string; label: string } {
  let totalPenalty = 0;

  for (const v of violations) {
    const impact = v.impact as keyof typeof WEIGHT;
    const base = WEIGHT[impact] ?? 1;

    // Count actual failing DOM nodes, not just rule objects.
    // This is the fix that stops "1 violation" from hiding 500 broken elements.
    const instances = Math.max(1, v.nodeCount ?? v.nodes?.length ?? 1);

    // Density nudge: repeating the SAME rule many times is worse, but saturates.
    // 1 instance = 1×, 20 instances = ~1.6×, 500 instances = ~1.9×
    const densityMultiplier = 1 + Math.min(0.9, Math.log10(instances) * 0.4);

    totalPenalty += base * densityMultiplier;
  }

  // Exponential decay: many DIFFERENT broken rules still hurt, but the curve
  // is softer than linear caps. A messy site lands at 15–30, not instantly 0.
  // TUNABLE: if you still see too many 0s, change 90 → 120 or 150.
  const SCORE_DECAY = 90;
  const rawScore = 100 * Math.exp(-totalPenalty / SCORE_DECAY);

  // Floor at 5 so the UI never renders an absolute 0 (psychologically harsh).
  const finalScore = Math.max(5, Math.min(100, Math.round(rawScore)));

  let color: string;
  let label: string;

  if (finalScore >= 90) {
    color = '#2DD4BF';
    label = 'Excellent';
  } else if (finalScore >= 75) {
    color = '#22D3A0';
    label = 'Good';
  } else if (finalScore >= 50) {
    color = '#F59E0B';
    label = 'Needs Work';
  } else if (finalScore >= 25) {
    color = '#F97316';
    label = 'Poor';
  } else {
    color = '#EF4444';
    label = 'Critical';
  }

  return { score: finalScore, color, label };
}

// ──────────────────────────────────────────────
// FIXED: Big Six counts node instances (not rules)
// ──────────────────────────────────────────────

export function calculateBigSix(
  violations: Array<{ rule_id: string; nodeCount?: number; nodes?: any[] }>
): BigSixCounts {
  const countFor = (ruleIds: string[]) =>
    violations
      .filter((v) => ruleIds.includes(v.rule_id))
      .reduce((sum, v) => sum + Math.max(1, v.nodeCount ?? v.nodes?.length ?? 1), 0);

  return {
    contrast: countFor(['color-contrast']),
    alt_text: countFor(['image-alt', 'image-redundant-alt']),
    labels: countFor(['label', 'label-title-only']),
    links: countFor(['link-name']),
    buttons: countFor(['button-name']),
    lang: countFor(['html-has-lang', 'html-lang-valid']),
  };
}