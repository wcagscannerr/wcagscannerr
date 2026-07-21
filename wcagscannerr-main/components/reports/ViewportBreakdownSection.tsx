'use client';

/**
 * ViewportBreakdown — Shows per-device accessibility scores
 * 
 * Props:
 * - breakdown: Array of ViewportBreakdown from scan result
 */

import { cn } from '@/lib/utils';
import { Smartphone as SmartphoneIcon, Tablet as TabletIcon, Monitor as MonitorIcon } from 'lucide-react';

interface ViewportBreakdown {
  viewport: string;
  width: number;
  height: number;
  score: number;
  violations: number;
}

interface ViewportBreakdownProps {
  breakdown: ViewportBreakdown[];
  className?: string;
}

export function ViewportBreakdownSection({ breakdown, className }: ViewportBreakdownProps) {
  if (!breakdown || breakdown.length === 0) return null;

  const getIcon = (viewport: string) => {
    const v = viewport.toLowerCase();
    if (v.includes('mobile')) return <SmartphoneIcon className="w-5 h-5" />;
    if (v.includes('tablet')) return <TabletIcon className="w-5 h-5" />;
    return <MonitorIcon className="w-5 h-5" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 75) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 75) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  return (
    <div className={cn("bg-card rounded-2xl border border-border p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Responsive Breakdown</h3>
          <p className="text-sm text-text-muted">Scores across device viewports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {breakdown.map((vp, i) => (
          <div key={i} className={cn("rounded-xl border p-4 text-center", getScoreBg(vp.score))}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className={cn("", getScoreColor(vp.score))}>
                {getIcon(vp.viewport)}
              </div>
              <span className="text-sm font-medium text-text-primary">{vp.viewport}</span>
            </div>
            <div className={cn("text-3xl font-black mb-1", getScoreColor(vp.score))}>
              {vp.score}
            </div>
            <div className="text-xs text-text-muted mb-2">
              {vp.width} × {vp.height}
            </div>
            <div className="text-xs text-text-secondary">
              {vp.violations} violation{vp.violations !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}