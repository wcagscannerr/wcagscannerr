'use client';

import { motion } from 'framer-motion';
import { ScanLine, Shield, Zap, BarChart3, FileText, Monitor, Wand2 } from 'lucide-react';

const features = [
  {
    icon: ScanLine,
    title: 'Instant WCAG Scanning',
    description: 'Run automated scans against WCAG 2.1 & 2.2 Level A/AA using the industry-standard axe-core engine. Results in under 30 seconds.',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
    borderColor: 'hover:border-violet-500/30',
  },
  {
    icon: Shield,
    title: 'Lawsuit Risk Assessment',
    description: 'Get a statistical risk score based on 2025 ADA lawsuit data. Identify the "Big Six" violations that appear in 96% of legal cases.',
    gradient: 'from-red-500/20 to-orange-500/20',
    iconColor: 'text-red-400',
    borderColor: 'hover:border-red-500/30',
  },
  {
    icon: BarChart3,
    title: 'Compliance Dashboard',
    description: 'Track scores over time with beautiful trend charts. Monitor multiple sites, compare historical scans, and spot regressions instantly.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
    borderColor: 'hover:border-blue-500/30',
  },
  {
    icon: FileText,
    title: 'PDF & CSV Reports',
    description: 'Generate white-labeled PDF reports with executive summaries, violation breakdowns, and remediation guides. Export raw data to CSV.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400',
    borderColor: 'hover:border-emerald-500/30',
  },
  {
    icon: Monitor,
    title: 'Continuous Monitoring',
    description: 'Set up weekly or monthly automated re-scans. Get email alerts when new critical issues appear or scores drop significantly.',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    iconColor: 'text-amber-400',
    borderColor: 'hover:border-amber-500/30',
  },
  {
    icon: Wand2,
    title: 'AI-Powered Fixes',
    description: 'Pro & Agency plans include AI-generated HTML fixes for each violation. Get platform-specific guidance for WordPress, Shopify, and React.',
    gradient: 'from-pink-500/20 to-rose-500/20',
    iconColor: 'text-pink-400',
    borderColor: 'hover:border-pink-500/30',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function Features() {
  return (
    <section className="relative py-24 lg:py-32 bg-background overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide mb-4">
            <Zap className="w-3.5 h-3.5" />
            Powerful Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything you need for <span className="gradient-text">compliance</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            From automated scanning to lawsuit risk prediction, WCAG Scanner gives you 
            the complete toolkit for digital accessibility.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial={containerVariants.hidden}
          whileInView={containerVariants.visible}
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className={`group relative glass-panel rounded-2xl p-6 glow-border ${feature.borderColor} card-lift`}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}