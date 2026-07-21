'use client';

import type { ScanResult } from '@/types/scan';
import ComplianceScore from '@/components/scanner/ComplianceScore';
import BigSixSummary from '@/components/scanner/BigSixSummary';
import ViolationCard from '@/components/scanner/ViolationCard';

export default function ReportDetail({ scan }: { scan: ScanResult }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <ComplianceScore
          score={scan.compliance_score || 0}
          total={scan.total_violations}
        />
        <BigSixSummary
          bigSix={scan.big_six || { contrast: 0, alt_text: 0, labels: 0, links: 0, buttons: 0, lang: 0 }}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">All Violations</h3>
        {(scan.violations || []).map((v, i) => (
          <ViolationCard key={v.id || i} violation={v} index={i} scanId={scan.id} />
        ))}
      </div>
    </div>
  );
}