'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Why not just use Google Lighthouse?',
    a: "Lighthouse is a great free tool for a quick audit, but it lacks several features you need for ongoing compliance: (1) Lighthouse runs locally or via Chrome DevTools — it doesn't give you a persistent report with monitoring over time. (2) It doesn't offer AI-powered code fixes, PDF/CSV exports for legal documentation, or lawsuit risk scoring. (3) Lighthouse doesn't support site monitoring — you have to manually re-run it each time. We use the same axe-core engine under the hood, but we wrap it with the tools business owners actually need to track and prove compliance over time.",
  },
  {
    q: 'Are overlay accessibility widgets enough?',
    a: "No — and regulators agree. In 2024, the FTC fined accessiBe $1 million for false advertising, and multiple class-action lawsuits have been filed against overlay providers. Overlay widgets inject JavaScript on top of your site claiming to 'fix' accessibility, but they don't address the underlying code issues. They can actually interfere with screen readers and make things worse for users who depend on assistive technology. The only reliable path to compliance is fixing the actual code — which is what our scanner helps you identify and fix, with no false promises or magical shortcuts.",
  },
];

export default function ComparisonFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto mt-12">
      <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-elevated/50 transition-colors"
              aria-expanded={openIndex === i}
            >
              <span className="font-medium text-text-primary pr-4">{faq.q}</span>
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
          </div>
        ))}
      </div>
    </div>
  );
}