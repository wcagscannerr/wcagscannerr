import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { sampleScanResult } from '@/lib/data/sample-scan';
import SampleReportViewer from '@/components/reports/SampleReportViewer';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Sample WCAG Report | WCAG Scanner',
  description:
    'See what a typical WCAG compliance scan report looks like. Understand how violations are categorized and how to fix them.',
  openGraph: {
    title: 'Sample WCAG Report | WCAG Scanner',
    description: 'Preview a sample accessibility scan report before scanning your own site.',
    url: 'https://www.wcagscannerr.com/sample-report',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function SampleReportPage() {
  const scan = sampleScanResult;
  const violations = (scan.violations || []).map((v) => ({
    ...v,
    fix_detail: v.fix_detail || v.fix_summary,
  }));

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
              Sample WCAG Report
            </h1>
            <p className="text-text-secondary text-sm">
              This is a mock scan result for a typical e-commerce homepage. It shows how violations are
              categorized by severity, with detailed fix guides for each issue. Your real scan results will
              look similar — try a{' '}
              <Link href="/free-scan" className="text-accent hover:text-accent-hover underline">
                free scan
              </Link>{' '}
              to see your own website's score.
            </p>
          </div>

          <SampleReportViewer
            score={scan.compliance_score || 0}
            totalViolations={scan.total_violations}
            violations={violations}
            criticalCount={scan.critical_count}
            seriousCount={scan.serious_count}
            moderateCount={scan.moderate_count}
            minorCount={scan.minor_count}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}