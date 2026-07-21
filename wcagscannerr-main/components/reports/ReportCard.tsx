import Link from 'next/link';
import { FileText, Calendar, ExternalLink } from 'lucide-react';
import { formatDateShort, getScoreColor, getScoreLabel } from '@/lib/utils';

interface Props {
  report: {
    id: string;
    scan_id: string;
    name?: string | null;
    created_at: string;
    scans?: {
      url: string;
      compliance_score: number | null;
      total_violations: number;
    };
  };
}

export default function ReportCard({ report }: Props) {
  const score = report.scans?.compliance_score ?? 0;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const url = report.scans?.url || '';

  return (
    <Link
      href={`/reports/${report.id}`}
      className="block bg-surface border border-border rounded-xl p-5 hover:border-accent/30 hover:shadow-glow transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-extrabold"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {score}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{report.name || url}</h3>
            <p className="text-xs text-text-muted">{report.scans?.url?.slice(0, 40)}{(report.scans?.url?.length || 0) > 40 ? '...' : ''}</p>
          </div>
        </div>
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDateShort(report.created_at)}</span>
        </div>
        <span>{report.scans?.total_violations || 0} violations</span>
      </div>
    </Link>
  );
}