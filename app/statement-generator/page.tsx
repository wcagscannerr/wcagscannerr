import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import StatementGenerator from '@/components/landing/StatementGenerator';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Accessibility Statement Generator | WCAG Scanner',
  description:
    'Generate a free EU/UK-compliant accessibility statement for your website. No signup required. Download as .txt or copy to clipboard.',
  openGraph: {
    title: 'Accessibility Statement Generator | WCAG Scanner',
    description: 'Generate a free EU/UK-compliant accessibility statement for your website. No signup required.',
    url: 'https://www.wcagscannerr.com/statement-generator',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function StatementGeneratorPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-24 pb-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="mb-10 glass-panel rounded-2xl p-6 glow-border">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Accessibility Statement Generator
            </h1>
            <p className="text-muted-foreground text-sm">
              Create an EU/UK-compliant accessibility statement for your website. Fill out the form
              and get a ready-to-use statement. No signup required.
            </p>
          </div>

          <StatementGenerator />
        </div>
      </main>
      <Footer />
    </>
  );
}
