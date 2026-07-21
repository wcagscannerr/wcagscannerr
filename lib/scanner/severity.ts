export interface SeverityCounts {
  critical: number
  serious: number
  moderate: number
  minor: number
}

export function getSeverityCounts(
  violations: Array<{ impact?: string | null; nodeCount?: number | null; nodes?: Array<unknown> | null } | null | undefined>
): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, serious: 0, moderate: 0, minor: 0 }

  for (const violation of violations) {
    if (!violation) continue

    const count = Math.max(1, violation.nodeCount ?? violation.nodes?.length ?? 1)
    switch (violation.impact) {
      case 'critical':
        counts.critical += count
        break
      case 'serious':
        counts.serious += count
        break
      case 'moderate':
        counts.moderate += count
        break
      case 'minor':
      default:
        counts.minor += count
        break
    }
  }

  return counts
}

export function getEffectiveSeverityCounts(
  counts: Partial<SeverityCounts> | null | undefined,
  violations: Array<{ impact?: string | null; nodeCount?: number | null; nodes?: Array<unknown> | null } | null | undefined>
): SeverityCounts {
  const derived = getSeverityCounts(violations)
  const fromDb: SeverityCounts = {
    critical: counts?.critical ?? 0,
    serious: counts?.serious ?? 0,
    moderate: counts?.moderate ?? 0,
    minor: counts?.minor ?? 0,
  }

  return {
    critical: fromDb.critical > 0 ? fromDb.critical : derived.critical,
    serious: fromDb.serious > 0 ? fromDb.serious : derived.serious,
    moderate: fromDb.moderate > 0 ? fromDb.moderate : derived.moderate,
    minor: fromDb.minor > 0 ? fromDb.minor : derived.minor,
  }
}
