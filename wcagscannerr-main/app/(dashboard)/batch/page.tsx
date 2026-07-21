'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layers, ArrowRight, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export default function BatchScanPage() {
  const router = useRouter();
  const { limits, isPaid, loading: planLoading } = useSubscription();
  const [urlsText, setUrlsText] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2: batch URL cap now reads plan.limits.multiscanPageCap directly
  // instead of Math.min(25/10, pagesPerScan) — Starter=15, Growth=25,
  // Enterprise=50. Same field the multiscan API route uses.
  const maxUrls = limits.multiscanPageCap || 1;
  const urls = urlsText.split('\n').map(u => u.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (urls.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/scan/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, name: name || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create batch');
      }

      router.push(`/batch/${data.batch_id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (!planLoading && !isPaid) {
    return (
      <div className="glass-panel rounded-2xl p-10 glow-border text-center max-w-2xl mx-auto">
        <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">
          Premium Batch Scan is a Pro/Agency feature
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Scan multiple URLs at once. Upgrade to unlock premium batch scanning and see
          results for your whole site in one place.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium btn-magnetic shadow-lg shadow-primary/20"
        >
          View Plans <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 glow-border max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-1">Premium Batch Scan</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Paste up to {maxUrls} URLs — one per line. Each is scanned individually in the
        background; this page will redirect you to a progress view.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Batch name <span className="text-text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Client site — full audit"
            className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            URLs
          </label>
          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder={'https://example.com/\nhttps://example.com/pricing\nhttps://example.com/about'}
            rows={10}
            className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary outline-none focus:border-accent font-mono text-sm"
          />
          <p className={`text-xs mt-1 ${urls.length > maxUrls ? 'text-red-400' : 'text-text-muted'}`}>
            {urls.length} / {maxUrls} URLs
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || urls.length === 0 || urls.length > maxUrls}
          className="w-full py-3 bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Queuing batch...
            </>
          ) : (
            <>Start Batch Scan</>
          )}
        </button>
      </form>
    </div>
  );
}