'use client';

import { motion } from 'framer-motion';

const severityItems = [
  { label: 'Critical', count: 3, color: 'var(--severity-critical)' },
  { label: 'Serious', count: 5, color: 'var(--severity-serious)' },
  { label: 'Moderate', count: 2, color: 'var(--severity-moderate)' },
  { label: 'Minor', count: 1, color: 'var(--severity-minor)' },
];

const bigSixLabels = [
  'Contrast', 'Alt Text', 'Labels', 'Links', 'Buttons', 'Lang',
];

export default function HeroReportPreview() {
  const score = 64;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className="relative w-full max-w-md mx-auto lg:mx-0"
    >
      {/* Card */}
      <div className="relative bg-surface border border-border rounded-2xl p-6 shadow-glow overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Compliance Score</p>
            <p className="text-xs text-text-muted mt-0.5">Automated scan result</p>
          </div>
          {/* Score circle */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border)" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke={score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)'}
                strokeWidth="4"
                strokeDasharray={`${(score / 100) * 176} 176`}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-extrabold ${
              score >= 75 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger'
            }`}>
              {score}
            </span>
          </div>
        </div>

        {/* Severity bars */}
        <div className="space-y-2 mb-5">
          {severityItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-text-secondary flex-1">{item.label}</span>
              <div className="w-24 h-1.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (item.count / 5) * 100)}%`, backgroundColor: item.color }}
                />
              </div>
              <span className="text-xs font-semibold text-text-primary w-4 text-right">{item.count}</span>
            </div>
          ))}
        </div>

        {/* Big Six chips */}
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-2">Big Six</p>
          <div className="flex flex-wrap gap-1.5">
            {bigSixLabels.map((label) => (
              <span
                key={label}
                className="px-2 py-0.5 text-xs rounded-full bg-background border border-border text-text-muted"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Action hint */}
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-text-muted text-center">
            Enter your URL above to get your real score
          </p>
        </div>
      </div>
    </motion.div>
  );
}