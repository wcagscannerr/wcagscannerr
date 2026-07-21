import puppeteer from 'puppeteer'
import chromium from '@sparticuz/chromium-min'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { escapeHtml } from '@/lib/escapeHtml'
import { getCategoryForRule, getWcagCriterion, CATEGORY_TOTAL_RULES } from '@/lib/pdf/categoryMapping'
import { getDisabilityTags } from '@/lib/pdf/disabilityTags'

export const maxDuration = 60

const IMPACT_ORDER: Record<string, number> = {
  critical: 0, serious: 1, moderate: 2, minor: 3,
}

const IMPACT_COLORS: Record<string, string> = {
  critical: '#DC2626', serious: '#EA580C', moderate: '#CA8A04', minor: '#2563EB',
}

const CATEGORY_ORDER = [
  'Clickables', 'Titles & Headings', 'Lists', 'Graphics & Media',
  'Forms', 'Document', 'Readability', 'Tables', 'ARIA',
  'Keyboard & Focus', 'General',
]

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: report } = await supabase
    .from('reports').select('*, scans(*)')
    .eq('id', params.id).eq('user_id', user.id).single()

  if (!report) return new Response('Not found', { status: 404 })

  const { data: violations } = await supabase
    .from('violations').select('*')
    .eq('scan_id', report.scan_id)
    .order('impact', { ascending: false })

  const scan = report.scans as any
  const score = scan?.compliance_score ?? 0
  const scoreColor = score >= 75 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626'

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const scanDate = new Date(report.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const criticalCount = scan?.critical_count ?? 0
  const seriousCount = scan?.serious_count ?? 0
  const moderateCount = scan?.moderate_count ?? 0
  const minorCount = scan?.minor_count ?? 0
  const totalViolations = violations?.length ?? 0

  // ── Group violations by category ──
  const groupedByCategory: Record<string, any[]> = {}
  if (violations) {
    for (const v of violations) {
      const cat = getCategoryForRule(v.rule_id || v.id)
      if (!groupedByCategory[cat]) groupedByCategory[cat] = []
      groupedByCategory[cat].push(v)
    }
  }

  // ── Build category summary grid ──
  let categorySummaryHtml = ''
  for (const cat of CATEGORY_ORDER) {
    const items = groupedByCategory[cat] || []
    const failCount = items.length
    const totalRules = CATEGORY_TOTAL_RULES[cat] || 5
    const passCount = Math.max(0, totalRules - failCount)

    categorySummaryHtml += `<div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px 16px;">
      <h4 style="margin:0 0 6px 0; font-size:11px; font-weight:700; color:#111827;">${escapeHtml(cat)}</h4>
      ${failCount > 0
        ? `<span style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:9px; font-weight:600; background:#FEF2F2; color:#DC2626;">${passCount} Passed &nbsp; ${failCount} Failed</span>`
        : `<span style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:9px; font-weight:600; background:#F3F4F6; color:#6B7280;">Not Applicable or Manual Audit Required</span>`
      }
    </div>`
  }

  // ── Build per-category violation sections ──
  let findingsHtml = ''
  let issueNumber = 0
  for (const cat of CATEGORY_ORDER) {
    const items = groupedByCategory[cat] || []
    if (items.length === 0) continue
    issueNumber = 0 // reset per category

    findingsHtml += `<div class="category-section" style="page-break-before:always; margin-top:24px;">
      <h2 style="font-size:16px; font-weight:700; color:#111827; margin-bottom:4px;">${escapeHtml(cat)} Issues</h2>
      <p style="font-size:10px; color:#6B7280; margin-bottom:12px;">${items.length} violation(s) found in this category</p>`

    for (const v of items) {
      issueNumber++
      const impact = v.impact || 'minor'
      const color = IMPACT_COLORS[impact] || '#2563EB'
      const ruleId = v.rule_id || v.id
      const wcagSc = v.wcag_criterion && v.wcag_criterion !== 'N/A'
        ? v.wcag_criterion
        : getWcagCriterion(ruleId)
      const disabilityTags = getDisabilityTags(ruleId)

      findingsHtml += `<div class="violation-card" style="page-break-inside:avoid; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:8px; padding:14px; margin-bottom:12px;">
        <div style="display:flex; gap:10px; align-items:flex-start; margin-bottom:8px;">
          <span style="display:inline-block; padding:3px 10px; border-radius:4px; font-size:10px; font-weight:700; text-transform:uppercase; color:#fff; background:${color}; white-space:nowrap;">
            ${escapeHtml(impact)} Issue #${issueNumber}
          </span>
          ${wcagSc ? `<span style="display:inline-block; padding:3px 8px; border-radius:4px; font-size:9px; font-weight:600; background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE;">WCAG ${escapeHtml(wcagSc)}</span>` : ''}
        </div>

        <p style="font-size:12px; color:#1F2937; margin:0 0 6px 0; line-height:1.5;">${escapeHtml(v.rule_description || v.description || ruleId)}</p>
        <p style="font-size:10px; color:#6B7280; margin:0 0 8px 0;">Rule ID: <code style="background:#F3F4F6; padding:1px 5px; border-radius:3px;">${escapeHtml(ruleId)}</code></p>`

      // Disability tags
      if (disabilityTags.length > 0) {
        findingsHtml += `<div style="margin-bottom:8px; display:flex; gap:4px; flex-wrap:wrap;">
          <span style="font-size:9px; color:#6B7280; font-weight:600; margin-right:4px;">Affects:</span>
          ${disabilityTags.map((tag: string) =>
            `<span style="display:inline-block; padding:1px 6px; border-radius:3px; font-size:8px; font-weight:600; background:#F3F4F6; color:#4B5563; border:1px solid #E5E7EB;">${escapeHtml(tag)}</span>`
          ).join('')}
        </div>`
      }

      // Element HTML
      if (v.element_html) {
        findingsHtml += `<pre style="background:#F3F4F6; border:1px solid #E5E7EB; padding:8px; border-radius:4px; font-size:9px; overflow-x:auto; white-space:pre-wrap; word-break:break-all; margin-bottom:8px; color:#374151;">${escapeHtml(v.element_html)}</pre>`
      }

      // Fix guide
      if (v.fix_summary || v.help) {
        findingsHtml += `<div style="background:#EEF2FF; border-left:3px solid #6366F1; padding:8px 12px; border-radius:4px; margin-bottom:8px;">
          <p style="font-size:9px; color:#4338CA; font-weight:600; margin:0 0 2px 0;">How to Fix</p>
          <p style="font-size:11px; color:#1F2937; margin:0; line-height:1.5;">${escapeHtml(v.fix_summary || v.help)}</p>
        </div>`
      }

      // Page URL
      if (v.page_url) {
        findingsHtml += `<p style="font-size:9px; color:#9CA3AF; margin:0;">Found on: <span style="font-family:monospace;">${escapeHtml(v.page_url)}</span></p>`
      }

      findingsHtml += `</div>`
    }

    findingsHtml += `</div>`
  }

  // ── Next Steps ──
  let nextStepsText = ''
  if (criticalCount > 0 || seriousCount > 0) {
    nextStepsText = 'Address the issues above in order of severity, starting with Critical items, which pose the highest legal and usability risk. Consult the WCAG Quick Reference (w3.org/WAI/WCAG21/quickref) for remediation guidance on each rule. After fixes are deployed, re-scan the affected pages to verify compliance.'
  } else if (moderateCount > 0 || minorCount > 0) {
    nextStepsText = 'While Moderate and Minor issues present lower immediate risk, addressing them demonstrates comprehensive accessibility commitment. Schedule these fixes within your next development cycle.'
  } else {
    nextStepsText = 'Continue regular monitoring to catch new issues introduced by future site updates. Consider a manual accessibility audit to verify the ~43% of WCAG criteria automated tools cannot fully test.'
  }

  const pdfHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background:#FFFFFF;
    color:#1F2937; padding:40px 48px; line-height:1.5; }
  .cover-box { border:2px solid #5B3FE0; border-radius:14px; padding:28px 34px; margin-bottom:32px; }
  .cover-box h1 { color:#5B3FE0; font-size:30px; font-weight:800; margin-bottom:16px; }
  .cover-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #E5E7EB; font-size:11px; }
  .cover-label { color:#6B7280; font-weight:600; text-transform:uppercase; font-size:9px; letter-spacing:1px; }
  .cover-value { color:#111827; font-weight:500; }
  .section-title { font-size:14px; font-weight:700; color:#111827; margin:28px 0 12px 0;
    padding-bottom:8px; border-bottom:1px solid #E5E7EB; }
  .exec-summary { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px;
    padding:16px 20px; margin:16px 0; font-size:12px; color:#4B5563; line-height:1.7; }
  .score-box { display:flex; gap:20px; align-items:center;
    background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px;
    padding:20px; margin:16px 0; }
  .score-num { font-size:56px; font-weight:800; color:${scoreColor}; line-height:1; }
  .stat-group { display:flex; gap:12px; flex-wrap:wrap; }
  .stat { background:#FFFFFF; border:1px solid #E5E7EB; border-radius:6px; padding:8px 14px; text-align:center; }
  .stat-value { font-size:18px; font-weight:700; }
  .stat-label { font-size:9px; color:#6B7280; text-transform:uppercase; margin-top:2px; }
  .methodology { margin-top:28px; padding:14px 18px; background:#F9FAFB;
    border:1px solid #E5E7EB; border-radius:8px; }
  .methodology p { color:#4B5563; font-size:10px; margin-bottom:4px; }
  .page-footer { margin-top:32px; padding-top:12px; border-top:1px solid #E5E7EB;
    text-align:center; color:#6B7280; font-size:9px; }
  .signature-block { margin-top:28px; padding:16px 20px; background:#F9FAFB;
    border:1px solid #E5E7EB; border-radius:8px; text-align:center; }
  .signature-block p { color:#6B7280; font-size:10px; line-height:1.6; }
  .category-section h2 { margin-top:28px; }
  .category-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0; }
  .upsell-box { background:linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
    border:1px solid #C7D2FE; border-radius:10px; padding:20px; margin-top:28px; text-align:center; }
  .upsell-box h3 { color:#4338CA; font-size:14px; font-weight:700; margin-bottom:6px; }
  .upsell-box p { color:#4B5563; font-size:11px; line-height:1.6; margin-bottom:4px; }
  @media print { .category-section { page-break-before:always; } }
</style></head>
<body>

  <!-- Cover Section -->
  <div class="cover-box">
    <h1>Accessibility Compliance Report</h1>
    <div class="cover-row"><span class="cover-label">Prepared For</span><span class="cover-value">${escapeHtml(scan?.url)}</span></div>
    <div class="cover-row"><span class="cover-label">Prepared By</span><span class="cover-value">WCAG Scanner — Automated Compliance Division</span></div>
    <div class="cover-row"><span class="cover-label">Report Type</span><span class="cover-value">WCAG 2.1 Level AA Automated Conformance Audit</span></div>
    <div class="cover-row"><span class="cover-label">Report ID</span><span class="cover-value">${params.id}</span></div>
    <div class="cover-row"><span class="cover-label">Scan Date</span><span class="cover-value">${scanDate}</span></div>
    <div class="cover-row"><span class="cover-label">Generated</span><span class="cover-value">${generatedDate}</span></div>
  </div>

  <!-- Executive Summary -->
  <div class="section-title">Executive Summary</div>
  <div class="exec-summary">
    This automated accessibility scan of <strong style="color:#111827;">${escapeHtml(scan?.url)}</strong>
    was conducted on ${scanDate} using <strong style="color:#5B3FE0;">axe-core</strong>,
    the same engine used in Google Chrome's Lighthouse audits.
    The site achieved a compliance score of <strong style="color:${scoreColor};">${score}/100</strong>.
    ${totalViolations === 0
      ? 'No violations were detected in this scan.'
      : `${totalViolations} issue(s) were identified requiring attention, detailed below.`}
    This report evaluates conformance against <strong style="color:#111827;">WCAG 2.1 Level AA</strong> success criteria.
  </div>

  <!-- Scope & Limitations -->
  <div class="section-title">Scope & Limitations</div>
  <div class="exec-summary">
    This report covers an automated scan of ${scan?.pages_scanned || 1} page(s).
    Automated testing evaluates approximately 57% of WCAG 2.1 success criteria;
    the remaining 43% require manual testing by a qualified accessibility professional
    and are outside the scope of this document.
  </div>

  <!-- Scan Results -->
  <div class="section-title">Scan Results</div>
  <div class="score-box">
    <div class="score-num">${score}</div>
    <div style="color:#6B7280; font-size:11px; margin-right:16px;">out of 100</div>
    <div class="stat-group">
      <div class="stat"><div class="stat-value" style="color:#DC2626;">${criticalCount}</div><div class="stat-label">Critical</div></div>
      <div class="stat"><div class="stat-value" style="color:#EA580C;">${seriousCount}</div><div class="stat-label">Serious</div></div>
      <div class="stat"><div class="stat-value" style="color:#CA8A04;">${moderateCount}</div><div class="stat-label">Moderate</div></div>
      <div class="stat"><div class="stat-value" style="color:#2563EB;">${minorCount}</div><div class="stat-label">Minor</div></div>
    </div>
  </div>

  <!-- Category Summary Grid -->
  <div class="section-title">Category Summary</div>
  <div class="category-grid">
    ${categorySummaryHtml}
  </div>

  <!-- Detailed Findings -->
  <div class="section-title">Detailed Findings</div>
  ${findingsHtml || '<p style="color:#16A34A; font-weight:600;">No violations detected. This site passed all automated WCAG 2.1 Level AA checks.</p>'}

  <!-- Upsell / CTA -->
  <div class="upsell-box">
    <h3>Want a Human Expert to Verify These Results?</h3>
    <p>Automated scans catch approximately <strong>57% of WCAG issues</strong>. The remaining
    criteria require manual evaluation by a qualified accessibility professional.</p>
    <p>For full legal certainty and comprehensive compliance documentation, consider our
    <strong>Pro or Agency plan</strong> — which includes multi-page scanning, AI-powered fix
    suggestions, and ongoing site monitoring. Or contact us for a custom manual audit add-on.</p>
    <p style="margin-top:8px; font-size:10px; color:#6B7280;">
      <a href="https://wcag-scanner-tau.vercel.app/pricing" style="color:#4338CA; font-weight:600;">View Plans →</a>
    </p>
  </div>

  <!-- Recommended Next Steps -->
  <div class="section-title">Recommended Next Steps</div>
  <div class="exec-summary">${nextStepsText}</div>

  <!-- Methodology -->
  <div class="section-title">Methodology</div>
  <div class="methodology">
    <p><strong style="color:#111827;">Scanning Engine:</strong> axe-core v4.10 (Deque Systems) — the industry-standard
    accessibility testing engine used by Google Lighthouse, Microsoft Accessibility Insights, and over 200,000 developers worldwide.</p>
    <p><strong style="color:#111827;">Standard Tested:</strong> WCAG 2.1 Conformance Levels A and AA — 55 success criteria
    covering Perceivable, Operable, Understandable, and Robust (POUR) principles.</p>
    <p><strong style="color:#111827;">Detection Rate:</strong> Automated scanning detects approximately 57% of WCAG success
    criteria automatically. The remaining ~43% (including keyboard navigation, meaningful alt text quality, video captions,
    and focus management) require manual evaluation by an accessibility professional.</p>
    <p style="margin-top:8px; color:#9CA3AF;"><strong>Legal Disclaimer:</strong> This report is generated by automated
    software and does not constitute legal advice. A passing score does not guarantee legal compliance with the ADA,
    Section 508, EN 301 549, or any other accessibility regulation. Consult a qualified attorney for legal guidance.</p>
  </div>

  <!-- Signature Block -->
  <div class="signature-block">
    <p>This report was generated using automated testing software on ${generatedDate} and reflects the state
    of the page at time of scan. It is provided for informational purposes and does not constitute a legal compliance certification.</p>
  </div>

  <div class="page-footer">
    Report ID: ${params.id} &nbsp;|&nbsp; Generated ${generatedDate} &nbsp;|&nbsp; WCAG Scanner
  </div>

</body></html>`

  let browser = null
  try {
    const executablePath = await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar'
    )
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1200, height: 1600 },
      executablePath, headless: true,
    })
    const page = await browser.newPage()
    await page.setContent(pdfHtml, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'a4', printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    })
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="wcag-report-${params.id}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF generation failed:', err)
    return new Response('PDF generation failed', { status: 500 })
  } finally {
    if (browser) await browser.close()
  }
}