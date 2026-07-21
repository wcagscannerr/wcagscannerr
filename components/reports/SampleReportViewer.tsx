'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, ChevronDown, ExternalLink, Code, Star } from 'lucide-react';
import type { ScanViolation } from '@/types/scan';

interface SampleViolation extends ScanViolation {
  fix_detail: string;
}

interface Props {
  score: number;
  totalViolations: number;
  violations: SampleViolation[];
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
}

function SeverityBar({ label, count, color, max }: { label: string; count: number; color: string; max: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-sm text-text-secondary w-16">{label}</span>
      <div className="flex-1 h-2.5 bg-background rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(count / max) * 100}%` }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-semibold text-text-primary w-6 text-right">{count}</span>
    </div>
  );
}

export default function SampleReportViewer({
  score,
  totalViolations,
  violations,
  criticalCount,
  seriousCount,
  moderateCount,
  minorCount,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scoreColor = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const maxCount = Math.max(criticalCount, seriousCount, moderateCount, minorCount, 1);

  return (
    <div className="space-y-8">
      {/* Score + Stats row */}
      <div className="grid md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-surface border border-border rounded-xl p-5 text-center md:col-span-1"
        >
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Compliance Score</p>
          <div className="relative w-20 h-20 mx-auto mb-2">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke={scoreColor}
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ strokeDasharray: '0 214' }}
                animate={{ strokeDasharray: `${(score / 100) * 214} 214` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold"
              style={{ color: scoreColor }}
            >
              {score}
            </span>
          </div>
          <p className="text-xs text-text-muted">out of 100</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-surface border border-border rounded-xl p-5"
        >
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Total Issues</p>
          <p className="text-3xl font-bold text-text-primary">{totalViolations}</p>
          <p className="text-xs text-text-muted mt-1">violations found</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-surface border border-border rounded-xl p-5"
        >
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Pages Scanned</p>
          <p className="text-3xl font-bold text-text-primary">1</p>
          <p className="text-xs text-text-muted mt-1">homepage</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-surface border border-border rounded-xl p-5"
        >
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">WCAG Level</p>
          <p className="text-3xl font-bold text-text-primary">AA</p>
          <p className="text-xs text-text-muted mt-1">target standard</p>
        </motion.div>
      </div>

      {/* Severity breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-surface border border-border rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-text-primary mb-4">Severity Breakdown</h3>
        <div className="space-y-3">
          <SeverityBar label="Critical" count={criticalCount} color="var(--severity-critical)" max={maxCount} />
          <SeverityBar label="Serious" count={seriousCount} color="var(--severity-serious)" max={maxCount} />
          <SeverityBar label="Moderate" count={moderateCount} color="var(--severity-moderate)" max={maxCount} />
          <SeverityBar label="Minor" count={minorCount} color="var(--severity-minor)" max={maxCount} />
        </div>
      </motion.div>

      {/* Violations list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          All Violations ({totalViolations})
        </h3>

        <div className="space-y-3">
          {violations.map((v) => {
            const isExpanded = expandedId === v.id;
            const impactColor =
              v.impact === 'critical' ? 'var(--severity-critical)' :
              v.impact === 'serious' ? 'var(--severity-serious)' :
              v.impact === 'moderate' ? 'var(--severity-moderate)' : 'var(--severity-minor)';

            return (
              <div
                key={v.id}
                className="bg-surface border border-border rounded-xl overflow-hidden transition-all hover:border-accent/20"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface-elevated/50 transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: impactColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: impactColor + '20', color: impactColor }}
                      >
                        {v.impact}
                      </span>
                      <span className="text-xs text-text-muted font-mono">{v.rule_id}</span>
                    </div>
                    <p className="text-sm font-medium text-text-primary">{v.rule_description}</p>
                    <p className="text-xs text-text-muted mt-1">{v.wcag_criterion && `WCAG ${v.wcag_criterion}`}</p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform mt-1 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-4 space-y-4">
                      {/* Element HTML */}
                      {v.element_html && (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5">
                            <Code className="w-3.5 h-3.5" />
                            Element
                          </div>
                          <pre className="bg-background rounded-lg p-3 text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap break-all border border-border">
                            {v.element_html}
                          </pre>
                        </div>
                      )}

                      {/* How to Fix */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5">
                          <Star className="w-3.5 h-3.5" />
                          How to Fix
                        </div>
                        <p className="text-sm text-text-primary">{v.fix_summary}</p>
                        <p className="text-xs text-text-secondary mt-2 leading-relaxed">{v.fix_detail}</p>
                      </div>

                      {/* Learn more */}
                      {v.help_url && (
                        <a
                          href={v.help_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Learn more about this rule
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-accent/5 border border-accent/20 rounded-xl p-6 text-center"
      >
        <CheckCircle className="w-8 h-8 text-accent mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">Ready to scan your own site?</h3>
        <p className="text-text-secondary text-sm mb-4 max-w-md mx-auto">
          Get a free instant compliance check — no signup required. See exactly what issues your website has.
        </p>
        <a
          href="/free-scan"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
        >
          Scan Your Site Now
        </a>
      </motion.div>
    </div>
  );
}