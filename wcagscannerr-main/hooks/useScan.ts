'use client';

import { useState, useCallback, useRef } from 'react';
import type { ScanResult } from '@/types/scan';

export function useScan() {
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const startScan = useCallback(async (url: string, wcagLevel: 'A' | 'AA' | 'AAA' = 'AA', wcagVersion?: '2.1' | '2.2') => {
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, wcag_level: wcagLevel, wcag_version: wcagVersion || '2.1' }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Step 4: the API now returns refund_issued / refund_capped /
        // failure_reason so the UI can show the "scans credited back"
        // toast without needing a second round-trip. Forward as a
        // proper Error so the existing call sites still get a message,
        // and stash the refund info on a stable property the UI can
        // branch on.
        const err: Error & {
          refund_issued?: boolean;
          refund_capped?: boolean;
          failure_reason?: 'engine_failure' | 'target_unreachable' | 'invalid_target';
        } = new Error(data.error || 'Scan failed');
        err.refund_issued = Boolean(data.refund_issued);
        err.refund_capped = Boolean(data.refund_capped);
        err.failure_reason = data.failure_reason;
        throw err;
      }

      setScanId(data.scan_id);

      // If the scan completed synchronously in the POST handler, use the result directly
      if (data.status === 'completed') {
        setScanResult(data);
        setLoading(false);
        return;
      }

      // Fallback: poll for completion (for backward compatibility)
      if (data.status === 'pending' || data.status === 'running') {
        pollScan(data.scan_id);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const pollScan = useCallback(async (id: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/scan/${id}`);
        if (!res.ok) throw new Error('Failed to fetch scan status');

        const data = await res.json();

        if (data.status === 'completed' || data.status === 'failed') {
          setScanResult(data);
          setLoading(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };

    // Poll every 2 seconds
    pollingRef.current = setInterval(poll, 2000);
    poll(); // Do an immediate check
  }, []);

  const resetScan = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setScanId(null);
    setScanResult(null);
    setLoading(false);
    setError(null);
  }, []);

  return { scanId, scanResult, loading, error, startScan, resetScan };
}

  