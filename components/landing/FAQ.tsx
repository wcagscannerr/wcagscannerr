'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What is WCAG and why should I care?',
    a: 'WCAG (Web Content Accessibility Guidelines) is the international standard for web accessibility. If your website doesn\'t meet WCAG standards, you risk ADA lawsuits, lose potential customers with disabilities, and damage your brand reputation. The number of ADA lawsuits has doubled year-over-year.',
  },
  {
    q: 'Can automated scanning fully replace manual testing?',
    a: 'No — and we\'re transparent about this. Automated scanning (including ours) detects about 57% of WCAG issues. The remaining 43% require manual human testing. We recommend using our scanner as a first pass, then having a qualified accessibility specialist review your site manually for complete compliance.',
  },
  {
    q: 'How accurate is your scanner?',
    a: 'Our scanner uses axe-core, the open-source accessibility engine developed by Deque Systems and used in Google Chrome Lighthouse and Microsoft Accessibility Insights. It\'s the industry standard for automated WCAG scanning with over 100 test rules covering WCAG 2.0 and 2.1 at levels A, AA, and AAA.',
  },
  {
    q: 'Is the free scan really free?',
    a: 'Yes — you can scan one page of any website for free, no credit card or account required. You\'ll see a compliance score and the first 3 violations. To view all violations, download PDF reports, scan multiple pages, or set up monitoring, you\'ll need a Pro or Agency subscription.',
  },
  {
    q: 'What are the "Big Six" violations?',
    a: 'The Big Six are the six WCAG violations that appear on 96% of all failing homepages: (1) Low contrast text, (2) Missing image alt text, (3) Missing form input labels, (4) Empty links, (5) Empty buttons, and (6) Missing document language. Fixing these six alone addresses the majority of accessibility barriers.',
  },
  {
    q: 'Do I need a developer to fix these issues?',
    a: 'Many of the Big Six issues are quick fixes that a website owner or content editor can resolve — like adding alt text to images, adding labels to forms, and ensuring proper heading structure. Some issues (like color contrast or ARIA attributes) may require a developer or theme customization.',
  },
  {
    q: 'What happens after I fix the issues?',
    a: 'Re-scan your site to see your compliance score improve. With a Pro or Agency plan, you can set up automatic monitoring so you\'re alerted if new issues appear. We recommend scanning every time you publish content changes or update your theme/plugins.',
  },
  {
    q: 'How is this different from overlay accessibility tools?',
    a: 'Overlay tools (like accessiBe, which the FTC fined $1M for false advertising) claim to fix accessibility by injecting JavaScript on top of your site. They don\'t fix the underlying code and can actually make things worse for screen reader users. Our tool helps you find and fix the root cause issues in your actual code.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-surface border border-border rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-elevated/50 transition-colors"
                aria-expanded={openIndex === i}
              >
                <span className="font-medium pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-text-secondary text-sm leading-relaxed">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}