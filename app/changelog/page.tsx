'use client';

import { motion } from 'framer-motion';
import { Sparkles, Code, Bug, Zap, Shield, Rocket, Star, ArrowRight, ScanLine } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

type VersionEntry = {
  version: string;
  date: string;
  tag: 'major' | 'minor' | 'patch';
  title: string;
  highlights: { icon: typeof Sparkles; text: string }[];
};

const changelog: VersionEntry[] = [
  {
    version: '1.5.0',
    date: 'July 22, 2026',
    tag: 'major',
    title: 'Monitoring Dashboard & Per-Page Breakdown',
    highlights: [
      { icon: Rocket, text: 'Per-site monitoring dashboard with batch-level aggregate scores' },
      { icon: Code, text: 'Per-page breakdown view showing violations for each scanned URL' },
      { icon: Shield, text: 'Monitoring Reports page with starter+ gating for compliance teams' },
      { icon: Zap, text: 'Score trend now reflects true batch averages across all pages' },
    ],
  },
  {
    version: '1.4.0',
    date: 'July 15, 2026',
    tag: 'minor',
    title: 'Client Portals & GitHub Actions Integration',
    highlights: [
      { icon: Rocket, text: 'Per-client monitoring portals for agency customers' },
      { icon: Code, text: 'GitHub Actions integration for CI/CD pipeline scanning' },
      { icon: Shield, text: 'Automated multi-page scans via GitHub Actions workers' },
    ],
  },
  {
    version: '1.3.0',
    date: 'July 8, 2026',
    tag: 'major',
    title: 'Multi-Scan Engine & VPAT Generation',
    highlights: [
      { icon: Rocket, text: 'Multi-page scanning engine — crawl entire sites up to 25 pages' },
      { icon: Star, text: 'VPAT & ACR document generation for enterprise procurement' },
      { icon: Shield, text: 'Batch scan reports with per-page compliance breakdowns' },
      { icon: Bug, text: 'Fixed screenshot capture for dynamically rendered SPAs' },
    ],
  },
  {
    version: '1.2.0',
    date: 'June 25, 2026',
    tag: 'minor',
    title: 'AI-Powered Fixes & Compliance Assistant',
    highlights: [
      { icon: Zap, text: 'AI fix engine — get code-level remediation for each violation' },
      { icon: Sparkles, text: 'Compliance Assistant chatbot for real-time WCAG guidance' },
      { icon: Rocket, text: 'WCAG 2.2 support added alongside 2.1' },
    ],
  },
  {
    version: '1.1.0',
    date: 'June 10, 2026',
    tag: 'minor',
    title: 'Monitoring & Alerts',
    highlights: [
      { icon: Shield, text: 'Site monitoring with scheduled re-scans (weekly/bi-weekly/monthly)' },
      { icon: Code, text: 'Regression alerts when compliance score drops below threshold' },
      { icon: Bug, text: 'Email notifications for scan completion and alert triggers' },
    ],
  },
  {
    version: '1.0.0',
    date: 'May 20, 2026',
    tag: 'major',
    title: 'Public Launch 🚀',
    highlights: [
      { icon: Rocket, text: 'Single-page WCAG 2.1 AA scan engine powered by axe-core' },
      { icon: Star, text: 'Free tier with 3 scans/month — no credit card required' },
      { icon: Shield, text: 'Starter, Growth & Enterprise plans with tiered pricing' },
      { icon: Zap, text: 'PDF report generation with compliance statements' },
      { icon: Sparkles, text: 'ADA lawsuit risk scoring with jurisdiction-specific analysis' },
      { icon: Code, text: 'Contrast checker and accessibility statement generator' },
    ],
  },
];

const tagColors: Record<string, string> = {
  major: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  minor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  patch: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 pb-20 bg-background">
        {/* Background effects */}
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              What&apos;s New
            </motion.span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
              Changelog
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every update, improvement, and fix that makes WCAG Scanner better for you.
            </p>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />

            {changelog.map((entry, i) => (
              <motion.div
                key={entry.version}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
                className="relative pl-14 pb-12 last:pb-0"
              >
                {/* Timeline dot */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.3, type: 'spring' }}
                  className={`absolute left-[11px] top-1.5 w-[17px] h-[17px] rounded-full border-2 border-background ${
                    entry.tag === 'major'
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                      : entry.tag === 'minor'
                      ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                      : 'bg-amber-500 shadow-lg shadow-amber-500/30'
                  }`}
                >
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-inherit" />
                </motion.div>

                {/* Card */}
                <div className="glass-panel rounded-2xl p-6 glow-border hover:border-primary/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-foreground tracking-tight">
                        v{entry.version}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${tagColors[entry.tag]}`}>
                        {entry.tag === 'major' ? 'Major Release' : entry.tag === 'minor' ? 'Update' : 'Patch'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>

                  <h3 className="text-base font-semibold text-foreground mb-3">{entry.title}</h3>

                  <ul className="space-y-2">
                    {entry.highlights.map((h, hi) => (
                      <motion.li
                        key={hi}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 + hi * 0.03, duration: 0.3 }}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <h.icon className="w-3 h-3 text-primary" />
                        </span>
                        <span className="text-muted-foreground">{h.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-16 text-center"
          >
            <div className="glass-panel rounded-2xl p-8 glow-border">
              <ScanLine className="w-8 h-8 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Stay up to date</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Follow us on GitHub to get notified about every new release.
              </p>
              <Link
                href="https://github.com/wcagscannerr"
                target="_blank"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm btn-magnetic shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
              >
                <Star className="w-4 h-4" />
                Watch on GitHub
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
