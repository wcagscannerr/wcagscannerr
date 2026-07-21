import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help | WCAG Scanner',
  description: 'Find answers to common questions about WCAG Scanner, accessibility scanning, subscriptions, and WCAG compliance.',
  openGraph: {
    title: 'Help | WCAG Scanner',
    description: 'Find answers to common questions about WCAG Scanner, accessibility scanning, subscriptions, and WCAG compliance.',
    url: 'https://www.wcagscannerr.com/help',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function HelpPage() {
  const faqItems = [
    {
      q: 'What standards does the scanner check against?',
      a: 'We scan against WCAG 2.1 Levels A and AA using axe-core, the industry-standard accessibility testing engine used by Google, Microsoft, and Deque Systems. We cover approximately 57% of WCAG success criteria — the rest requires manual review by an accessibility expert.'
    },
    {
      q: 'How is my compliance score calculated?',
      a: 'Your score starts at 100 and deductions are applied for each violation found: Critical (-10), Serious (-6), Moderate (-3), and Minor (-1). The score reflects how many automated accessibility issues were detected — it does not guarantee legal compliance.'
    },
    {
      q: 'What are the Big Six violations?',
      a: 'The "Big Six" are the six WCAG violation types that appear in over 96% of ADA lawsuits: Color Contrast, Alt Text, Form Labels, Link Names, Button Names, and Language. If your scan shows these, prioritize fixing them first.'
    },
    {
      q: 'How does weekly site monitoring work?',
      a: 'Add a URL in the Monitoring section, choose weekly or monthly frequency. Our cron job runs daily at 9 AM UTC, checks if your site is due for a scan, runs the scan, and emails you the results. You can monitor up to 5 sites on Pro, 25 on Agency.'
    },
    {
      q: 'Can I use this for legal defense?',
      a: 'Our reports show your proactive effort to identify and fix accessibility issues, which is valuable in demonstrating good faith. However, automated scans are not a substitute for professional legal review or manual accessibility testing. Always consult an attorney for case-specific advice.'
    },
    {
      q: 'How do I download my reports?',
      a: 'On any report page, you can: Download PDF (a formatted PDF report), Export CSV (spreadsheet of all violations for your team), or Generate Statement (an HTML accessibility statement page for your website — Pro/Agency plans only).'
    },
    {
      q: 'What is the Compliance Assistant?',
      a: 'The Compliance Assistant is an AI-powered chatbot (Pro/Agency only) that answers questions about your specific scan results. It knows about your violations, explains what the rules mean, suggests fixes for common platforms like WordPress and Shopify, and helps you understand legal risk — all using DeepSeek or Claude AI.'
    },
    {
      q: 'How accurate is the Lawsuit Risk Score?',
      a: 'The risk score is based on statistical analysis of 2025 ADA lawsuit data. Overlay widgets (+15 risk), Big Six violations (+3 each), and Critical/Serious violations (+10/+6 each) all correlate with higher lawsuit rates. It is not a prediction — it is a statistical indicator based on documented patterns.'
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Help & How It Works</h1>
        <p className="text-text-secondary text-sm mt-1">Everything you need to understand accessibility scanning and compliance.</p>
      </div>

      {/* 1. How Scanning Works */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">1. How Scanning Works</h2>
        <div className="glass-panel rounded-xl p-5 glow-border">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Our scanner uses <strong className="text-foreground">axe-core v4.6</strong>, the same engine trusted by Google Lighthouse, Microsoft Accessibility Insights, and Deque Systems. When you enter a URL and click Scan, we launch a headless Chromium browser, load your page, inject axe-core, and run all WCAG 2.1 Level A and AA rules automatically.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mt-3">
            <strong className="text-foreground">Important:</strong> Automated scanning detects approximately <strong className="text-primary">57% of WCAG success criteria</strong>. Issues like keyboard navigation, focus order, meaningful alt text quality, and video captions require manual testing by a human. Our tool is designed to catch the technical violations that represent the highest legal exposure, not replace expert review.
          </p>
        </div>
      </section>

      {/* 2. Understanding Your Score */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">2. Understanding Your Score</h2>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-gray-300 text-sm leading-relaxed">
            Your compliance score starts at <strong className="text-green-400">100</strong> and deductions are applied for each violation found:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-background rounded-lg p-3 text-center">
              <p className="text-red-400 text-xl font-bold">-10</p>
              <p className="text-text-secondary text-xs mt-1">Critical</p>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <p className="text-orange-400 text-xl font-bold">-6</p>
              <p className="text-text-secondary text-xs mt-1">Serious</p>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <p className="text-yellow-400 text-xl font-bold">-3</p>
              <p className="text-text-secondary text-xs mt-1">Moderate</p>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <p className="text-blue-400 text-xl font-bold">-1</p>
              <p className="text-text-secondary text-xs mt-1">Minor</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed mt-3">
            Final score is capped between <strong className="text-text-primary">0-100</strong>. A score above 75 is good, above 90 is excellent. The score is based purely on automated findings and is not a legal compliance guarantee.
          </p>
        </div>
      </section>

      {/* 3. Understanding Severity Levels */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">3. Understanding Severity Levels</h2>
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-3">
            <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-red-500/10 text-red-400 shrink-0 mt-0.5">Critical</span>
            <p className="text-gray-300 text-sm">These are the violations that plaintiff law firms scan for first. Fix them immediately — they are strong indicators in ADA demand letters and lawsuits. Examples: missing alt text on functional images, empty buttons, unlabeled form fields.</p>
          </div>
          <div className="flex gap-3">
            <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">Serious</span>
            <p className="text-gray-300 text-sm">Violations that significantly impact usability for people with disabilities. Often cited in lawsuits alongside critical issues. Examples: low color contrast, missing form labels, keyboard trap.</p>
          </div>
          <div className="flex gap-3">
            <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-yellow-500/10 text-yellow-400 shrink-0 mt-0.5">Moderate</span>
            <p className="text-gray-300 text-sm">Less severe but still meaningful accessibility barriers. These add up across a site and contribute to a poor user experience. Best to fix within your development cycle.</p>
          </div>
          <div className="flex gap-3">
            <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">Minor</span>
            <p className="text-gray-300 text-sm">Low-impact findings that improve polish and inclusivity. These are rarely the focus of legal action but fixing them demonstrates strong commitment to accessibility.</p>
          </div>
        </div>
      </section>

      {/* 4. Setting Up Monitoring */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">4. Setting Up Monitoring (Pro/Agency)</h2>
        <div className="bg-surface border border-border rounded-xl p-5">
          <ol className="list-decimal list-inside text-gray-300 text-sm space-y-2">
            <li>Go to the <Link href="/monitoring" className="text-primary hover:text-primary/80">Monitoring</Link> page</li>
            <li>Click <strong className="text-text-primary">Add Site</strong>, enter the URL and choose weekly or monthly frequency</li>
            <li>Our cron job runs <strong className="text-text-primary">daily at 9 AM UTC</strong> and scans any sites that are due</li>
            <li>You receive an email report with the compliance score and violation breakdown</li>
            <li>Toggle monitoring on/off anytime — your scan history is preserved</li>
          </ol>
          <p className="text-text-secondary text-xs mt-3">Pro plan includes up to 5 monitored sites. Agency plan includes up to 25.</p>
        </div>
      </section>

      {/* 5. Compliance Assistant */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">5. Using the Compliance Assistant (Pro/Agency)</h2>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-gray-300 text-sm leading-relaxed">
            The <strong className="text-text-primary">Compliance Assistant</strong> is an AI chatbot that knows your exact scan data. Open it from the bottom-right corner of any report page. You can ask:
          </p>
          <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1">
            <li>"Why is color contrast important?"</li>
            <li>"How do I fix this specific violation on WordPress?"</li>
            <li>"What is my legal risk with these violations?"</li>
            <li>"Explain WCAG 2.4.1 in plain English"</li>
          </ul>
          <p className="text-text-secondary text-xs mt-3">The assistant is not a lawyer. Always consult a professional for legal advice.</p>
        </div>
      </section>

      {/* 6. Downloading Reports */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">6. Downloading Reports</h2>
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-semibold shrink-0">PDF</span>
            <div>
              <p className="text-text-primary text-sm font-medium">Download PDF</p>
              <p className="text-text-secondary text-xs mt-0.5">A formatted A4 PDF report showing your compliance score, violation count by severity, and a detailed table of all violations with fix suggestions. Available on all plans.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-semibold shrink-0">CSV</span>
            <div>
              <p className="text-text-primary text-sm font-medium">Export CSV</p>
              <p className="text-text-secondary text-xs mt-0.5">A spreadsheet-friendly CSV file with all violation details (Rule ID, Impact, Description, WCAG Criterion, HTML element, Fix summary, Help URL). Available on all plans.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-semibold shrink-0">HTML</span>
            <div>
              <p className="text-text-primary text-sm font-medium">Generate Statement (Pro/Agency)</p>
              <p className="text-text-secondary text-xs mt-0.5">An HTML accessibility statement page you can publish on your website. Shows your actual compliance status and remaining issues — legally more credible than generic boilerplate templates. Required by EU Accessibility Act for many businesses.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">7. Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqItems.map((item, i) => (
            <details key={i} className="glass-panel rounded-xl group glow-border">
              <summary className="px-5 py-4 text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors list-none flex items-center justify-between">
                {item.q}
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 8. Still need help? */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">8. Still need help?</h2>
        <div className="bg-surface border border-border rounded-xl p-5 text-center">
          <p className="text-gray-300 text-sm">
            Contact us at <a href="mailto:reports@wcagscannerr.com" className="text-primary hover:text-primary/80">reports@wcagscannerr.com</a>
          </p>
          <p className="text-gray-500 text-xs mt-1">We typically respond within 24 hours on business days.</p>
        </div>
      </section>
    </div>
  )
}