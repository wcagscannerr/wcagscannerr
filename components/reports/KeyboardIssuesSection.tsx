'use client';

/**
 * KeyboardIssuesSection — Displays keyboard navigation test results
 * 
 * Props:
 * - issues: Array of KeyboardIssue from scan result
 */

import { Keyboard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardIssue {
  type: 'focus_trap' | 'focus_loss' | 'missing_skip_link' | 'skipped_heading';
  message: string;
  element?: string;
  tabIndex: number;
}

interface KeyboardIssuesSectionProps {
  issues: KeyboardIssue[];
  className?: string;
}

export function KeyboardIssuesSection({ issues, className }: KeyboardIssuesSectionProps) {
  if (!issues || issues.length === 0) {
    return (
      <div className={cn("bg-card rounded-2xl border border-border p-6", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Keyboard className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Keyboard Navigation</h3>
            <p className="text-sm text-text-muted">Tab order and focus management</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-text-secondary">
            No keyboard issues detected. Tab navigation works correctly.
          </p>
        </div>
      </div>
    );
  }

  const typeLabels: Record<string, { label: string; color: string }> = {
    focus_trap: { label: 'Focus Trap', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    focus_loss: { label: 'Focus Loss', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    missing_skip_link: { label: 'Missing Skip Link', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    skipped_heading: { label: 'Skipped Heading', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  };

  return (
    <div className={cn("bg-card rounded-2xl border border-border p-6", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Keyboard className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Keyboard Navigation</h3>
          <p className="text-sm text-text-muted">{issues.length} issue{issues.length !== 1 ? 's' : ''} detected</p>
        </div>
      </div>

      <div className="space-y-3">
        {issues.map((issue, i) => {
          const meta = typeLabels[issue.type] || { label: issue.type, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' };
          return (
            <div key={i} className={cn("flex items-start gap-3 p-4 rounded-xl border", meta.color)}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">{meta.label}</span>
                  {issue.tabIndex > 0 && (
                    <span className="text-xs text-text-muted">at Tab #{issue.tabIndex}</span>
                  )}
                </div>
                <p className="text-sm text-text-primary">{issue.message}</p>
                {issue.element && (
                  <code className="mt-2 block text-xs bg-background px-2 py-1 rounded text-text-muted font-mono truncate">
                    {issue.element}
                  </code>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}