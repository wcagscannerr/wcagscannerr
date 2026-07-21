'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface FeatureRow {
  feature: string;
  us: boolean | string;
  lighthouse: boolean | string;
  accessibe: boolean | string;
  userway: boolean | string;
  manual: boolean | string;
}

const rows: FeatureRow[] = [
  { feature: 'Automated WCAG detection', us: true, lighthouse: true, accessibe: true, userway: true, manual: false },
  { feature: 'AI-powered code fixes', us: true, lighthouse: false, accessibe: true, userway: false, manual: false },
  { feature: 'PDF / CSV compliance reports', us: true, lighthouse: false, accessibe: false, userway: false, manual: true },
  { feature: 'Continuous monitoring', us: true, lighthouse: false, accessibe: false, userway: false, manual: false },
  { feature: 'Lawsuit risk scoring', us: true, lighthouse: false, accessibe: false, userway: false, manual: false },
  { feature: 'Honest about limitations (57% detection)', us: true, lighthouse: true, accessibe: false, userway: false, manual: true },
  { feature: 'Price', us: 'From $25/mo', lighthouse: 'Free', accessibe: 'From $49/mo', userway: 'From $129/mo', manual: '$5k – $30k+' },
  { feature: 'Free tier available', us: true, lighthouse: true, accessibe: false, userway: false, manual: false },
];

const headers = [
  { key: 'us' as const, label: 'WCAG Scanner', accent: true },
  { key: 'lighthouse' as const, label: 'Google Lighthouse', accent: false },
  { key: 'accessibe' as const, label: 'accessiBe', accent: false },
  { key: 'userway' as const, label: 'UserWay', accent: false },
  { key: 'manual' as const, label: 'Manual Audit', accent: false },
];

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value
      ? <Check className="w-5 h-5 text-success mx-auto" />
      : <X className="w-5 h-5 text-text-muted mx-auto" />;
  }
  return <span className="text-sm font-medium text-text-primary">{value}</span>;
}

export default function ComparisonTable() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-surface border border-border rounded-xl overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 font-semibold text-text-primary w-[200px] min-w-[160px]">
                Feature
              </th>
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={`text-center p-4 font-semibold min-w-[120px] ${
                    h.accent ? 'text-accent bg-accent/5' : 'text-text-primary'
                  }`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isPriceRow = row.feature === 'Price';
              return (
                <tr
                  key={i}
                  className={`border-b border-border last:border-0 ${
                    isPriceRow ? 'bg-surface-elevated/30' : ''
                  }`}
                >
                  <td className="p-4 text-text-secondary font-medium">
                    {row.feature}
                  </td>
                  {headers.map((h) => (
                    <td
                      key={h.key}
                      className={`p-4 text-center ${h.accent ? 'bg-accent/5' : ''}`}
                    >
                      <Cell value={row[h.key]} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border bg-background/50">
        <p className="text-xs text-text-muted text-center leading-relaxed">
          Feature coverage based on publicly available information as of 2025. Manual audit cost is an industry
          estimate and varies by provider and scope.
        </p>
      </div>
    </motion.div>
  );
}