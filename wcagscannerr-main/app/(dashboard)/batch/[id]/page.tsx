'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { PerPageTable } from '@/components/reports/PerPageTable';

interface BatchPage {
  scan_id: string;
  report_id: string | null;
  url: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  score: number | null;
  violations: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  error: string | null;
}

interface BatchData {
  id: string;
  name: string;
  status: string;
  total_urls: number;
  completed_urls: number;
  failed_urls: number;
  pages: BatchPage[];
}

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/scan/batch/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load batch');
      setBatch(data);
      return data as BatchData;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [params.id]);

  const isTickingRef = useRef(false);

  const tick = useCallback(async () => {
    // Guard against overlap: if a previous tick is still running (a real
    // scan can take 10-30s), skip firing another one. Without this, a
    // slow tick was still in flight when the next 4s interval fired,
    // and two overlapping /api/scan/batch/tick calls would each try to
    // launch Chromium at the same time — which is what produced the
    // "spawn ETXTBSY" crashes (two processes racing on the same binary
    // file, one executing it while the other was still extracting it).
    if (isTickingRef.current) return;
    isTickingRef.current = true;
    try {
      await fetch('/api/scan/batch/tick', { method: 'POST' });
    } catch {
      // ignore — next poll cycle will try again
    } finally {
      isTickingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchBatch();
    tick();
    const interval = setInterval(async () => {
      const current = await fetchBatch();
      if (current && (current.status === 'completed' || current.status === 'failed' || current.status === 'partial')) {
        clearInterval(interval);
        return;
      }
      await tick();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchBatch, tick]);

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-text-primary font-medium">{error}</p>
        <Link href="/batch" className="text-sm text-accent hover:underline mt-3 inline-block">
          Start a new batch scan
        </Link>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const inProgress = batch.status === 'queued' || batch.status === 'running';
  const progressPct = batch.total_urls > 0 ? Math.round((batch.completed_urls / batch.total_urls) * 100) : 0;

  const completedPages = batch.pages.filter(p => p.status === 'completed');
  const tableData = completedPages.map(p => ({
    url: p.url,
    score: p.score ?? 0,
    violations: p.violations,
    critical: p.critical,
    topIssues: [] as string[],
    scanId: p.scan_id,
    reportId: p.report_id,
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/batch" className="text-text-secondary hover:text-text-primary text-sm mb-6 inline-flex items-center gap-2">
        ← New Batch Scan
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{batch.name}</h1>
          <p className="text-text-secondary text-sm mt-1">
            {batch.completed_urls} / {batch.total_urls} URLs scanned
            {batch.failed_urls > 0 && ` · ${batch.failed_urls} failed`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
          batch.status === 'completed' ? 'bg-green-500/20 text-green-400' :
          batch.status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
          batch.status === 'failed' ? 'bg-red-500/20 text-red-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {batch.status}
        </span>
      </div>

      {inProgress && (
        <div className="mb-8 glass-panel rounded-xl p-4 glow-border">
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Scanning a few URLs at a time in the background.
          </p>
        </div>
      )}

      {completedPages.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden glow-border mb-8">
          <h2 className="text-base font-semibold text-foreground p-5 border-b border-border">
            Per-Page Breakdown
          </h2>
          <PerPageTable pages={tableData} />
        </div>
      )}

      {/* Queued/running/failed URL list */}
      {batch.pages.some(p => p.status !== 'completed') && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-foreground mb-2">In Progress</h2>
          {batch.pages.filter(p => p.status !== 'completed').map(p => (
            <div key={p.scan_id} className="flex items-center justify-between px-4 py-3 glass-panel rounded-lg text-sm">
              <span className="text-muted-foreground truncate">{p.url}</span>
              <span className="flex items-center gap-1.5 shrink-0 ml-3">
                {p.status === 'failed' ? (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-xs">{p.error || 'Failed'}</span>
                  </>
                ) : p.status === 'running' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-muted-foreground text-xs">Scanning...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">Queued</span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {batch.status === 'completed' && completedPages.length === batch.pages.length && (
        <div className="flex items-center gap-2 text-green-400 text-sm mt-6">
          <CheckCircle2 className="w-4 h-4" /> All URLs scanned.
        </div>
      )}
    </div>
  );
}