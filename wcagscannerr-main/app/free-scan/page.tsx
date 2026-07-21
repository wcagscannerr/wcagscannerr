'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Search, Lock, Shield } from 'lucide-react';
import { useScan } from '@/hooks/useScan';
import { useUser } from '@/hooks/useUser';
import ScanProgress from '@/components/scanner/ScanProgress';
import ComplianceScore from '@/components/scanner/ComplianceScore';
import BigSixSummary from '@/components/scanner/BigSixSummary';
import Navbar from '@/components/layout/Navbar';
import EmailCaptureModal from '@/components/scanner/EmailCaptureModal';

export default function FreeScanPage() {
  const [url, setUrl] = useState('');
  const [ran, setRan] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPromptHandled, setEmailPromptHandled] = useState(false);
  const { scanResult, loading, error, startScan, resetScan } = useScan();
  const { user } = useUser();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Step 12 — Chrome extension deep-link: prepend `?url=<encoded>` to
    // the free-scan path so the extension's "See full report" CTA lands
    // on a pre-filled form. We honor the param only when the user hasn't
    // already typed a URL (so back-button + manual entry still work).
    if (!url) {
      const incomingUrl = new URLSearchParams(window.location.search).get('url');
      if (incomingUrl) {
        try {
          // Validate it parses as a URL before accepting — prevents the
          // extension from injecting arbitrary text into our form.
          new URL(incomingUrl);
          setUrl(incomingUrl);
        } catch {
          // Ignore malformed ?url= from the extension or a manual link.
        }
      }
    }

    const promptDismissed = window.sessionStorage.getItem('free-scan-email-prompt-dismissed') === '1';
    if (promptDismissed || emailPromptHandled) return;

    if (scanResult?.status === 'completed' && !user && !showEmailModal) {
      const timer = window.setTimeout(() => {
        setShowEmailModal(true);
        setEmailPromptHandled(true);
        window.sessionStorage.setItem('free-scan-email-prompt-dismissed', '1');
      }, 2000);
      return () => window.clearTimeout(timer);
    }
  }, [scanResult, user, showEmailModal, emailPromptHandled]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setRan(true);
    await startScan(url.trim(), 'AA');
  };

  const shownViolations = scanResult?.violations
    ? user
      ? scanResult.violations
      : scanResult.violations.slice(0, 3)
    : [];

  const hiddenCount = scanResult?.violations
    ? scanResult.violations.length - shownViolations.length
    : 0;

  const impactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-severity-critical';
      case 'serious': return 'bg-severity-serious';
      case 'moderate': return 'bg-severity-moderate';
      default: return 'bg-severity-minor';
    }
  };

  const impactBg = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'serious': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'moderate': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {!ran ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                Free <span className="gradient-text">WCAG Scan</span>
              </h1>
              <p className="text-text-secondary max-w-xl mx-auto mb-8">
                Enter any website URL. We'll scan one page and show you the top accessibility issues — completely free, no signup required.
              </p>

              <form onSubmit={handleScan} className="max-w-xl mx-auto">
                <div className="flex gap-2 p-1.5 bg-surface-elevated border border-border rounded-xl shadow-glow">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Enter your website URL..."
                      className="w-full pl-10 pr-4 py-3 bg-transparent text-text-primary placeholder:text-text-muted outline-none rounded-lg"
                      aria-label="Website URL to scan"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    Scan Now
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {loading && <ScanProgress />}
              {error && (
                <div className="text-center py-8">
                  <p className="text-danger mb-2">{error}</p>
                  <button
                    onClick={resetScan}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-surface-elevated"
                  >
                    Try Again
                  </button>
                </div>
              )}

{scanResult && scanResult.status === 'completed' && (
                <div className="space-y-6">
                  <EmailCaptureModal
                    isOpen={showEmailModal}
                    onClose={() => {
                      setShowEmailModal(false);
                      setEmailPromptHandled(true);
                      if (typeof window !== 'undefined') {
                        window.sessionStorage.setItem('free-scan-email-prompt-dismissed', '1');
                      }
                    }}
                    scanUrl={url}
                  />

                  <div className="grid md:grid-cols-2 gap-6">
                    <ComplianceScore score={scanResult.compliance_score || 0} total={scanResult.total_violations} />
                    <BigSixSummary bigSix={scanResult.big_six || { contrast: 0, alt_text: 0, labels: 0, links: 0, buttons: 0, lang: 0 }} />
                  </div>

                  <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="font-semibold mb-4">
                      {scanResult.violations && scanResult.violations.length > 0
                        ? `Found ${scanResult.violations.length} accessibility issues`
                        : 'No issues found!'}
                    </h3>

                    {shownViolations.map((v: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${impactColor(v.impact)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${impactBg(v.impact)}`}>
                              {v.impact}
                            </span>
                            <span className="text-xs text-text-muted font-mono">{v.id || v.rule_id}</span>
                          </div>
                          <p className="text-sm font-medium text-text-primary">
                            {v.description || v.rule_description}
                          </p>
                          {v.fix_summary || v.help ? (
                            <p className="text-xs text-text-muted mt-1">
                              Fix: {(v.fix_summary || v.help || '').slice(0, 120)}...
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}

                    {hiddenCount > 0 && (
                      <div className="mt-6 p-6 bg-accent/5 border border-accent/20 rounded-xl text-center">
                        <Lock className="w-8 h-8 text-accent mx-auto mb-3" />
                        <h4 className="text-lg font-semibold mb-2">
                          {hiddenCount} more {hiddenCount === 1 ? 'issue' : 'issues'} hidden
                        </h4>
                        <p className="text-text-secondary text-sm mb-4">
                          Sign up free to see all {scanResult.violations?.length || 0} violations with detailed fix guides.
                        </p>
                        <Link
                          href="/signup"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Create Free Account
                        </Link>
                      </div>
                    )}

                    {hiddenCount === 0 && scanResult.violations && scanResult.violations.length > 0 && !user && (
                      <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-xl text-center">
                        <p className="text-text-secondary text-sm mb-3">
                          Want detailed fix guides, monitoring, and unlimited scans?
                        </p>
                        <Link
                          href="/signup"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg text-sm transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Create Free Account
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Critical', value: scanResult.critical_count || 0, color: 'text-red-400' },
                      { label: 'Serious', value: scanResult.serious_count || 0, color: 'text-orange-400' },
                      { label: 'Moderate', value: scanResult.moderate_count || 0, color: 'text-amber-400' },
                      { label: 'Minor', value: scanResult.minor_count || 0, color: 'text-blue-400' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-surface border border-border rounded-xl p-4 text-center">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-text-muted mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
