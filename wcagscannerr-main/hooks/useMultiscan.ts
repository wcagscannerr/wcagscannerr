'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface MultiscanResult {
  batch_id: string;
  total_pages: number;
  status: string;
  message: string;
}

interface BatchStatus {
  id: string;
  name: string;
  status: string;
  total_urls: number;
  completed_urls: number;
  failed_urls: number;
  created_at: string;
  completed_at: string | null;
}

export function useMultiscan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MultiscanResult | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const startMultiscan = useCallback(async (
    url: string,
    pageCount: number,
    wcagVersion: '2.1' | '2.2' = '2.1',
    wcagLevel: 'A' | 'AA' | 'AAA' = 'AA'
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setBatchStatus(null);

    try {
      const res = await fetch('/api/scan/multiscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          page_count: pageCount,
          wcag_version: wcagVersion,
          wcag_level: wcagLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start multi-scan');
      }

      setResult(data);
      setLoading(false);

      // Start polling for batch status
      if (data.batch_id) {
        startPolling(data.batch_id);
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  const startPolling = useCallback((batchId: string) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/scan/batch/${batchId}`);
        if (!res.ok) return;

        const data = await res.json();
        setBatchStatus(data);

        // Stop polling if batch is complete
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'partial') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setLoading(false);
        }
      } catch {
        // Ignore errors, will retry on next poll
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds
    pollingRef.current = setInterval(fetchStatus, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setLoading(false);
    setError(null);
    setResult(null);
    setBatchStatus(null);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return {
    loading,
    error,
    result,
    batchStatus,
    startMultiscan,
    stopPolling,
    reset,
  };
}
