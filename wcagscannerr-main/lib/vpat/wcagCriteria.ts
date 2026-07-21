/**
 * WCAG 2.1 / 2.2 Success Criteria — reference data for VPAT/ACR generation.
 *
 * `automatable` reflects whether axe-core (the engine this product uses)
 * can meaningfully test this criterion at all. This matters a lot for a
 * document that gets handed to a paying client as a compliance record:
 * claiming "Supports" on a criterion that was never actually tested is
 * exactly the kind of overclaim that creates legal exposure later. Where
 * `automatable` is false, the generated VPAT always reports "Not Evaluated"
 * for that row regardless of scan results, with a note that manual
 * testing is required — this matches Deque's own published documentation
 * on axe-core's real coverage (roughly half of all WCAG success criteria).
 *
 * `axeTag` is axe-core's own tag for the criterion (dots removed, e.g.
 * "1.4.3" -> "wcag143"), used to match against each violation's `tags`
 * array captured in lib/scanner/engine.ts. AAA criteria mostly have no
 * axe-core coverage at all (axe intentionally ships almost no AAA rules,
 * since AAA conformance is largely a judgment call) — those rows are
 * always "Not Evaluated" here, which is the honest and correct answer,
 * not a bug.
 *
 * Previous version of this file only covered a subset of WCAG 2.1 A/AA
 * and was missing 4.1.3 (a real 2.1 AA criterion) entirely, plus every
 * WCAG 2.2 addition and the full AAA tier. This version is complete.
 */

export type WcagPrinciple = 'Perceivable' | 'Operable' | 'Understandable' | 'Robust'
export type WcagLevel = 'A' | 'AA' | 'AAA'

export interface WcagCriterion {
  number: string
  name: string
  level: WcagLevel
  principle: WcagPrinciple
  axeTag: string
  automatable: boolean
  /** WCAG version this criterion was introduced in — lets the render layer
   * show/hide the 2.2 additions depending on which version the scan ran. */
  version: '2.0' | '2.1' | '2.2'
}

export const WCAG_21_CRITERIA: WcagCriterion[] = [
  // ── Perceivable ──
  { number: '1.1.1', name: 'Non-text Content', level: 'A', principle: 'Perceivable', axeTag: 'wcag111', automatable: true, version: '2.0' },
  { number: '1.2.1', name: 'Audio-only and Video-only (Prerecorded)', level: 'A', principle: 'Perceivable', axeTag: 'wcag121', automatable: false, version: '2.0' },
  { number: '1.2.2', name: 'Captions (Prerecorded)', level: 'A', principle: 'Perceivable', axeTag: 'wcag122', automatable: false, version: '2.0' },
  { number: '1.2.3', name: 'Audio Description or Media Alternative (Prerecorded)', level: 'A', principle: 'Perceivable', axeTag: 'wcag123', automatable: false, version: '2.0' },
  { number: '1.2.4', name: 'Captions (Live)', level: 'AA', principle: 'Perceivable', axeTag: 'wcag124', automatable: false, version: '2.0' },
  { number: '1.2.5', name: 'Audio Description (Prerecorded)', level: 'AA', principle: 'Perceivable', axeTag: 'wcag125', automatable: false, version: '2.0' },
  { number: '1.3.1', name: 'Info and Relationships', level: 'A', principle: 'Perceivable', axeTag: 'wcag131', automatable: true, version: '2.0' },
  { number: '1.3.2', name: 'Meaningful Sequence', level: 'A', principle: 'Perceivable', axeTag: 'wcag132', automatable: false, version: '2.0' },
  { number: '1.3.3', name: 'Sensory Characteristics', level: 'A', principle: 'Perceivable', axeTag: 'wcag133', automatable: false, version: '2.0' },
  { number: '1.3.4', name: 'Orientation', level: 'AA', principle: 'Perceivable', axeTag: 'wcag134', automatable: false, version: '2.1' },
  { number: '1.3.5', name: 'Identify Input Purpose', level: 'AA', principle: 'Perceivable', axeTag: 'wcag135', automatable: true, version: '2.1' },
  { number: '1.3.6', name: 'Identify Purpose', level: 'AAA', principle: 'Perceivable', axeTag: 'wcag136', automatable: false, version: '2.1' },
  { number: '1.4.1', name: 'Use of Color', level: 'A', principle: 'Perceivable', axeTag: 'wcag141', automatable: false, version: '2.0' },
  { number: '1.4.2', name: 'Audio Control', level: 'A', principle: 'Perceivable', axeTag: 'wcag142', automatable: false, version: '2.0' },
  { number: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', principle: 'Perceivable', axeTag: 'wcag143', automatable: true, version: '2.0' },
  { number: '1.4.4', name: 'Resize Text', level: 'AA', principle: 'Perceivable', axeTag: 'wcag144', automatable: false, version: '2.0' },
  { number: '1.4.5', name: 'Images of Text', level: 'AA', principle: 'Perceivable', axeTag: 'wcag145', automatable: false, version: '2.0' },
  { number: '1.4.6', name: 'Contrast (Enhanced)', level: 'AAA', principle: 'Perceivable', axeTag: 'wcag146', automatable: true, version: '2.0' },
  { number: '1.4.7', name: 'Low or No Background Audio', level: 'AAA', principle: 'Perceivable', axeTag: 'wcag147', automatable: false, version: '2.0' },
  { number: '1.4.8', name: 'Visual Presentation', level: 'AAA', principle: 'Perceivable', axeTag: 'wcag148', automatable: false, version: '2.0' },
  { number: '1.4.9', name: 'Images of Text (No Exception)', level: 'AAA', principle: 'Perceivable', axeTag: 'wcag149', automatable: false, version: '2.0' },
  { number: '1.4.10', name: 'Reflow', level: 'AA', principle: 'Perceivable', axeTag: 'wcag1410', automatable: false, version: '2.1' },
  { number: '1.4.11', name: 'Non-text Contrast', level: 'AA', principle: 'Perceivable', axeTag: 'wcag1411', automatable: true, version: '2.1' },
  { number: '1.4.12', name: 'Text Spacing', level: 'AA', principle: 'Perceivable', axeTag: 'wcag1412', automatable: false, version: '2.1' },
  { number: '1.4.13', name: 'Content on Hover or Focus', level: 'AA', principle: 'Perceivable', axeTag: 'wcag1413', automatable: false, version: '2.1' },

  // ── Operable ──
  { number: '2.1.1', name: 'Keyboard', level: 'A', principle: 'Operable', axeTag: 'wcag211', automatable: true, version: '2.0' },
  { number: '2.1.2', name: 'No Keyboard Trap', level: 'A', principle: 'Operable', axeTag: 'wcag212', automatable: true, version: '2.0' },
  { number: '2.1.3', name: 'Keyboard (No Exception)', level: 'AAA', principle: 'Operable', axeTag: 'wcag213', automatable: false, version: '2.0' },
  { number: '2.1.4', name: 'Character Key Shortcuts', level: 'A', principle: 'Operable', axeTag: 'wcag214', automatable: false, version: '2.1' },
  { number: '2.2.1', name: 'Timing Adjustable', level: 'A', principle: 'Operable', axeTag: 'wcag221', automatable: false, version: '2.0' },
  { number: '2.2.2', name: 'Pause, Stop, Hide', level: 'A', principle: 'Operable', axeTag: 'wcag222', automatable: false, version: '2.0' },
  { number: '2.2.3', name: 'No Timing', level: 'AAA', principle: 'Operable', axeTag: 'wcag223', automatable: false, version: '2.0' },
  { number: '2.2.4', name: 'Interruptions', level: 'AAA', principle: 'Operable', axeTag: 'wcag224', automatable: false, version: '2.0' },
  { number: '2.2.5', name: 'Re-authenticating', level: 'AAA', principle: 'Operable', axeTag: 'wcag225', automatable: false, version: '2.0' },
  { number: '2.2.6', name: 'Timeouts', level: 'AAA', principle: 'Operable', axeTag: 'wcag226', automatable: false, version: '2.1' },
  { number: '2.3.1', name: 'Three Flashes or Below Threshold', level: 'A', principle: 'Operable', axeTag: 'wcag231', automatable: false, version: '2.0' },
  { number: '2.3.2', name: 'Three Flashes', level: 'AAA', principle: 'Operable', axeTag: 'wcag232', automatable: false, version: '2.0' },
  { number: '2.3.3', name: 'Animation from Interactions', level: 'AAA', principle: 'Operable', axeTag: 'wcag233', automatable: false, version: '2.1' },
  { number: '2.4.1', name: 'Bypass Blocks', level: 'A', principle: 'Operable', axeTag: 'wcag241', automatable: true, version: '2.0' },
  { number: '2.4.2', name: 'Page Titled', level: 'A', principle: 'Operable', axeTag: 'wcag242', automatable: true, version: '2.0' },
  { number: '2.4.3', name: 'Focus Order', level: 'A', principle: 'Operable', axeTag: 'wcag243', automatable: true, version: '2.0' },
  { number: '2.4.4', name: 'Link Purpose (In Context)', level: 'A', principle: 'Operable', axeTag: 'wcag244', automatable: true, version: '2.0' },
  { number: '2.4.5', name: 'Multiple Ways', level: 'AA', principle: 'Operable', axeTag: 'wcag245', automatable: false, version: '2.0' },
  { number: '2.4.6', name: 'Headings and Labels', level: 'AA', principle: 'Operable', axeTag: 'wcag246', automatable: true, version: '2.0' },
  { number: '2.4.7', name: 'Focus Visible', level: 'AA', principle: 'Operable', axeTag: 'wcag247', automatable: true, version: '2.0' },
  { number: '2.4.8', name: 'Location', level: 'AAA', principle: 'Operable', axeTag: 'wcag248', automatable: false, version: '2.0' },
  { number: '2.4.9', name: 'Link Purpose (Link Only)', level: 'AAA', principle: 'Operable', axeTag: 'wcag249', automatable: false, version: '2.0' },
  { number: '2.4.10', name: 'Section Headings', level: 'AAA', principle: 'Operable', axeTag: 'wcag2410', automatable: false, version: '2.0' },
  { number: '2.4.11', name: 'Focus Not Obscured (Minimum)', level: 'AA', principle: 'Operable', axeTag: 'wcag2411', automatable: false, version: '2.2' },
  { number: '2.4.12', name: 'Focus Not Obscured (Enhanced)', level: 'AAA', principle: 'Operable', axeTag: 'wcag2412', automatable: false, version: '2.2' },
  { number: '2.4.13', name: 'Focus Appearance', level: 'AAA', principle: 'Operable', axeTag: 'wcag2413', automatable: false, version: '2.2' },
  { number: '2.5.1', name: 'Pointer Gestures', level: 'A', principle: 'Operable', axeTag: 'wcag251', automatable: false, version: '2.1' },
  { number: '2.5.2', name: 'Pointer Cancellation', level: 'A', principle: 'Operable', axeTag: 'wcag252', automatable: false, version: '2.1' },
  { number: '2.5.3', name: 'Label in Name', level: 'A', principle: 'Operable', axeTag: 'wcag253', automatable: true, version: '2.1' },
  { number: '2.5.4', name: 'Motion Actuation', level: 'A', principle: 'Operable', axeTag: 'wcag254', automatable: false, version: '2.1' },
  { number: '2.5.5', name: 'Target Size (Enhanced)', level: 'AAA', principle: 'Operable', axeTag: 'wcag255', automatable: false, version: '2.1' },
  { number: '2.5.6', name: 'Concurrent Input Mechanisms', level: 'AAA', principle: 'Operable', axeTag: 'wcag256', automatable: false, version: '2.1' },
  { number: '2.5.7', name: 'Dragging Movements', level: 'AA', principle: 'Operable', axeTag: 'wcag257', automatable: false, version: '2.2' },
  { number: '2.5.8', name: 'Target Size (Minimum)', level: 'AA', principle: 'Operable', axeTag: 'wcag258', automatable: true, version: '2.2' },

  // ── Understandable ──
  { number: '3.1.1', name: 'Language of Page', level: 'A', principle: 'Understandable', axeTag: 'wcag311', automatable: true, version: '2.0' },
  { number: '3.1.2', name: 'Language of Parts', level: 'AA', principle: 'Understandable', axeTag: 'wcag312', automatable: true, version: '2.0' },
  { number: '3.1.3', name: 'Unusual Words', level: 'AAA', principle: 'Understandable', axeTag: 'wcag313', automatable: false, version: '2.0' },
  { number: '3.1.4', name: 'Abbreviations', level: 'AAA', principle: 'Understandable', axeTag: 'wcag314', automatable: false, version: '2.0' },
  { number: '3.1.5', name: 'Reading Level', level: 'AAA', principle: 'Understandable', axeTag: 'wcag315', automatable: false, version: '2.0' },
  { number: '3.1.6', name: 'Pronunciation', level: 'AAA', principle: 'Understandable', axeTag: 'wcag316', automatable: false, version: '2.0' },
  { number: '3.2.1', name: 'On Focus', level: 'A', principle: 'Understandable', axeTag: 'wcag321', automatable: false, version: '2.0' },
  { number: '3.2.2', name: 'On Input', level: 'A', principle: 'Understandable', axeTag: 'wcag322', automatable: false, version: '2.0' },
  { number: '3.2.3', name: 'Consistent Navigation', level: 'AA', principle: 'Understandable', axeTag: 'wcag323', automatable: false, version: '2.0' },
  { number: '3.2.4', name: 'Consistent Identification', level: 'AA', principle: 'Understandable', axeTag: 'wcag324', automatable: false, version: '2.0' },
  { number: '3.2.5', name: 'Change on Request', level: 'AAA', principle: 'Understandable', axeTag: 'wcag325', automatable: false, version: '2.0' },
  { number: '3.2.6', name: 'Consistent Help', level: 'A', principle: 'Understandable', axeTag: 'wcag326', automatable: false, version: '2.2' },
  { number: '3.3.1', name: 'Error Identification', level: 'A', principle: 'Understandable', axeTag: 'wcag331', automatable: false, version: '2.0' },
  { number: '3.3.2', name: 'Labels or Instructions', level: 'A', principle: 'Understandable', axeTag: 'wcag332', automatable: true, version: '2.0' },
  { number: '3.3.3', name: 'Error Suggestion', level: 'AA', principle: 'Understandable', axeTag: 'wcag333', automatable: false, version: '2.0' },
  { number: '3.3.4', name: 'Error Prevention (Legal, Financial, Data)', level: 'AA', principle: 'Understandable', axeTag: 'wcag334', automatable: false, version: '2.0' },
  { number: '3.3.5', name: 'Help', level: 'AAA', principle: 'Understandable', axeTag: 'wcag335', automatable: false, version: '2.0' },
  { number: '3.3.6', name: 'Error Prevention (All)', level: 'AAA', principle: 'Understandable', axeTag: 'wcag336', automatable: false, version: '2.0' },
  { number: '3.3.7', name: 'Redundant Entry', level: 'A', principle: 'Understandable', axeTag: 'wcag337', automatable: false, version: '2.2' },
  { number: '3.3.8', name: 'Accessible Authentication (Minimum)', level: 'AA', principle: 'Understandable', axeTag: 'wcag338', automatable: false, version: '2.2' },
  { number: '3.3.9', name: 'Accessible Authentication (Enhanced)', level: 'AAA', principle: 'Understandable', axeTag: 'wcag339', automatable: false, version: '2.2' },

  // ── Robust ──
  { number: '4.1.1', name: 'Parsing', level: 'A', principle: 'Robust', axeTag: 'wcag411', automatable: true, version: '2.0' },
  { number: '4.1.2', name: 'Name, Role, Value', level: 'A', principle: 'Robust', axeTag: 'wcag412', automatable: true, version: '2.0' },
  { number: '4.1.3', name: 'Status Messages', level: 'AA', principle: 'Robust', axeTag: 'wcag413', automatable: true, version: '2.1' },
]

export const WCAG_PRINCIPLES: WcagPrinciple[] = ['Perceivable', 'Operable', 'Understandable', 'Robust']