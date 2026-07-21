'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, ScanLine, Code, Shield, Star } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
};

export default function AboutContent() {
  return (
    <div className="max-w-3xl mx-auto px-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="space-y-10">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-4">
            <Star className="w-3.5 h-3.5" />
            Our Story
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Hi, I'm the person behind{' '}
            <span className="gradient-text">WCAG Scanner</span>
          </h1>
          <p className="text-text-secondary leading-relaxed">
            WCAG Scanner is built and maintained by me — a solo developer and
            student who cares a lot about making the web usable for everyone.
            What started as a side project to learn more about accessibility
            turned into a tool I'm proud to share with businesses and creators.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          <div className="bg-surface border border-border rounded-xl p-5">
            <Code className="w-6 h-6 text-accent mb-3" />
            <h3 className="font-semibold text-text-primary mb-1">Real scanning</h3>
            <p className="text-sm text-text-muted">
              We read your actual HTML and run code-level WCAG checks — no shortcuts.
            </p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <Shield className="w-6 h-6 text-accent mb-3" />
            <h3 className="font-semibold text-text-primary mb-1">Always learning</h3>
            <p className="text-sm text-text-muted">
              As a student, I keep improving the engine as standards evolve.
            </p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <Star className="w-6 h-6 text-accent mb-3" />
            <h3 className="font-semibold text-text-primary mb-1">Honest by default</h3>
            <p className="text-sm text-text-muted">
              We're upfront that automated scans catch about 57% of issues.
            </p>
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }} className="space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Why accessibility matters to me</h2>
          <p className="text-text-secondary leading-relaxed">
            The web should work for everyone — people using screen readers,
            keyboard-only navigation, or just someone in a hurry on a phone.
            WCAG (the Web Content Accessibility Guidelines) is the shared
            standard that helps us get there, and it's referenced by accessibility
            laws around the world.
          </p>
          <p className="text-text-secondary leading-relaxed">
            My goal with WCAG Scanner is simple: give you a clear, honest picture
            of how accessible your site is today, show you exactly what to fix,
            and help you track it over time. No fluff, no fake "one-click compliance"
            promises — just real, actionable results you can act on.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-accent/5 border border-accent/20 rounded-2xl p-6 text-center"
        >
          <p className="text-text-primary font-medium mb-4">
            Want to see how your site scores?
          </p>
          <Link
            href="/free-scan"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
          >
            <ScanLine className="w-5 h-5" />
            Run a Free Scan
          </Link>
        </motion.div>
      </div>
    </div>
  );
}