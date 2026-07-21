// ================================================
// Step 4 — Deterministic failure_reason classifier
//
// Spec:
//   - engine_failure     → refund (always)
//   - target_unreachable → refund (5/day cap, see credits.ts)
//   - invalid_target     → never reaches this function — the
//     isUrlSafe() validation in route.ts rejects BEFORE the
//     scan row is created, so no consume happens, no refund
//     is needed. Kept here for completeness so downstream
//     code (support tooling, audit reports) has a single
//     3-value enum to reason about.
//
// We classify from the error message + name of whatever
// the runScan() catch branch receives. STRING-MATCHING
// is acceptable here because the upstream engine emits
// puppeteer-shaped navErr / fetch-shaped network errors
// and we've already settled on the timeout-resilience
// pattern in engine.ts.
// ================================================

import type { FailureReason } from '@/lib/scanner/credits';

const TARGET_UNREACHABLE_SIGNATURES: RegExp[] = [
  /timeout/i,
  /timed out/i,
  /econnrefused/i,
  /enotfound/i,
  /enetunreach/i,
  /econnreset/i,
  /net::err_/i, // Chromium net::ERR_NAME_NOT_RESOLVED, etc.
  /failed to navigate/i,
  /navigation timeout/i,
];

export function classifyFailure(error: unknown): FailureReason {
  const err = error as { message?: string; name?: string } | null | undefined;
  const message = err?.message ?? '';
  const name = err?.name ?? '';

  // Puppeteer's TimeoutError carries the name "TimeoutError";
  // node fetch's undici timeout sets .name similarly.
  if (name === 'TimeoutError') return 'target_unreachable';

  for (const sig of TARGET_UNREACHABLE_SIGNATURES) {
    if (sig.test(message)) return 'target_unreachable';
  }

  // Anything that bubbled out of the runScan() envelope without a
  // network signature — Chromium crash, out-of-memory, axe evaluation
  // exception, etc — is our fault and refundable.
  return 'engine_failure';
}
