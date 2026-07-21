import { ConformanceLevel, ConformanceRow } from './conformance'
import { WCAG_PRINCIPLES, WcagPrinciple, WcagLevel } from './wcagCriteria'
import { escapeHtml } from '@/lib/escapeHtml'

export interface VpatRecord {
  id: string
  product_name: string
  product_version: string | null
  product_description: string | null
  report_date: string
  evaluator_name: string
  evaluator_contact: string | null
  evaluation_methods: string
  standard: string
  status: 'draft' | 'finalized'
  white_label: boolean
}

export interface ScanRecord {
  url: string
  compliance_score: number
}

const LEVEL_COLOR: Record<ConformanceLevel, string> = {
  'Supports': '#16A34A',
  'Partially Supports': '#D97706',
  'Does Not Support': '#DC2626',
  'Not Evaluated': '#6B7280',
}

const TERMS: { term: ConformanceLevel; def: string }[] = [
  { term: 'Supports', def: 'The functionality of the product has at least one method that meets the criterion without known defects, or meets it through equivalent facilitation.' },
  { term: 'Partially Supports', def: 'Some functionality of the product does not meet the criterion.' },
  { term: 'Does Not Support', def: 'The majority of product functionality does not meet the criterion.' },
  { term: 'Not Evaluated', def: 'The criterion was not covered by the testing methods used to produce this report — typically because it requires manual, human judgment-based evaluation (e.g. screen reader walkthroughs, plain-language review) that automated tooling cannot perform.' },
]

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function priorityFor(row: ConformanceRow): { rank: number; label: string; color: string } {
  if (row.level === 'Does Not Support' && row.criterion.level === 'A') return { rank: 0, label: 'Critical Priority', color: '#DC2626' }
  if (row.level === 'Does Not Support' && row.criterion.level === 'AA') return { rank: 1, label: 'High Priority', color: '#EA580C' }
  if (row.level === 'Partially Supports' && row.criterion.level !== 'AAA') return { rank: 2, label: 'High Priority', color: '#EA580C' }
  if (row.level === 'Does Not Support') return { rank: 3, label: 'Medium Priority', color: '#D97706' }
  return { rank: 4, label: 'Low Priority', color: '#6B7280' }
}

function tableForLevel(table: ConformanceRow[], level: WcagLevel): string {
  const rowsAtLevel = table.filter((r) => r.criterion.level === level)
  if (rowsAtLevel.length === 0) return '<p class="empty-note">No published WCAG success criteria exist at this level for the evaluated version.</p>'

  return WCAG_PRINCIPLES.map((principle: WcagPrinciple) => {
    const rows = rowsAtLevel.filter((r) => r.criterion.principle === principle)
    if (rows.length === 0) return ''
    return `
      <tr class="principle-header"><td colspan="3">${escapeHtml(principle)}</td></tr>
      ${rows.map((row) => `
        <tr>
          <td class="criterion-cell">
            <strong>${row.criterion.number}</strong> ${escapeHtml(row.criterion.name)}
            <span class="level-tag">Level ${row.criterion.level}${row.criterion.version === '2.2' ? ' · WCAG 2.2' : ''}</span>
          </td>
          <td class="conformance-cell">
            <span class="badge" style="background:${LEVEL_COLOR[row.level]}1a; color:${LEVEL_COLOR[row.level]}; border-color:${LEVEL_COLOR[row.level]}4d;">
              ${row.level}
            </span>
          </td>
          <td class="remarks-cell">${escapeHtml(row.remarks)}</td>
        </tr>
      `).join('')}
    `
  }).join('')
}

export interface BuildVpatHtmlOptions {
  vpat: VpatRecord
  scan: ScanRecord
  table: ConformanceRow[]
  summary: Record<ConformanceLevel, number>
  isFinal: boolean
}

export function buildVpatHtml({ vpat, scan, table, summary, isFinal }: BuildVpatHtmlOptions): string {
  const reportDate = fmtDate(vpat.report_date)
  const total = table.length
  const supportsPct = total ? Math.round((summary['Supports'] / total) * 100) : 0
  const levelACriteria = table.filter((r) => r.criterion.level === 'A')
  const levelAACriteria = table.filter((r) => r.criterion.level === 'AA')
  const levelAAACriteria = table.filter((r) => r.criterion.level === 'AAA')
  const levelASupports = levelACriteria.length ? Math.round((levelACriteria.filter(r => r.level === 'Supports').length / levelACriteria.length) * 100) : 0
  const levelAASupports = levelAACriteria.length ? Math.round((levelAACriteria.filter(r => r.level === 'Supports').length / levelAACriteria.length) * 100) : 0
  const levelAAASupports = levelAAACriteria.length ? Math.round((levelAAACriteria.filter(r => r.level === 'Supports').length / levelAAACriteria.length) * 100) : 0

  const findings = table
    .filter((r) => r.level === 'Partially Supports' || r.level === 'Does Not Support')
    .map((r) => ({ row: r, priority: priorityFor(r) }))
    .sort((a, b) => a.priority.rank - b.priority.rank)

  const brand = vpat.white_label ? escapeHtml(vpat.evaluator_name) : 'WCAG Scanner'
  const brandFooter = vpat.white_label
    ? `Prepared by ${escapeHtml(vpat.evaluator_name)}.`
    : `Generated by WCAG Scanner (wcagscannerr.com).`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>VPAT / ACR — ${escapeHtml(vpat.product_name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; font-size: 11.5px; line-height: 1.65; }
  h1, h2, h3 { break-after: avoid; }
  table, tr, .criterion-row, .finding-card { break-inside: avoid; page-break-inside: avoid; }

  /* ── Cover ── */
  .cover { padding: 70px 55px 40px; min-height: 900px; display: flex; flex-direction: column; }
  .cover .brandline { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #7c3aed; margin-bottom: 60px; }
  .cover h1 { font-size: 30px; font-weight: 800; margin-bottom: 6px; }
  .cover .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 40px; }
  .cover .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; margin-bottom: 32px; padding: 24px; background: #f9fafb; border-radius: 10px; }
  .cover .info-item label { display: block; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; margin-bottom: 3px; }
  .cover .info-item span { font-size: 13.5px; color: #111827; font-weight: 500; }
  .cover .desc { font-size: 12.5px; color: #374151; margin-top: 8px; max-width: 480px; }
  .cover .status-strip { margin-top: auto; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }

  /* ── Section chrome ── */
  .page-break { page-break-before: always; }
  .section { padding: 50px 55px 24px; }
  .section h2 { font-size: 16px; font-weight: 800; margin-bottom: 10px; color: #111827; }
  .section h2 .num { color: #7c3aed; margin-right: 6px; }
  .section p { font-size: 12px; color: #374151; margin-bottom: 10px; }
  .section ul { margin: 0 0 10px 18px; }
  .section li { font-size: 12px; color: #374151; margin-bottom: 4px; }

  /* ── TOC ── */
  .toc-item { display: flex; align-items: baseline; gap: 8px; padding: 7px 0; border-bottom: 1px dotted #e5e7eb; font-size: 12.5px; }
  .toc-item .dots { flex: 1; border-bottom: 1px dotted #d1d5db; margin-bottom: 3px; }
  .toc-item .pg { color: #9ca3af; font-size: 11px; }

  /* ── Info tables ── */
  .terms-table, .rev-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; }
  .terms-table th, .terms-table td, .rev-table th, .rev-table td { border: 1px solid #e5e7eb; padding: 7px 10px; text-align: left; font-size: 11px; vertical-align: top; }
  .terms-table th, .rev-table th { background: #f9fafb; font-weight: 700; }

  /* ── Scorecard ── */
  .summary-row { display: flex; gap: 14px; margin: 16px 0; flex-wrap: wrap; }
  .summary-chip { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 18px; flex: 1; min-width: 110px; }
  .summary-chip .count { font-size: 22px; font-weight: 800; }
  .summary-chip .label { font-size: 9.5px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
  .level-score-row { display: flex; gap: 14px; margin: 12px 0 20px; }
  .level-score-card { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; text-align: center; }
  .level-score-card .pct { font-size: 26px; font-weight: 800; color: #7c3aed; }
  .level-score-card .lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; }

  /* ── Conformance tables ── */
  table.conformance { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.conformance td { border-bottom: 1px solid #eef0f3; padding: 9px 10px; vertical-align: top; font-size: 10.8px; }
  .principle-header td { background: #f3f4f6; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; padding: 7px 10px; color: #4b5563; }
  .criterion-cell { width: 34%; }
  .level-tag { display: block; font-size: 9px; color: #9ca3af; margin-top: 2px; }
  .conformance-cell { width: 17%; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 5px; font-size: 9.5px; font-weight: 700; border: 1px solid; white-space: nowrap; }
  .remarks-cell { width: 49%; color: #4b5563; }
  .empty-note { font-size: 11px; color: #9ca3af; font-style: italic; }

  /* ── Findings / remediation ── */
  .finding-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
  .finding-card .fh { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 5px; }
  .finding-card .fh strong { font-size: 12px; }
  .priority-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
  .finding-card p { font-size: 11px; color: #4b5563; margin: 0; }

  /* ── Attestation ── */
  .sig-block { display: flex; gap: 60px; margin-top: 40px; }
  .sig-line { flex: 1; border-top: 1px solid #111827; padding-top: 8px; font-size: 11px; color: #4b5563; }

  .disclaimer { padding: 30px 55px 55px; font-size: 9.5px; color: #9ca3af; line-height: 1.7; }
  .disclaimer h3 { font-size: 11px; color: #6b7280; margin: 14px 0 4px; }
</style>
</head>
<body>

  <!-- ═══ COVER ═══ -->
  <div class="cover">
    <div class="brandline">${brand}</div>
    <h1>Voluntary Product Accessibility Template (VPAT&reg; 2.5)</h1>
    <p class="subtitle">Accessibility Conformance Report — WCAG Edition (WCAG 2.0 / 2.1 / 2.2, Levels A, AA &amp; AAA)</p>

    <div class="info-grid">
      <div class="info-item"><label>Product Name</label><span>${escapeHtml(vpat.product_name)}</span></div>
      <div class="info-item"><label>Product Version</label><span>${escapeHtml(vpat.product_version || 'N/A')}</span></div>
      <div class="info-item"><label>Report Date</label><span>${reportDate}</span></div>
      <div class="info-item"><label>Standard / Guideline</label><span>${escapeHtml(vpat.standard)}</span></div>
      <div class="info-item"><label>Evaluator / Vendor</label><span>${escapeHtml(vpat.evaluator_name)}</span></div>
      <div class="info-item"><label>Contact</label><span>${escapeHtml(vpat.evaluator_contact || 'N/A')}</span></div>
      <div class="info-item"><label>Evaluated URL</label><span>${escapeHtml(scan?.url || 'N/A')}</span></div>
      <div class="info-item"><label>Report Status</label><span>${isFinal ? 'Final' : 'Draft'}</span></div>
    </div>

    ${vpat.product_description ? `<p class="desc">${escapeHtml(vpat.product_description)}</p>` : ''}

    <div class="status-strip">
      This document was produced using the VPAT&reg; 2.5 Rev WCAG Edition format published by the
      Information Technology Industry Council (ITI) and the U.S. General Services Administration.
      VPAT is a registered trademark of ITI.
    </div>
  </div>

  <!-- ═══ DOCUMENT CONTROL ═══ -->
  <div class="section page-break">
    <h2><span class="num">1.</span>Document Control</h2>
    <p>This section records the version history and distribution status of this Accessibility Conformance Report (ACR).</p>
    <table class="rev-table">
      <tr><th>Version</th><th>Date</th><th>Status</th><th>Prepared By</th><th>Summary of Change</th></tr>
      <tr>
        <td>1.0</td>
        <td>${reportDate}</td>
        <td>${isFinal ? 'Final' : 'Draft'}</td>
        <td>${escapeHtml(vpat.evaluator_name)}</td>
        <td>${isFinal ? 'Finalized conformance report generated from automated scan results and evaluator review.' : 'Initial draft generated from automated scan results, pending evaluator review.'}</td>
      </tr>
    </table>
    <p>Confidentiality: This report is intended for the internal use of ${escapeHtml(vpat.product_name)}'s stakeholders and their
    accessibility procurement partners. Redistribution should retain this document control section in full.</p>
  </div>

  <!-- ═══ TABLE OF CONTENTS ═══ -->
  <div class="section page-break">
    <h2><span class="num">2.</span>Table of Contents</h2>
    ${[
      ['1. Document Control', ''],
      ['2. Table of Contents', ''],
      ['3. Executive Summary', ''],
      ['4. Product &amp; Scope of Evaluation', ''],
      ['5. Evaluation Methodology', ''],
      ['6. Legal &amp; Regulatory Framework Mapping', ''],
      ['7. Conformance Terms &amp; Definitions', ''],
      ['8. Conformance Summary Scorecard', ''],
      ['9. Detailed Conformance — Level A Success Criteria', ''],
      ['10. Detailed Conformance — Level AA Success Criteria', ''],
      ['11. Detailed Conformance — Level AAA Success Criteria', ''],
      ['12. Findings &amp; Prioritized Remediation Guidance', ''],
      ['13. Evaluator Attestation', ''],
      ['14. Legal Disclaimer', ''],
    ].map(([t]) => `<div class="toc-item"><span>${t}</span><span class="dots"></span></div>`).join('')}
  </div>

  <!-- ═══ EXECUTIVE SUMMARY ═══ -->
  <div class="section page-break">
    <h2><span class="num">3.</span>Executive Summary</h2>
    <p>
      This Accessibility Conformance Report documents the results of an evaluation of
      <strong>${escapeHtml(vpat.product_name)}${vpat.product_version ? ` (${escapeHtml(vpat.product_version)})` : ''}</strong>
      against the Web Content Accessibility Guidelines (WCAG) 2.0, 2.1, and 2.2, at Levels A, AA, and AAA.
      The evaluation was conducted by ${escapeHtml(vpat.evaluator_name)} and is current as of ${reportDate}.
    </p>
    <p>
      Of the ${total} applicable WCAG success criteria assessed, automated and/or manual testing found
      <strong style="color:${LEVEL_COLOR['Supports']}">${summary['Supports']} criteria (${supportsPct}%) fully supported</strong>,
      <strong style="color:${LEVEL_COLOR['Partially Supports']}">${summary['Partially Supports']} partially supported</strong>, and
      <strong style="color:${LEVEL_COLOR['Does Not Support']}">${summary['Does Not Support']} not supported</strong>.
      ${summary['Not Evaluated'] ? `An additional ${summary['Not Evaluated']} criteria are marked <strong style="color:${LEVEL_COLOR['Not Evaluated']}">Not Evaluated</strong> because they require manual, human-judgment testing outside the scope of the automated methodology described in Section 5 — these are not claims of either conformance or non-conformance, and should be reviewed manually before this report is relied upon as a complete conformance record.` : ''}
    </p>
    <p>
      This report should be read alongside Section 12 (Findings &amp; Prioritized Remediation Guidance), which lists every
      criterion currently rated below full support, ordered by the priority with which we recommend it be addressed.
    </p>
  </div>

  <!-- ═══ PRODUCT & SCOPE ═══ -->
  <div class="section page-break">
    <h2><span class="num">4.</span>Product &amp; Scope of Evaluation</h2>
    <p>${vpat.product_description ? escapeHtml(vpat.product_description) : `${escapeHtml(vpat.product_name)} is a web-based application evaluated at the URL listed on the cover page.`}</p>
    <p><strong>Evaluated URL:</strong> ${escapeHtml(scan?.url || 'N/A')}</p>
    <p><strong>In scope:</strong> The primary rendered page and any same-origin embedded frames reachable from the evaluated URL at the time of testing.</p>
    <p><strong>Out of scope:</strong> Authenticated areas, third-party embedded widgets that block cross-origin script injection, and pages not linked from or otherwise reachable at the evaluated URL are outside the scope of this specific report and were not tested.</p>
  </div>

  <!-- ═══ METHODOLOGY ═══ -->
  <div class="section page-break">
    <h2><span class="num">5.</span>Evaluation Methodology</h2>
    <p>${escapeHtml(vpat.evaluation_methods)}</p>
    <p>Automated testing was performed using <strong>axe-core</strong> (Deque Systems), the industry-standard open-source accessibility
    testing engine, run inside a headless Chromium browser against the live rendered page. Automated tooling can reliably test
    roughly half of all WCAG success criteria — those that are structural or programmatically determinable (e.g. missing alt text,
    insufficient color contrast, missing form labels, invalid ARIA usage). Criteria that require human judgment — such as whether
    alt text is <em>meaningful</em> rather than merely present, whether a heading structure is logically organized, or whether
    plain-language requirements are met — cannot be conclusively evaluated by software alone.</p>
    <p>Criteria in this report are marked <strong>Not Evaluated</strong> where they fall outside axe-core's automatable coverage and no
    manual evaluation was recorded for them. Any criterion the evaluator has manually reviewed and annotated is marked accordingly
    in the Remarks column of the detailed tables in Sections 9–11.</p>
  </div>

  <!-- ═══ LEGAL & REGULATORY MAPPING ═══ -->
  <div class="section page-break">
    <h2><span class="num">6.</span>Legal &amp; Regulatory Framework Mapping</h2>
    <p>WCAG 2.1 Level AA is the technical accessibility baseline referenced, directly or indirectly, by the regulatory
    frameworks below. This report documents technical conformance to WCAG; it does not constitute a legal opinion or
    certification of compliance with any specific law. Organizations should consult qualified legal counsel in their
    jurisdiction for a determination of legal compliance.</p>

    <h3 style="font-size:12.5px;font-weight:700;margin:14px 0 4px;">Americans with Disabilities Act (ADA), Title III — United States</h3>
    <p>U.S. courts and the Department of Justice have consistently referenced WCAG 2.1 Level AA as the technical standard
    for evaluating whether a place of public accommodation's website is accessible under Title III. This report's Level A
    and AA findings (Sections 9–10) are the most directly relevant to ADA readiness.</p>

    <h3 style="font-size:12.5px;font-weight:700;margin:14px 0 4px;">Section 508 of the Rehabilitation Act — U.S. Federal</h3>
    <p>Section 508 incorporates WCAG 2.0 Level AA by reference (and permits WCAG 2.1 AA as an accepted successor).
    Federal agencies and their contractors typically require conformance at this level; the findings in this report map
    directly onto that requirement set.</p>

    <h3 style="font-size:12.5px;font-weight:700;margin:14px 0 4px;">EN 301 549 — European Union</h3>
    <p>EN 301 549, the EU's harmonized accessibility standard for ICT procurement (and the technical basis for the
    European Accessibility Act), incorporates WCAG 2.1 Level AA in its Chapter 9 web content requirements. This report's
    WCAG AA findings apply directly to EN 301 549 Chapter 9 conformance.</p>
  </div>

  <!-- ═══ TERMS ═══ -->
  <div class="section page-break">
    <h2><span class="num">7.</span>Conformance Terms &amp; Definitions</h2>
    <p>The terms used in the Conformance Level column throughout this report are defined as follows, consistent with the
    VPAT&reg; 2.5 specification:</p>
    <table class="terms-table">
      <tr><th>Term</th><th>Definition</th></tr>
      ${TERMS.map(t => `<tr><td><strong>${t.term}</strong></td><td>${t.def}</td></tr>`).join('')}
    </table>
  </div>

  <!-- ═══ SCORECARD ═══ -->
  <div class="section page-break">
    <h2><span class="num">8.</span>Conformance Summary Scorecard</h2>
    <div class="level-score-row">
      <div class="level-score-card"><div class="pct">${levelASupports}%</div><div class="lbl">Level A Supports</div></div>
      <div class="level-score-card"><div class="pct">${levelAASupports}%</div><div class="lbl">Level AA Supports</div></div>
      <div class="level-score-card"><div class="pct">${levelAAASupports}%</div><div class="lbl">Level AAA Supports</div></div>
    </div>
    <div class="summary-row">
      <div class="summary-chip"><div class="count" style="color:${LEVEL_COLOR['Supports']}">${summary['Supports']}</div><div class="label">Supports</div></div>
      <div class="summary-chip"><div class="count" style="color:${LEVEL_COLOR['Partially Supports']}">${summary['Partially Supports']}</div><div class="label">Partially Supports</div></div>
      <div class="summary-chip"><div class="count" style="color:${LEVEL_COLOR['Does Not Support']}">${summary['Does Not Support']}</div><div class="label">Does Not Support</div></div>
      <div class="summary-chip"><div class="count" style="color:${LEVEL_COLOR['Not Evaluated']}">${summary['Not Evaluated']}</div><div class="label">Not Evaluated</div></div>
    </div>
    <p>Scores reflect ${total} total WCAG 2.0/2.1/2.2 success criteria across Levels A, AA, and AAA. See Sections 9–11 for
    the full criterion-by-criterion breakdown.</p>
  </div>

  <!-- ═══ LEVEL A TABLE ═══ -->
  <div class="section page-break">
    <h2><span class="num">9.</span>Detailed Conformance — Level A Success Criteria</h2>
    <table class="conformance">${tableForLevel(table, 'A')}</table>
  </div>

  <!-- ═══ LEVEL AA TABLE ═══ -->
  <div class="section page-break">
    <h2><span class="num">10.</span>Detailed Conformance — Level AA Success Criteria</h2>
    <table class="conformance">${tableForLevel(table, 'AA')}</table>
  </div>

  <!-- ═══ LEVEL AAA TABLE ═══ -->
  <div class="section page-break">
    <h2><span class="num">11.</span>Detailed Conformance — Level AAA Success Criteria</h2>
    <p>Level AAA is not required for general web accessibility conformance under any major regulation and is included here
    for completeness. axe-core provides very limited automated coverage at this level by design, since AAA criteria are
    largely judgment-based; most rows below are correctly marked "Not Evaluated" rather than assumed to pass.</p>
    <table class="conformance">${tableForLevel(table, 'AAA')}</table>
  </div>

  <!-- ═══ FINDINGS ═══ -->
  <div class="section page-break">
    <h2><span class="num">12.</span>Findings &amp; Prioritized Remediation Guidance</h2>
    ${findings.length === 0
      ? `<p>No criteria are currently rated below full support. Congratulations — continue re-running this evaluation after
         future releases to confirm conformance is maintained.</p>`
      : `<p>The ${findings.length} criteria below are rated "Partially Supports" or "Does Not Support" and are ordered by
         recommended remediation priority. Priority is weighted by WCAG conformance level (A before AA before AAA) and by
         the severity of the underlying finding.</p>
         ${findings.map(({ row, priority }) => `
           <div class="finding-card">
             <div class="fh">
               <strong>${row.criterion.number} — ${escapeHtml(row.criterion.name)} (Level ${row.criterion.level})</strong>
               <span class="priority-tag" style="background:${priority.color}1a;color:${priority.color}">${priority.label}</span>
             </div>
             <p>${escapeHtml(row.remarks)}</p>
           </div>
         `).join('')}`
    }
  </div>

  <!-- ═══ ATTESTATION ═══ -->
  <div class="section page-break">
    <h2><span class="num">13.</span>Evaluator Attestation</h2>
    <p>I attest that the findings in this Accessibility Conformance Report accurately reflect the results of the evaluation
    methodology described in Section 5, applied to ${escapeHtml(vpat.product_name)} at the URL listed on the cover page, as
    of ${reportDate}. Criteria marked "Not Evaluated" have not been tested and no conformance claim is made for them.</p>
    <div class="sig-block">
      <div class="sig-line">${escapeHtml(vpat.evaluator_name)}<br>Evaluator${vpat.evaluator_contact ? ` — ${escapeHtml(vpat.evaluator_contact)}` : ''}</div>
      <div class="sig-line">${reportDate}<br>Date</div>
    </div>
  </div>

  <!-- ═══ DISCLAIMER ═══ -->
  <div class="disclaimer page-break">
    <h3>Legal Disclaimer</h3>
    <p>This report reflects a combination of automated accessibility testing (via axe-core) and any manual annotations
    added by the evaluator listed on the cover page. It is provided for informational purposes to support accessibility
    procurement and internal evaluation processes. It does not constitute a legal determination of compliance with the
    Americans with Disabilities Act (ADA), Section 508 of the Rehabilitation Act, the European Accessibility Act, EN 301 549,
    or any other law or regulation, and should not be relied upon as such without independent legal review.</p>
    <h3>Currency of This Report</h3>
    <p>This report reflects the state of the evaluated product as of the date on the cover page. Accessibility conformance
    can change with any code, content, or configuration update. This report should be regenerated after material changes to
    the evaluated product.</p>
    <p style="margin-top:18px;">${brandFooter}</p>
  </div>

</body>
</html>`
}

/** Puppeteer page.pdf() options shared by both VPAT PDF routes. Margins are
 * sized to leave room for the running header/footer without overlapping
 * body content, and the footer carries the product name + page numbers so
 * a reader can always tell which report and page they're looking at even
 * after printing loose pages. */
export function vpatPdfOptions(vpat: VpatRecord) {
  const footerBrand = vpat.white_label ? '' : 'WCAG Scanner · '
  return {
    format: 'a4' as const,
    printBackground: true,
    margin: { top: '20px', bottom: '46px', left: '0px', right: '0px' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="width:100%; font-size:8px; color:#9ca3af; padding:0 55px; display:flex; justify-content:space-between; font-family:-apple-system,sans-serif;">
        <span>${footerBrand}Accessibility Conformance Report</span>
        <span class="pageNumber"></span>&nbsp;/&nbsp;<span class="totalPages"></span>
      </div>
    `,
  }
}