'use client';

import { motion } from 'framer-motion';
import { Search, Settings, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const steps = [
  {
    icon: Search,
    title: '1. Scan Your Site',
    description: 'Run a free WCAG scan to identify every accessibility issue on your website.',
  },
  {
    icon: Settings,
    title: '2. Fix Critical Issues',
    description: 'Use AI-powered fix guides to resolve the most impactful violations first.',
  },
  {
    icon: FileText,
    title: '3. Download Your Report',
    description: 'Export a PDF compliance report as documentation of your good-faith remediation efforts.',
  },
];

export default function DemandLetterCTA() {
  return (
    <section className="py-20 bg-surface-elevated/30 border-y border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Received a Demand Letter?{' '}
            <span className="gradient-text">Here's What to Do</span>
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Don't panic. Courts consider good-faith remediation efforts. Here's a practical
            three-step plan to respond effectively.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-surface border border-border rounded-xl p-6 text-center hover:border-accent/20 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-text-secondary">{step.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link
            href="/demand-letter"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
          >
            Learn More
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}