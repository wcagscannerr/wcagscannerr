'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ScanLine, Shield } from 'lucide-react';

export default function CTA() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-surface-elevated/30 to-background" />
      <div className="absolute inset-0 mesh-glow-purple" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide mb-6">
            <Shield className="w-3.5 h-3.5" /> Start for free — no credit card required
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Ready to make your site <span className="gradient-text">accessible?</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Join thousands of developers and agencies who use WCAG Scanner to catch 
            violations before they become lawsuits. Start with a free scan today.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/scanner" className="group inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-sm btn-magnetic shadow-lg shadow-primary/25">
              <ScanLine className="w-4 h-4" />
              Run Free Scan
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 border border-border rounded-xl font-semibold text-sm text-foreground hover:bg-secondary transition-colors">
              View Pricing
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}