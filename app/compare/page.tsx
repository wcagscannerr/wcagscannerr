import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ComparisonTable from '@/components/landing/ComparisonTable';
import ComparisonFAQ from '@/components/landing/ComparisonFAQ';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'WCAG Scanner vs Competitors | WCAG Scanner',
  description:
    'See how WCAG Scanner compares to Google Lighthouse, accessiBe, UserWay, and manual audits. Honest feature-by-feature comparison.',
  openGraph: {
    title: 'WCAG Scanner vs Competitors | WCAG Scanner',
    description: 'Honest feature-by-feature comparison of WCAG Scanner vs Google Lighthouse, accessiBe, UserWay, and manual audits.',
    url: 'https://www.wcagscannerr.com/compare',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function ComparePage() {
  const regulatoryBadges = [
    { name: 'ADA', scope: 'United States', ref: 'References WCAG 2.1 AA' },
    { name: 'California Unruh Act', scope: 'United States', ref: 'References WCAG 2.1 AA' },
    { name: 'Section 508', scope: 'US Federal', ref: 'References WCAG 2.0 AA' },
    { name: 'UK Equality Act 2010', scope: 'United Kingdom', ref: 'References WCAG 2.1 AA' },
    { name: 'EN 301 549 / EAA', scope: 'European Union', ref: 'References WCAG 2.1 AA' },
    { name: 'Australian DDA', scope: 'Australia', ref: 'References WCAG 2.0/2.1 AA' },
    { name: 'Canada ACA / AODA', scope: 'Canada', ref: 'References WCAG 2.0 AA' },
  ];

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

          <div className="mb-10 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              How We <span className="gradient-text">Compare</span>
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Not all accessibility tools are created equal. Here's an honest look at what
              each option offers — including our own limitations.
            </p>
          </div>

          <ComparisonTable />
          <ComparisonFAQ />

          <section className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
                Regulatory <span className="gradient-text">Coverage</span>
              </h2>
              <p className="text-text-secondary max-w-2xl mx-auto">
                This scan supports compliance readiness for the following regulations.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {regulatoryBadges.map((b) => (
                <div key={b.name} className="bg-surface border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-text-primary">{b.name}</h3>
                  <p className="text-sm text-text-muted">{b.scope}</p>
                  <p className="text-xs text-accent mt-1">{b.ref}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted text-center mt-6 max-w-2xl mx-auto">
              This automated scan tests against the WCAG 2.1 AA standard, which is the
              technical baseline referenced by all regulations listed above. This does not
              guarantee legal compliance with any specific regulation — consult a qualified
              attorney in the relevant jurisdiction for legal certainty.
            </p>
          </section>

          <div className="mt-12 text-center">
            <p className="text-text-secondary mb-4">Ready to see how your site scores?</p>
            <Link
              href="/free-scan"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
            >
              Get Your Free Scan
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}