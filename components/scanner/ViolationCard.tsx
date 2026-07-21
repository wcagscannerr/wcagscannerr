'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, Check, X, Clock, ShieldOff, AlertTriangle, Loader2 } from 'lucide-react';
import type { ScanViolation } from '@/types/scan';
import { computeStableKeyForStatusEndpoint } from '@/lib/scanner/stableKey';
import ContrastSimulator from '@/components/scanner/ContrastSimulator';
import { cn } from '@/lib/utils';

const impactStyles = {
  critical: { bg: 'bg-severity-critical/10', border: 'border-severity-critical/30', dot: 'bg-severity-critical', badge: 'badge-critical' },
  serious: { bg: 'bg-severity-serious/10', border: 'border-severity-serious/30', dot: 'bg-severity-serious', badge: 'badge-serious' },
  moderate: { bg: 'bg-severity-moderate/10', border: 'border-severity-moderate/30', dot: 'bg-severity-moderate', badge: 'badge-moderate' },
  minor: { bg: 'bg-severity-minor/10', border: 'border-severity-minor/30', dot: 'bg-severity-minor', badge: 'badge-minor' },
};

type Status = 'open' | 'fixed' | 'false_positive' | 'in_progress';

interface Props {
  violation: ScanViolation;
  index: number;
  /** The parent ScanResult.id — required so the POST endpoint can
   * upsert against the canonical scan row. */
  scanId: string;
}

export default function ViolationCard({ violation, index, scanId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const style = impactStyles[violation.impact] || impactStyles.moderate;

  async function save(nextStatus: Status) {
    if (!scanId) return;
    setSaving(true);
    setError(null);
    try {
      const stableKey = await computeStableKeyForStatusEndpoint({
        rule_id: violation.rule_id,
        page_url: violation.page_url,
        element_html: violation.element_html,
      });
      // POST uses the explicit tuple so the server can recompute the
      // stable_key itself; we send our local copy only for debugging
      // symmetry with the GET endpoint signature.
      void stableKey;
      const res = await fetch('/api/violations/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_id: scanId,
          rule_id: violation.rule_id,
          page_url: violation.page_url,
          element_html: violation.element_html,
          status: nextStatus,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save status');
      }
      setStatus(nextStatus);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const statusBadge = status ? (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border',
        status === 'open' && 'bg-white/10 text-text-secondary border-border',
        status === 'fixed' && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        status === 'in_progress' && 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        status === 'false_positive' && 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
      )}
    >
      {status.replace('_', ' ')}
    </span>
  ) : null;

  return (
    <div className={cn('border rounded-xl overflow-hidden transition-colors', style.bg, style.border)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors"
        aria-expanded={expanded}
      >
        <span className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', style.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn('px-2 py-0.5 rounded text-xs font-semibold uppercase', style.badge)}>
              {violation.impact}
            </span>
            {(violation.node_count ?? 1) > 1 && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-white/10 text-text-secondary">
                Affects {violation.node_count} elements
              </span>
            )}
            <span className="text-xs text-text-muted font-mono">
              WCAG {violation.wcag_criterion}
            </span>
            {statusBadge}
          </div>
          <p className="font-medium text-sm">{violation.rule_description}</p>
          {violation.element_selector && (
            <p className="text-xs text-text-muted mt-1 font-mono truncate">
              {violation.element_selector}
            </p>
          )}
        </div>
        <ChevronDown className={cn(
          'w-5 h-5 text-text-muted mt-1 flex-shrink-0 transition-transform',
          expanded && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* HTML snippet */}
              {violation.element_html && (
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-1">Affected HTML:</p>
                  <pre className="bg-background border border-border rounded-lg p-3 text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap break-all font-mono">
                    {violation.element_html}
                  </pre>
                </div>
              )}

              {/* Fix instructions */}
              <div>
                <p className="text-xs font-semibold text-text-muted mb-2">How to Fix:</p>
                <p className="text-sm text-text-secondary mb-2">{violation.fix_summary}</p>
                {violation.fix_detail && (
                  <div className="bg-surface-elevated rounded-lg p-3">
                    <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                      {violation.fix_detail}
                    </pre>
                  </div>
                )}
              </div>

              {/* WCAG reference */}
              {violation.help_url && (
                <a
                  href={violation.help_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  WCAG {violation.wcag_criterion} Documentation
                </a>
              )}

              {/* Step 11 — inline color-blindness simulator for color-contrast violations. */}
              {violation.rule_id === 'color-contrast' && (
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-2">
                    Simulated view:
                  </p>
                  <ContrastSimulator
                    sampleText={violation.element_html}
                  />
                </div>
              )}

              {/* Page URL reference */}
              <p className="text-xs text-text-muted">
                Found on: <span className="font-mono">{violation.page_url}</span>
              </p>

              {/* Step 10 — status controls */}
              <div className="pt-3 border-t border-border space-y-3">
                <p className="text-xs font-semibold text-text-muted">
                  Lifecycle (Step 10) — persists across re-scans of this page:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save('fixed')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" /> Mark fixed
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save('false_positive')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500/25 disabled:opacity-50"
                  >
                    <ShieldOff className="w-3 h-3" /> False positive
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save('in_progress')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
                  >
                    <Clock className="w-3 h-3" /> In progress
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save('open')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-text-secondary border border-border hover:bg-white/20 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" /> Reset to open
                  </button>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional note (e.g. 'fixed in PR #1234', 'tracked in Linear ENG-90')"
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-text-secondary placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50"
                />
                <div className="flex items-center gap-2 text-[10px] text-text-muted min-h-[14px]">
                  {saving && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                    </>
                  )}
                  {!saving && savedAt && (
                    <span className="text-emerald-400">Saved at {savedAt}</span>
                  )}
                  {!saving && error && (
                    <span className="text-red-400 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {error}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
