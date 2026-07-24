'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, subtitle, lastUpdated, children }: Props) {
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    // Extract h2 headings from the rendered content
    const h2Elements = document.querySelectorAll('.legal-content h2');
    const items = Array.from(h2Elements).map((h2) => ({
      id: h2.id,
      text: h2.textContent || '',
    }));
    setHeadings(items);
  }, [children]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-text-secondary">{title}</span>
        </div>

        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-10">
          {/* Mobile TOC toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setMobileTocOpen(!mobileTocOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm"
            >
              <Menu className="w-4 h-4" />
              Table of Contents
            </button>
            {mobileTocOpen && (
              <div className="mt-2 bg-surface border border-border rounded-lg p-4">
                <TocList headings={headings} onItemClick={() => setMobileTocOpen(false)} />
              </div>
            )}
          </div>

          {/* Desktop TOC sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Table of Contents</h4>
              <TocList headings={headings} />
            </div>
          </aside>

          {/* Main content */}
          <main>
            {lastUpdated && (
              <div className="inline-block px-3 py-1 bg-surface border border-border rounded-full text-xs text-text-muted mb-4">
                Last Updated: {lastUpdated}
              </div>
            )}

            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-text-secondary mb-8">{subtitle}</p>

            <div className="legal-content prose prose-invert max-w-none">
              {children}
            </div>

            {/* Footer CTA */}
            <div className="mt-12 p-6 bg-surface border border-border rounded-xl text-center">
              <p className="text-text-secondary text-sm">
                Questions? Email us at{' '}
                <a
                  href="mailto:reports@wcagscannerr.com"
                  className="text-accent hover:text-accent-hover transition-colors"
                >
                  reports@wcagscannerr.com
                </a>
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function TocList({
  headings,
  onItemClick,
}: {
  headings: { id: string; text: string }[];
  onItemClick?: () => void;
}) {
  return (
    <nav className="space-y-2">
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          onClick={onItemClick}
          className="block text-sm text-text-secondary hover:text-accent transition-colors py-1"
        >
          {h.text}
        </a>
      ))}
      {headings.length === 0 && (
        <p className="text-sm text-text-muted">No sections found</p>
      )}
    </nav>
  );
}