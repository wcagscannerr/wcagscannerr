'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MoreVertical, FileDown, Share2, FileText, ExternalLink, Loader2, Check } from 'lucide-react';

interface Props {
  scanId: string;
  reportId: string | null;
}

export function PageActionsMenu({ scanId, reportId }: Props) {
  const [open, setOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePdf = useCallback(async () => {
    if (!reportId) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/pdf`);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wcag-report-${reportId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setPdfLoading(false);
      setOpen(false);
    }
  }, [reportId]);

  const handleShare = useCallback(async () => {
    setShareLoading(true);
    try {
      const res = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: scanId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create share link');

      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setShareLoading(false);
    }
  }, [scanId]);

  const handleStatement = useCallback(() => {
    if (!reportId) return;
    window.open(`/api/reports/${reportId}/statement`, '_blank');
    setOpen(false);
  }, [reportId]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
        aria-label="Page actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-xl z-50 py-1 text-sm">
          {reportId ? (
            <Link
              href={`/reports/${reportId}`}
              className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="w-4 h-4" /> View Full Report
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-3 py-2 text-text-muted cursor-not-allowed">
              <ExternalLink className="w-4 h-4" /> Report not ready
            </span>
          )}

          <button
            onClick={handlePdf}
            disabled={!reportId || pdfLoading}
            className="w-full flex items-center gap-2 px-3 py-2 text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
          </button>

          <button
            onClick={handleShare}
            disabled={shareLoading}
            className="w-full flex items-center gap-2 px-3 py-2 text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors disabled:opacity-50"
          >
            {shareLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : shareCopied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {shareLoading ? 'Creating link...' : shareCopied ? 'Link copied!' : 'Share Report'}
          </button>

          <button
            onClick={handleStatement}
            disabled={!reportId}
            className="w-full flex items-center gap-2 px-3 py-2 text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" /> Generate Statement
          </button>
        </div>
      )}
    </div>
  );
  }