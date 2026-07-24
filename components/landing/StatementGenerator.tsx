'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Star, Download, Check } from 'lucide-react';
import { escapeHtml } from '@/lib/escapeHtml';
import Link from 'next/link';

interface FormData {
  companyName: string;
  websiteUrl: string;
  wcagLevel: string;
  contactEmail: string;
  lastAuditDate: string;
  knownIssues: string;
  plannedImprovements: string;
}

const initialForm: FormData = {
  companyName: '',
  websiteUrl: '',
  wcagLevel: 'AA',
  contactEmail: '',
  lastAuditDate: '',
  knownIssues: '',
  plannedImprovements: '',
};

function generateStatement(data: FormData): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const level = data.wcagLevel === 'AAA' ? 'AAA' : data.wcagLevel === 'A' ? 'A' : 'AA';
  const auditDate = data.lastAuditDate
    ? new Date(data.lastAuditDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '[Date of most recent audit]';

  return `Accessibility Statement for ${data.companyName || '[Company Name]'}

This accessibility statement applies to: ${data.websiteUrl || '[Website URL]'}

Our Commitment
${data.companyName || '[Company Name]'} is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone, and applying the relevant accessibility standards.

Conformance Status
The Web Content Accessibility Guidelines (WCAG) define requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA. ${data.companyName || '[Company Name]'} is partially conformant with WCAG 2.1 Level ${level}. Partially conformant means that some parts of the content may not fully conform to the accessibility standard.

Date
This statement was last updated on ${date}.

What We Are Doing
To ensure ongoing accessibility, we:
- Conduct regular automated accessibility scans using axe-core
- Review and address identified issues on a priority basis
- ${data.lastAuditDate ? `Performed our most recent audit on ${auditDate}.` : 'Perform periodic audits to identify and fix issues.'}
- Provide alternative text for images and meaningful link descriptions
- Ensure sufficient color contrast throughout the site
- Structure content with proper heading hierarchy

${data.knownIssues ? `Known Limitations\n${data.knownIssues}\n\n` : ''}${data.plannedImprovements ? `Planned Improvements\n${data.plannedImprovements}\n\n` : ''}Technical Specifications
Accessibility of ${data.websiteUrl || '[Website URL]'} relies on the following technologies to work with the particular combination of web browser and any assistive technologies or plugins installed on your computer:
- HTML
- CSS
- JavaScript
- WAI-ARIA

These technologies are relied upon for conformance with the accessibility standards used.

Assessment Approach
${data.companyName || '[Company Name]'} assessed the accessibility of ${data.websiteUrl || '[Website URL]'} using the following approach:
- Self-evaluation: automated testing using axe-core WCAG compliance scanner

Regulatory Coverage
This automated scan tests against the WCAG 2.1 AA standard, which is the technical baseline referenced by the following regulations:
- ADA (United States) — References WCAG 2.1 AA
- California Unruh Act (United States) — References WCAG 2.1 AA
- Section 508 (US Federal) — References WCAG 2.0 AA
- UK Equality Act 2010 (United Kingdom) — References WCAG 2.1 AA
- EN 301 549 / EAA (European Union) — References WCAG 2.1 AA
- Australian DDA (Australia) — References WCAG 2.0/2.1 AA
- Canada ACA / AODA (Canada) — References WCAG 2.0 AA

This does not guarantee legal compliance with any specific regulation — consult a qualified attorney in the relevant jurisdiction for legal certainty.

Feedback Process
We welcome your feedback on the accessibility of ${data.websiteUrl || '[Website URL]'}. Please let us know if you encounter accessibility barriers:

- Email: ${data.contactEmail || '[Your email address]'}

We try to respond to feedback within 5 business days.

This statement was created using WCAG Scanner's Accessibility Statement Generator (https://wcag-scanner-tau.vercel.app/statement-generator).`;
}

export default function StatementGenerator() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLPreElement>(null);

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setGenerated(false);
  };

  const statement = generateStatement(form);

  const handleGenerate = () => {
    setGenerated(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(statement);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([statement], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-statement-${form.companyName || 'your-site'}.txt`.replace(/[^a-zA-Z0-9.-]/g, '-');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-2 gap-8"
      >
        {/* Form */}
        <div className="space-y-4 glass-panel rounded-2xl p-5 glow-border">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Company Name *</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              placeholder="Your Company Inc."
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Website URL *</label>
            <input
              type="text"
              value={form.websiteUrl}
              onChange={(e) => updateField('websiteUrl', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors text-sm"
            />
          </div>

          <div>
              <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="wcag-level">WCAG Target Level</label>
            <select
              id="wcag-level"
              aria-label="WCAG Target Level"
              value={form.wcagLevel}
              onChange={(e) => updateField('wcagLevel', e.target.value)}
              className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm appearance-none"
            >
              <option value="A">Level A</option>
              <option value="AA">Level AA (Recommended)</option>
              <option value="AAA">Level AAA</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Contact Email</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder="accessibility@example.com"
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Last Audit Date</label>
            <input
              type="date"
              aria-label="Last audit date"
              value={form.lastAuditDate}
              onChange={(e) => updateField('lastAuditDate', e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary outline-none focus:border-accent transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Known Issues</label>
            <textarea
              value={form.knownIssues}
              onChange={(e) => updateField('knownIssues', e.target.value)}
              placeholder="e.g., Some older PDF documents may not be fully accessible. Third-party embedded content may not meet our accessibility standards."
              rows={3}
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Planned Improvements</label>
            <textarea
              value={form.plannedImprovements}
              onChange={(e) => updateField('plannedImprovements', e.target.value)}
              placeholder="e.g., We plan to conduct a full manual accessibility audit by Q2 2025 and remediate all identified issues. We will also provide accessibility training for our content editors."
              rows={3}
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors text-sm resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!form.companyName || !form.websiteUrl}
            className="w-full px-6 py-3 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Generate Statement
          </button>
        </div>

        {/* Preview */}
        <div className="glass-panel rounded-2xl p-5 glow-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {generated ? 'Your Accessibility Statement' : 'Preview'}
            </h3>
            {generated && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-surface-elevated transition-colors flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Star className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-surface-elevated transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  .txt
                </button>
              </div>
            )}
          </div>
          <pre
            ref={previewRef}
            className="bg-background/70 border border-border rounded-xl p-4 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed overflow-y-auto max-h-[600px]"
          >
            {generated ? statement : 'Fill out the form and click "Generate Statement" to see your EU/UK-compliant accessibility statement.'}
          </pre>
          <p className="text-xs text-muted-foreground mt-3">
            This generator creates a draft statement for reference. Review and customize it for your specific
            situation. Results are not legal advice.{' '}
            <Link href="/disclaimer" className="text-primary hover:text-primary/80 underline">
              Learn more
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
