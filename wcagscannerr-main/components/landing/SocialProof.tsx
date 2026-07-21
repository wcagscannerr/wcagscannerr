'use client';

import { motion } from 'framer-motion';

const stats = [
  { value: '94.8', prefix: '', suffix: '%', label: 'of websites fail WCAG', source: 'WebAIM Million 2025' },
  { value: '5,000', prefix: '', suffix: '+', label: 'ADA lawsuits filed in 2025', source: 'Seyfarth ADA Title III' },
  { value: '1', prefix: '$', suffix: 'M', label: 'FTC fine against accessiBe', source: 'FTC 2024' },
];

function StatValue({ value, prefix, suffix }: { value: string; prefix: string; suffix: string }) {
  // SSR-correct: real numbers render in the initial HTML so no-JS clients,
  // crawlers, and the brief pre-hydration window all see the true value
  // (no "0% / 0+ / $0M" flash, no race on IntersectionObserver to populate).
  return (
    <div className="text-3xl sm:text-4xl font-extrabold gradient-text-white">
      {prefix}{value}{suffix}
    </div>
  );
}

export default function SocialProof() {
  return (
    <section className="py-16 border-y border-border bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-3 gap-8 text-center">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <StatValue value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              <p className="text-text-secondary text-sm mt-1">{stat.label}</p>
              <p className="text-text-muted text-xs mt-0.5">Source: {stat.source}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}