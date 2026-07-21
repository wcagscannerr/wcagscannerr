'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, FileText, ChevronDown } from 'lucide-react';
import Link from 'next/link';

const faqs = [
  {
    q: 'Can an automated scan count as good-faith remediation?',
    a: 'Yes. Courts have recognized that site owners who take proactive steps toward accessibility are acting in good faith. Having documented scan reports before or immediately after receiving a demand letter demonstrates you are not willfully non-compliant. While automated scans only detect ~57% of WCAG issues, they are a recognized starting point and courts factor this into damages.',
  },
  {
    q: 'Does having a compliance report help in court?',
    a: 'Absolutely. One of the strongest defenses in an ADA lawsuit is demonstrating timely, documented remediation efforts. PDF reports with timestamps showing before-and-after scores, along with a record of specific fixes made, provide concrete evidence that you took the matter seriously and acted promptly.',
  },
  {
    q: 'Should I respond to the demand letter myself?',
    a: 'You can respond acknowledging receipt and outlining your remediation plan, but we strongly recommend consulting an attorney before sending any formal response. What you say in writing can be used against you. Use our template as a starting point for discussion with your legal counsel, not as a final response.',
  },
  {
    q: 'What if I fix everything but still get sued?',
    a: 'Unfortunately, some plaintiffs\' attorneys file suit regardless of remediation. However, if you can demonstrate that your site was made accessible and that you have documentation of your efforts, the court may dismiss the case or significantly reduce damages. Some states also have &#8220;right to cure&#8221; laws that give you a window to fix issues before a lawsuit proceeds.',
  },
];

const templateText = `[Your Name / Company Name]
[Your Address]
[Date]

Re: Accessibility Compliance — Good Faith Remediation Response

Dear [Law Firm or Plaintiff Name],

We acknowledge receipt of your correspondence regarding website accessibility
concerns. We take these matters seriously and are committed to providing an
accessible digital experience for all users.

We have already taken the following steps:

1. Conducted a comprehensive WCAG accessibility audit using automated
   scanning tools (axe-core engine) on [Date].
2. Identified and documented all accessibility violations, categorized by
   severity level.
3. Implemented fixes for all critical and serious issues, with documented
   before/after evidence.
4. Established a quarterly re-scan schedule to maintain ongoing compliance.

Enclosed is our current accessibility compliance report including scan results,
remediation actions taken, and our ongoing maintenance plan.

We remain committed to achieving and maintaining WCAG 2.1 Level AA compliance
and will continue to monitor and improve our site's accessibility.

Sincerely,
[Your Name]`;

export default function DemandLetterGuide() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(templateText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-10">
      {/* What to do first */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <h2 className="text-xl font-bold">What to Do First</h2>
        </div>
        <ol className="space-y-4 list-decimal list-inside text-text-secondary">
          <li className="text-sm">
            <strong className="text-text-primary">Don't panic.</strong> Receiving a demand letter
            is stressful, but it does not mean an automatic lawsuit. Many demand letters are sent
            en masse and settle for reasonable amounts.
          </li>
          <li className="text-sm">
            <strong className="text-text-primary">Document everything.</strong> Save the demand letter
            and any related correspondence. Take screenshots of your website as it exists today.
            Do not make changes before documenting the current state.
          </li>
          <li className="text-sm">
            <strong className="text-text-primary">Run an immediate scan.</strong> Use our free scanner
            to document your current compliance status. The resulting report with timestamp serves
            as a baseline for your remediation efforts.
          </li>
          <li className="text-sm">
            <strong className="text-text-primary">Consult an attorney.</strong> Accessibility law is
            complex and varies by jurisdiction. An attorney specializing in ADA compliance can
            advise on the best response strategy for your specific situation.
          </li>
        </ol>
      </motion.section>

      {/* How WCAG Scanner helps */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface border border-border rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-xl font-bold">How WCAG Scanner Reports Help</h2>
        </div>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            Our compliance reports include timestamped evidence of your scan results, which can
            be used to demonstrate good-faith remediation efforts to a court or plaintiff's attorney.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>PDF reports with clear score and violation breakdown</li>
            <li>Dated evidence of your compliance status</li>
            <li>Detailed fix guides showing specific remediation steps</li>
            <li>Monitoring history proving ongoing compliance efforts</li>
          </ul>
          <div className="mt-4">
            <Link
              href="/free-scan"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              Run Your Free Scan Now
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Response template */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-surface border border-border rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-success" />
            </div>
            <h2 className="text-xl font-bold">Sample Response Template</h2>
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-surface-elevated transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
        <p className="text-sm text-text-muted mb-4">
          This is a starting point for discussion with your attorney. Do not send this without
          legal review.
        </p>
        <pre className="bg-background border border-border rounded-lg p-4 text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
          {templateText}
        </pre>
      </motion.section>

      {/* FAQ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-surface border border-border rounded-xl p-6"
      >
        <h2 className="text-xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-elevated/50 transition-colors"
                aria-expanded={openFaq === i}
              >
                <span className="font-medium text-sm text-text-primary pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-text-secondary leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}