'use client';

import { motion } from 'framer-motion';
import { Link2, ScanLine, FileBarChart, Wand2, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01', icon: Link2, title: 'Enter Your URL',
    description: 'Paste any website URL. We support single-page scans and batch scanning for multiple URLs.',
    color: 'text-blue-400', bgColor: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    number: '02', icon: ScanLine, title: 'Automated Scan',
    description: 'Our axe-core engine runs WCAG 2.1 & 2.2 checks in under 30 seconds. We test color contrast, ARIA labels, keyboard nav, and more.',
    color: 'text-violet-400', bgColor: 'from-violet-500/20 to-purple-500/20',
  },
  {
    number: '03', icon: FileBarChart, title: 'Get Your Report',
    description: 'Receive a detailed compliance score, violation breakdown by severity, and lawsuit risk assessment based on real ADA case data.',
    color: 'text-emerald-400', bgColor: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    number: '04', icon: Wand2, title: 'Fix & Monitor',
    description: 'Use AI-generated fixes, set up weekly monitoring, and track your score improvements over time with trend analytics.',
    color: 'text-amber-400', bgColor: 'from-amber-500/20 to-orange-500/20',
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-24 lg:py-32 bg-background overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide mb-4">
            <ScanLine className="w-3.5 h-3.5" /> How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Compliance in <span className="gradient-text">4 steps</span>
          </h2>
          <p className="text-muted-foreground">From scan to fix — a streamlined workflow designed for busy teams.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="glass-panel rounded-2xl p-6 glow-border card-lift h-full">
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-bold text-muted-foreground/30">{step.number}</span>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.bgColor} border border-white/10 flex items-center justify-center`}>
                      <step.icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}