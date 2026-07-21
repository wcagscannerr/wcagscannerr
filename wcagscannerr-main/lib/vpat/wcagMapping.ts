import { WCAG_21_CRITERIA } from './wcagCriteria'

/**
 * Map an axe-core violation's `tags` array to a single WCAG criterion
 * number (e.g. "1.4.3"). Used by every violation-insert site so the
 * `wcag_criterion` column on the violations table can be queried
 * directly ("show me all 1.4.3 failures") instead of being hardcoded
 * to 'N/A'.
 *
 * axe-core tags violations with strings like "wcag143", "wcag2aa",
 * "best-practice", etc. We pivot on the criterion-specific tag
 * (wcag{N}{N}{N}{N}?). Everything else ('wcag2a', 'wcag2aa',
 * 'best-practice', 'cat.color', etc.) is ignored.
 *
 * If a violation matches multiple criteria (rare but possible across
 * version-tagged rule variants) we return the first match — order
 * matches WCAG_21_CRITERIA which is principle->level sorted.
 *
 * Returns 'N/A' (the historical sentinel) when no criterion-specific
 * tag is present, so existing reports/queries that treat 'N/A' as
 * "no criterion known" keep working.
 */
export function mapAxeTagsToCriterion(tags: string[] | undefined | null): string {
  if (!tags || tags.length === 0) return 'N/A'
  for (const tag of tags) {
    const match = WCAG_21_CRITERIA.find((c) => c.axeTag === tag)
    if (match) return match.number
  }
  return 'N/A'
}
