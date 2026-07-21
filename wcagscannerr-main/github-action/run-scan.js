#!/usr/bin/env node
/**
 * WCAG Scanner — thin CI/CD wrapper.
 *
 * Reads four env vars set by action.yml:
 *   WCAG_API_KEY         — Bearer token
 *   WCAG_SCAN_URL        — target URL
 *   WCAG_FAIL_THRESHOLD  — score below which the CI run fails (default 85)
 *   WCAG_API_BASE_URL    — overrides the API host (default wcagscannerr.com)
 *
 * Behaviour:
 *   - HTTP 200 + passed=true         → exit 0
 *   - HTTP 400 + passed=false        → exit 1 (treated as failing step by all major CI providers)
 *   - 401 / 403 / 429 / 5xx / network → exit 2 with the upstream error on stderr
 *
 * The endpoint already returns 200 on threshold-pass and 400 on
 * threshold-fail (CI exit-code convention), so job status maps
 * directly: pass→green, fail→red.
 */

'use strict';

const [, , getoptScanUrl] = process.argv;

const apiBase =
  process.env.WCAG_API_BASE_URL || 'https://www.wcagscannerr.com';
const apiKey =
  process.env.WCAG_API_KEY || process.env.WCAG_SCANNER_API_KEY;
const scanUrl = getoptScanUrl || process.env.WCAG_SCAN_URL;
const threshold = Number(process.env.WCAG_FAIL_THRESHOLD || 85);

if (!apiKey) {
  console.error('Missing WCAG_API_KEY (set it via inputs or env).');
  process.exit(2);
}
if (!scanUrl) {
  console.error('Missing WCAG_SCAN_URL (set it via inputs or env).');
  process.exit(2);
}
if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
  console.error(`Invalid WCAG_FAIL_THRESHOLD: "${process.env.WCAG_FAIL_THRESHOLD}"`);
  process.exit(2);
}

(async () => {
  const t0 = Date.now();
  let resp;
  try {
    resp = await fetch(
      `${apiBase}/api/v1/scan`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: scanUrl,
          wcag_version: '2.1',
          fail_threshold: threshold,
        }),
      }
    );
  } catch (err) {
    console.error(`Network error reaching ${apiBase}: ${err && err.message}`);
    process.exit(2);
  }

  const dur = Date.now() - t0;
  let body;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }

  if (resp.status === 200) {
    console.log(
      `✓ ${scanUrl} scored ${body?.score ?? '?'}/100 ` +
      `(threshold ${threshold}, ${dur}ms, ${body?.summary?.critical ?? 0} critical, ` +
      `${body?.summary?.serious ?? 0} serious)`
    );
    process.exit(0);
  }

  if (resp.status === 400 && body?.passed === false) {
    console.log(
      `✗ ${scanUrl} scored ${body?.score ?? '?'}/100 — below threshold ${threshold} ` +
      `(${dur}ms, ${body?.summary?.critical ?? 0} critical, ${body?.summary?.serious ?? 0} serious)`
    );
    process.exit(1);
  }

  console.error(
    `WCAG scan failed: HTTP ${resp.status} ` +
    (body?.error ? `— ${body.error}` : '')
  );
  process.exit(2);
})();
