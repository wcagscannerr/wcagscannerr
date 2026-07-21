/**
 * Maps axe-core rule IDs to human-readable categories for professional reports.
 * Categories match the structure used in manual WCAG audit reports.
 */

export const RULE_CATEGORIES: Record<string, string> = {
  // ── Clickables ──
  'link-name': 'Clickables',
  'button-name': 'Clickables',
  'link-in-text-block': 'Clickables',
  'skip-link': 'Clickables',
  'accesskeys': 'Clickables',
  // 'aria-required-parent' -> defined in ARIA section

  // ── Titles & Headings ──
  'page-has-heading-one': 'Titles & Headings',
  'heading-order': 'Titles & Headings',
  'empty-heading': 'Titles & Headings',
  'p-as-heading': 'Titles & Headings',
  'document-title': 'Titles & Headings',

  // ── Lists ──
  'list': 'Lists',
  'listitem': 'Lists',
  'definition-list': 'Lists',
  'dlitem': 'Lists',

  // ── Graphics & Media ──
  'image-alt': 'Graphics & Media',
  'image-redundant-alt': 'Graphics & Media',
  'area-alt': 'Graphics & Media',
  'video-caption': 'Graphics & Media',
  'audio-caption': 'Graphics & Media',
  'object-alt': 'Graphics & Media',
  'role-img-alt': 'Graphics & Media',
  'input-image-alt': 'Graphics & Media',

  // ── Forms ──
  'label': 'Forms',
  'label-title-only': 'Forms',
  'aria-input-field-name': 'Forms',
  'autocomplete-valid': 'Forms',
  'select-name': 'Forms',
  'duplicate-select': 'Forms',
  'form-field-multiple-labels': 'Forms',
  'input-button-name': 'Forms',

  // ── Document Structure ──
  'html-has-lang': 'Document',
  'html-lang-valid': 'Document',
  'html-xml-lang-mismatch': 'Document',
  'meta-viewport': 'Document',
  'meta-refresh': 'Document',
  'region': 'Document',
  'landmark-one-main': 'Document',
  'landmark-banner-is-top-level': 'Document',
  'landmark-contentinfo-is-top-level': 'Document',
  'landmark-complementary-is-top-level': 'Document',
  'landmark-no-duplicate-banner': 'Document',
  'landmark-no-duplicate-contentinfo': 'Document',
  'landmark-no-duplicate-main': 'Document',
  'landmark-unique': 'Document',
  'bypass': 'Document',

  // ── Readability & Contrast ──
  'color-contrast': 'Readability',
  'color-contrast-enhanced': 'Readability',
  'avoid-text-spacing-adjustments': 'Readability',
  'scrollable-region-focusable': 'Readability',
  'identical-links-same-purpose': 'Readability',

  // ── Tables ──
  'td-headers-attr': 'Tables',
  'th-has-data-cells': 'Tables',
  'table-fake-caption': 'Tables',
  'table-duplicate-name': 'Tables',
  'scope-attr-valid': 'Tables',

  // ── ARIA ──
  'aria-valid-attr': 'ARIA',
  'aria-valid-attr-value': 'ARIA',
  'aria-allowed-attr': 'ARIA',
  'aria-allowed-role': 'ARIA',
  'aria-required-attr': 'ARIA',
  'aria-required-children': 'ARIA',
  'aria-required-parent': 'ARIA',
  'aria-hidden-body': 'ARIA',
  'aria-hidden-focus': 'ARIA',
  'aria-prohibited-attr': 'ARIA',
  'aria-roles': 'ARIA',
  'aria-toggle-field-name': 'ARIA',
  'aria-progressbar-name': 'ARIA',
  'aria-tooltip-name': 'ARIA',
  'aria-treeitem-name': 'ARIA',
  'aria-command-name': 'ARIA',

  // ── Keyboard & Focus ──
  'tabindex': 'Keyboard & Focus',
  'focus-order-semantics': 'Keyboard & Focus',
  'focusable-content': 'Keyboard & Focus',
  'focusable-no-name': 'Keyboard & Focus',
  'frame-focusable-content': 'Keyboard & Focus',
  'page-no-duplicate-banner': 'Keyboard & Focus',
  'page-no-duplicate-contentinfo': 'Keyboard & Focus',
  'page-no-duplicate-main': 'Keyboard & Focus',

  // ── General / Uncategorized ──
  'duplicate-id': 'General',
  'duplicate-id-active': 'General',
  'frame-title': 'General',
  'frame-title-unique': 'General',
  'marquee': 'General',
  'blink': 'General',
  'css-orientation-lock': 'General',
  'target-size': 'General',
  'nested-interactive': 'General',
  'no-autoplay-audio': 'General',
  'server-side-image-map': 'General',
  'svg-img-alt': 'General',
  'valid-lang': 'General',
  'window-frame': 'General',
};

/**
 * Maps axe-core rule IDs to WCAG Success Criterion numbers (fallback
 * for when the database doesn't store this field, or stores "N/A").
 */
export const WCAG_CRITERION_MAP: Record<string, string> = {
  'color-contrast': '1.4.3',
  'color-contrast-enhanced': '1.4.6',
  'image-alt': '1.1.1',
  'image-redundant-alt': '1.1.1',
  'area-alt': '1.1.1',
  'input-image-alt': '1.1.1',
  'object-alt': '1.1.1',
  'role-img-alt': '1.1.1',
  'video-caption': '1.2.2',
  'audio-caption': '1.2.1',
  'link-name': '2.4.4',
  'button-name': '4.1.2',
  'link-in-text-block': '2.4.4',
  'label': '1.3.1',
  'label-title-only': '1.3.1',
  'select-name': '4.1.2',
  'aria-input-field-name': '4.1.2',
  'autocomplete-valid': '1.3.5',
  'html-has-lang': '3.1.1',
  'html-lang-valid': '3.1.1',
  'html-xml-lang-mismatch': '3.1.1',
  'document-title': '2.4.2',
  'meta-viewport': '1.4.4',
  'meta-refresh': '2.2.1',
  'page-has-heading-one': '1.3.1',
  'heading-order': '1.3.1',
  'empty-heading': '1.3.1',
  'list': '1.3.1',
  'listitem': '1.3.1',
  'definition-list': '1.3.1',
  'dlitem': '1.3.1',
  'td-headers-attr': '1.3.1',
  'th-has-data-cells': '1.3.1',
  'table-fake-caption': '1.3.1',
  'table-duplicate-name': '1.3.1',
  'scope-attr-valid': '1.3.1',
  'duplicate-id': '4.1.1',
  'duplicate-id-active': '4.1.1',
  'frame-title': '4.1.2',
  'frame-title-unique': '4.1.2',
  'tabindex': '2.4.3',
  'aria-valid-attr': '4.1.2',
  'aria-valid-attr-value': '4.1.2',
  'aria-allowed-attr': '4.1.2',
  'aria-allowed-role': '4.1.2',
  'aria-required-attr': '4.1.2',
  'aria-required-children': '4.1.2',
  'aria-required-parent': '4.1.2',
  'aria-hidden-body': '4.1.2',
  'aria-hidden-focus': '4.1.2',
  'aria-prohibited-attr': '4.1.2',
  'aria-roles': '4.1.2',
  'aria-toggle-field-name': '4.1.2',
  'aria-progressbar-name': '4.1.2',
  'aria-tooltip-name': '4.1.2',
  'aria-treeitem-name': '4.1.2',
  'aria-command-name': '4.1.2',
  'landmark-one-main': '1.3.1',
  'landmark-banner-is-top-level': '1.3.1',
  'landmark-contentinfo-is-top-level': '1.3.1',
  'landmark-complementary-is-top-level': '1.3.1',
  'landmark-no-duplicate-banner': '1.3.1',
  'landmark-no-duplicate-contentinfo': '1.3.1',
  'landmark-no-duplicate-main': '1.3.1',
  'landmark-unique': '1.3.1',
  'region': '1.3.1',
  'bypass': '2.4.1',
  'skip-link': '2.4.1',
  'accesskeys': '2.1.1',
  'focus-order-semantics': '2.4.3',
  'focusable-content': '2.1.1',
  'focusable-no-name': '4.1.2',
  'frame-focusable-content': '2.1.1',
  'page-no-duplicate-banner': '1.3.1',
  'page-no-duplicate-contentinfo': '1.3.1',
  'page-no-duplicate-main': '1.3.1',
  'p-as-heading': '1.3.1',
  'identical-links-same-purpose': '2.4.4',
  'scrollable-region-focusable': '1.4.13',
  'avoid-text-spacing-adjustments': '1.4.12',
  'marquee': '2.2.2',
  'blink': '2.2.2',
  'css-orientation-lock': '1.4.10',
  'target-size': '2.5.8',
  'nested-interactive': '4.1.2',
  'no-autoplay-audio': '1.4.2',
  'server-side-image-map': '2.1.1',
  'svg-img-alt': '1.1.1',
  'valid-lang': '3.1.2',
  'window-frame': '2.1.1',
  'form-field-multiple-labels': '1.3.1',
  'input-button-name': '4.1.2',
  'duplicate-select': '4.1.2',
};

/**
 * Total number of WCAG rules known per category, used to compute
 * "passed" counts in the summary grid.
 */
export const CATEGORY_TOTAL_RULES: Record<string, number> = {
  'Clickables': 6,
  'Titles & Headings': 5,
  'Lists': 4,
  'Graphics & Media': 8,
  'Forms': 8,
  'Document': 16,
  'Readability': 5,
  'Tables': 5,
  'ARIA': 16,
  'Keyboard & Focus': 8,
  'General': 16,
};

/**
 * Returns the human-readable category for a given axe-core rule ID.
 * Falls back to "General" for unknown rules.
 */
export function getCategoryForRule(ruleId: string): string {
  return RULE_CATEGORIES[ruleId] || 'General';
}

/**
 * Returns the WCAG success criterion number for a given rule ID.
 * Falls back to "N/A" if unknown.
 */
export function getWcagCriterion(ruleId: string): string {
  return WCAG_CRITERION_MAP[ruleId] || 'N/A';
}