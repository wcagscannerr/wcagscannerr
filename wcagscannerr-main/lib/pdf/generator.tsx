import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from '@react-pdf/renderer';

// Register a font (use built-in Helvetica for compatibility)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helvetica/Helvetica.ttf', fontWeight: 'normal' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1a1a1a',
  },
  coverPage: {
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C47FF',
    marginBottom: 40,
  },
  reportTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  urlText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#888',
    marginBottom: 40,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#888',
  },
  disclaimer: {
    fontSize: 9,
    color: '#aaa',
    position: 'absolute',
    bottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#6C47FF',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 20,
  },
  table: {
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e5e5',
    paddingVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2 solid #6C47FF',
    paddingVertical: 6,
    backgroundColor: '#f8f8f8',
  },
  tableCell: {
    fontSize: 10,
  },
  severityBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    color: '#fff',
  },
  violationCard: {
    marginBottom: 16,
    border: '1 solid #e5e5e5',
    borderRadius: 6,
    padding: 12,
  },
  violationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  codeBlock: {
    backgroundColor: '#f4f4f4',
    padding: 8,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  fixSteps: {
    marginTop: 4,
    marginLeft: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1 solid #e5e5e5',
    paddingTop: 8,
    fontSize: 8,
    color: '#888',
  },
  summaryCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bigSixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  bigSixCard: {
    width: '31%',
    padding: 8,
    borderRadius: 4,
    border: '1 solid #e5e5e5',
  },
  bigSixLabel: {
    fontSize: 9,
    color: '#888',
  },
  bigSixValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  regGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  regBadge: {
    width: '31%',
    padding: 10,
    borderRadius: 6,
    border: '1 solid #e5e5e5',
    marginBottom: 8,
  },
  regBadgeTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  regBadgeSub: {
    fontSize: 8,
    color: '#888',
  },
  regDisclaimer: {
    fontSize: 9,
    color: '#888',
    marginTop: 8,
    lineHeight: 1.4,
  },
});

function getScoreColor(score: number): string {
  if (score >= 75) return '#22D3A0';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case 'critical': return '#EF4444';
    case 'serious': return '#F97316';
    case 'moderate': return '#F59E0B';
    default: return '#3B82F6';
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

import { DocumentProps } from '@react-pdf/renderer';

interface Props extends DocumentProps {
  scan: any;
  violations: any[];
}

export function WCAGReportPDF({ scan, violations, ...docProps }: Props) {
  const score = scan.compliance_score || 0;
  const scoreColor = getScoreColor(score);
  const completedAt = scan.completed_at || scan.created_at || '';

  // Big six
  const bigSix = scan.big_six || {};
  const bigSixEntries = [
    { key: 'contrast', label: 'Low Contrast', value: bigSix.contrast || 0 },
    { key: 'altText', label: 'Missing Alt Text', value: bigSix.altText || bigSix.alt_text || 0 },
    { key: 'labels', label: 'Missing Labels', value: bigSix.labels || 0 },
    { key: 'links', label: 'Empty Links', value: bigSix.links || 0 },
    { key: 'buttons', label: 'Empty Buttons', value: bigSix.buttons || 0 },
    { key: 'language', label: 'Missing Language', value: bigSix.language || 0 },
  ];

  const regulatoryBadges = [
    { name: 'ADA', scope: 'United States', ref: 'References WCAG 2.1 AA' },
    { name: 'California Unruh Act', scope: 'United States', ref: 'References WCAG 2.1 AA' },
    { name: 'Section 508', scope: 'US Federal', ref: 'References WCAG 2.0 AA' },
    { name: 'UK Equality Act 2010', scope: 'United Kingdom', ref: 'References WCAG 2.1 AA' },
    { name: 'EN 301 549 / EAA', scope: 'European Union', ref: 'References WCAG 2.1 AA' },
    { name: 'Australian DDA', scope: 'Australia', ref: 'References WCAG 2.0/2.1 AA' },
    { name: 'Canada ACA / AODA', scope: 'Canada', ref: 'References WCAG 2.0 AA' },
  ];

  const Footer = () => (
    <View style={styles.footer} fixed>
      <Text>Generated by WCAG Scanner</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      <Text>Results are automated. Not legal advice.</Text>
    </View>
  );

  return (
    <Document {...docProps}>
      {/* Cover Page */}
      <Page size="A4" style={[styles.page, styles.coverPage]}>
        <Text style={styles.logoText}>WCAG Scanner</Text>
        <Text style={styles.reportTitle}>WCAG Accessibility Report</Text>
        <Text style={styles.urlText}>{scan.url}</Text>
        <Text style={styles.dateText}>Scanned on {formatDate(completedAt)}</Text>
        <View style={[styles.scoreCircle, { backgroundColor: scoreColor + '15', borderColor: scoreColor, border: `3 solid ${scoreColor}` }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
          <Text style={styles.scoreLabel}>out of 100</Text>
        </View>
        <Text style={styles.disclaimer}>
          Automated scan — not legal advice. Automated scans detect ~57% of WCAG issues.
        </Text>
        <Footer />
      </Page>

      {/* Executive Summary */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>

        <Text style={styles.subTitle}>Violations by Severity</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>Severity</Text>
            <Text style={[styles.tableCell, { flex: 1, fontWeight: 'bold' }]}>Count</Text>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>Impact</Text>
          </View>
          {[
            { label: 'Critical', count: scan.critical_count || 0, impact: 'Blocks core functionality' },
            { label: 'Serious', count: scan.serious_count || 0, impact: 'Major accessibility barrier' },
            { label: 'Moderate', count: scan.moderate_count || 0, impact: 'Meaningful accessibility issue' },
            { label: 'Minor', count: scan.minor_count || 0, impact: 'Improvement opportunity' },
          ].map((row) => (
            <View style={styles.tableRow} key={row.label}>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                <Text style={{ color: getImpactColor(row.label.toLowerCase()), fontWeight: 'bold' }}>{row.label}</Text>
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{row.count}</Text>
              <Text style={[styles.tableCell, { flex: 2, color: '#888' }]}>{row.impact}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text>Total Violations</Text>
          <Text style={{ fontWeight: 'bold' }}>{scan.total_violations || 0}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text>Passed Checks</Text>
          <Text style={{ fontWeight: 'bold' }}>{violations.length > 0 ? 'Multiple' : 'All'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text>WCAG Level</Text>
          <Text style={{ fontWeight: 'bold' }}>{scan.wcag_level || 'AA'}</Text>
        </View>

        <Text style={styles.subTitle}>Big Six Violations Breakdown</Text>
        <View style={styles.bigSixGrid}>
          {bigSixEntries.map((item) => (
            <View style={styles.bigSixCard} key={item.key}>
              <Text style={styles.bigSixLabel}>{item.label}</Text>
              <Text style={[styles.bigSixValue, { color: item.value > 0 ? '#EF4444' : '#22D3A0' }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        <Footer />
      </Page>

      {/* Regulatory Coverage */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Regulatory Coverage</Text>
        <Text style={styles.subTitle}>This Scan Supports Compliance Readiness For:</Text>
        <View style={styles.regGrid}>
          {regulatoryBadges.map((b) => (
            <View style={styles.regBadge} key={b.name}>
              <Text style={styles.regBadgeTitle}>{b.name} ({b.scope})</Text>
              <Text style={styles.regBadgeSub}>{b.ref}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.regDisclaimer}>
          This automated scan tests against the WCAG 2.1 AA standard, which is the
          technical baseline referenced by all regulations listed above. This does not
          guarantee legal compliance with any specific regulation — consult a qualified
          attorney in the relevant jurisdiction for legal certainty.
        </Text>
        <Footer />
      </Page>

      {/* Violations Detail Pages */}
      {violations.map((v: any, idx: number) => (
        <Page size="A4" style={styles.page} key={`violation-${idx}`}>
          <View style={styles.violationCard}>
            <View style={styles.violationHeader}>
              <Text style={[styles.severityBadge, { backgroundColor: getImpactColor(v.impact) }]}>
                {v.impact}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', flex: 1 }}>
                {v.rule_id}
              </Text>
            </View>

            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Description</Text>
            <Text style={{ marginBottom: 12, color: '#444', lineHeight: 1.4 }}>
              {v.rule_description || v.description || v.help || ''}
            </Text>

            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>WCAG Criterion</Text>
            <Text style={{ marginBottom: 12, color: '#6C47FF' }}>
              {v.wcag_criterion || 'N/A'}
            </Text>

            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Affected Element</Text>
            <View style={styles.codeBlock}>
              <Text>{(v.element_html || '').substring(0, 500)}</Text>
            </View>

            {v.element_selector ? (
              <>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>CSS Selector</Text>
                <View style={styles.codeBlock}>
                  <Text>{v.element_selector}</Text>
                </View>
              </>
            ) : null}

            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>How to Fix</Text>
            <View style={styles.fixSteps}>
              {(v.fix_detail || v.fix_summary || '').split('\n').map((step: string, si: number) => (
                <Text key={si} style={{ marginBottom: 3, lineHeight: 1.3, color: '#444' }}>
                  {si + 1}. {step}
                </Text>
              ))}
            </View>

            {v.help_url || v.helpUrl ? (
              <>
                <Text style={{ fontWeight: 'bold', marginBottom: 4, marginTop: 12 }}>Documentation</Text>
                <Text style={{ color: '#6C47FF', fontSize: 9 }}>{v.help_url || v.helpUrl}</Text>
              </>
            ) : null}
          </View>

          <Footer />
        </Page>
      ))}
    </Document>
  );
}

export async function generatePDFReport(scan: any, violations: any[]): Promise<Buffer> {
  return renderToBuffer(<WCAGReportPDF scan={scan} violations={violations} />);
}