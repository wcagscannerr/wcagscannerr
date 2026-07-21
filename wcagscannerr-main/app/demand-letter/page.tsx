import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DemandLetterGuide from '@/components/landing/DemandLetterGuide';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Received an ADA Demand Letter? | WCAG Scanner',
  description:
    'Step-by-step guide on what to do if you receive an ADA website accessibility demand letter. Sample response template, FAQ, and free compliance scan.',
  openGraph: {
    title: 'Received an ADA Demand Letter? | WCAG Scanner',
    description: 'What to do if you receive an ADA website accessibility demand letter. Free scan, response template, and legal guidance.',
    url: 'https://www.wcagscannerr.com/demand-letter',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function DemandLetterPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
              Received an ADA Demand Letter? Here's What to Do
            </h1>
            <p className="text-text-secondary text-sm">
              If you've received an ADA website accessibility demand letter, don't panic.
              Courts reward good-faith remediation. This guide walks you through your options.
            </p>
          </div>

          <DemandLetterGuide />
        </div>
      </main>
      <Footer />
    </>
  );
}