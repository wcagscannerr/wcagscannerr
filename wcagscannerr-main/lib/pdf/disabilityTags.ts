/**
 * Maps axe-core rule IDs to affected disability groups.
 * Used in professional audit reports to show the human impact of each violation.
 */

export const DISABILITY_TAGS: Record<string, string[]> = {
  // ── Color & Contrast ──
  'color-contrast': ['Visually Impaired', 'Color Blind', 'Dyslexia', 'Elderly'],
  'color-contrast-enhanced': ['Visually Impaired', 'Color Blind', 'Elderly'],

  // ── Images & Graphics ──
  'image-alt': ['Blind', 'Visually Impaired', 'Cognitive & Learning'],
  'image-redundant-alt': ['Blind', 'Visually Impaired'],
  'area-alt': ['Blind', 'Visually Impaired'],
  'input-image-alt': ['Blind', 'Visually Impaired'],
  'object-alt': ['Blind', 'Visually Impaired'],
  'role-img-alt': ['Blind', 'Visually Impaired'],
  'svg-img-alt': ['Blind', 'Visually Impaired'],

  // ── Audio & Video ──
  'video-caption': ['Deaf', 'Hard of Hearing'],
  'audio-caption': ['Deaf', 'Hard of Hearing'],
  'no-autoplay-audio': ['Deaf', 'Hard of Hearing', 'Cognitive & Learning'],

  // ── Links & Buttons ──
  'link-name': ['Blind', 'Visually Impaired', 'Motor', 'Cognitive & Learning'],
  'button-name': ['Blind', 'Visually Impaired', 'Motor', 'Cognitive & Learning'],
  'link-in-text-block': ['Visually Impaired', 'Cognitive & Learning'],
  'identical-links-same-purpose': ['Blind', 'Cognitive & Learning'],

  // ── Forms ──
  'label': ['Blind', 'Visually Impaired', 'Cognitive & Learning'],
  'label-title-only': ['Blind', 'Visually Impaired', 'Motor'],
  'aria-input-field-name': ['Blind', 'Visually Impaired'],
  'autocomplete-valid': ['Motor', 'Cognitive & Learning', 'Blind'],
  'select-name': ['Blind', 'Visually Impaired'],
  'duplicate-select': ['Blind', 'Visually Impaired'],
  'form-field-multiple-labels': ['Blind', 'Visually Impaired'],
  'input-button-name': ['Blind', 'Visually Impaired', 'Motor'],

  // ── Document & Language ──
  'html-has-lang': ['Blind', 'Visually Impaired', 'Cognitive & Learning'],
  'html-lang-valid': ['Blind', 'Visually Impaired', 'Cognitive & Learning'],
  'html-xml-lang-mismatch': ['Blind', 'Visually Impaired'],
  'document-title': ['Blind', 'Visually Impaired', 'Cognitive & Learning'],
  'meta-viewport': ['Visually Impaired', 'Elderly'],
  'meta-refresh': ['Cognitive & Learning', 'Blind'],
  'valid-lang': ['Blind', 'Cognitive & Learning'],

  // ── Headings & Structure ──
  'page-has-heading-one': ['Blind', 'Visually Impaired', 'Cognitive & Learning'],
  'heading-order': ['Blind', 'Visually Impaired', 'Cognitive & Learning'],
  'empty-heading': ['Blind', 'Visually Impaired'],
  'p-as-heading': ['Blind', 'Visually Impaired', 'Cognitive & Learning'],
  'list': ['Blind', 'Visually Impaired'],
  'listitem': ['Blind', 'Visually Impaired'],
  'definition-list': ['Blind', 'Visually Impaired'],
  'dlitem': ['Blind', 'Visually Impaired'],

  // ── Tables ──
  'td-headers-attr': ['Blind', 'Visually Impaired'],
  'th-has-data-cells': ['Blind', 'Visually Impaired'],
  'table-fake-caption': ['Blind', 'Visually Impaired'],
  'table-duplicate-name': ['Blind', 'Visually Impaired'],
  'scope-attr-valid': ['Blind', 'Visually Impaired'],

  // ── Landmarks & Regions ──
  'landmark-one-main': ['Blind', 'Visually Impaired'],
  'landmark-banner-is-top-level': ['Blind', 'Visually Impaired'],
  'landmark-contentinfo-is-top-level': ['Blind', 'Visually Impaired'],
  'landmark-complementary-is-top-level': ['Blind', 'Visually Impaired'],
  'landmark-no-duplicate-banner': ['Blind', 'Visually Impaired'],
  'landmark-no-duplicate-contentinfo': ['Blind', 'Visually Impaired'],
  'landmark-no-duplicate-main': ['Blind', 'Visually Impaired'],
  'landmark-unique': ['Blind', 'Visually Impaired'],
  'region': ['Blind', 'Visually Impaired'],
  'bypass': ['Blind', 'Motor', 'Visually Impaired'],
  'skip-link': ['Blind', 'Motor', 'Visually Impaired'],

  // ── ARIA ──
  'aria-valid-attr': ['Blind', 'Visually Impaired'],
  'aria-valid-attr-value': ['Blind', 'Visually Impaired'],
  'aria-allowed-attr': ['Blind', 'Visually Impaired'],
  'aria-allowed-role': ['Blind', 'Visually Impaired'],
  'aria-required-attr': ['Blind', 'Visually Impaired'],
  'aria-required-children': ['Blind', 'Visually Impaired'],
  'aria-required-parent': ['Blind', 'Visually Impaired'],
  'aria-hidden-body': ['Blind', 'Visually Impaired'],
  'aria-hidden-focus': ['Blind', 'Visually Impaired'],
  'aria-prohibited-attr': ['Blind', 'Visually Impaired'],
  'aria-roles': ['Blind', 'Visually Impaired'],
  'aria-toggle-field-name': ['Blind', 'Visually Impaired'],
  'aria-progressbar-name': ['Blind', 'Visually Impaired'],
  'aria-tooltip-name': ['Blind', 'Visually Impaired'],
  'aria-treeitem-name': ['Blind', 'Visually Impaired'],
  'aria-command-name': ['Blind', 'Visually Impaired'],

  // ── Keyboard & Focus ──
  'tabindex': ['Motor', 'Blind', 'Visually Impaired'],
  'focus-order-semantics': ['Blind', 'Motor'],
  'focusable-content': ['Motor', 'Blind'],
  'focusable-no-name': ['Blind', 'Motor'],
  'frame-focusable-content': ['Motor', 'Blind'],
  'page-no-duplicate-banner': ['Blind', 'Visually Impaired'],
  'page-no-duplicate-contentinfo': ['Blind', 'Visually Impaired'],
  'page-no-duplicate-main': ['Blind', 'Visually Impaired'],
  'accesskeys': ['Motor', 'Blind'],

  // ── General ──
  'duplicate-id': ['Blind', 'Visually Impaired', 'Cognitive & Learning'],
  'duplicate-id-active': ['Blind', 'Visually Impaired'],
  'frame-title': ['Blind', 'Visually Impaired'],
  'frame-title-unique': ['Blind', 'Visually Impaired'],
  'marquee': ['Cognitive & Learning', 'Visually Impaired'],
  'blink': ['Cognitive & Learning', 'Visually Impaired'],
  'css-orientation-lock': ['Motor', 'Visually Impaired'],
  'target-size': ['Motor', 'Visually Impaired', 'Elderly'],
  'nested-interactive': ['Blind', 'Motor'],
  'server-side-image-map': ['Blind', 'Motor'],
  'window-frame': ['Blind', 'Visually Impaired'],
  'scrollable-region-focusable': ['Motor', 'Blind'],
  'avoid-text-spacing-adjustments': ['Visually Impaired', 'Dyslexia'],
};

/**
 * Returns the disability groups affected by a given rule ID.
 * Falls back to a generic list if the rule is unknown.
 */
export function getDisabilityTags(ruleId: string): string[] {
  return DISABILITY_TAGS[ruleId] || ['Visually Impaired', 'Cognitive & Learning'];
}