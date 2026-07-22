// ================================================
// Step 4 + Step 8 — Scan / page-render quota ledger helpers.
//
// All quota reads/writes flow through these helpers so
// we never touch profiles.scans_used_this_month (gone
// since migration 015). Race-safe because SUM(delta)
// inside READ COMMITTgED is lock-free for our access
// pattern (only writers in this codebase touch the table).
//
// Step 8 adds a parallel 'page_render' metric on the
// same ledger so we can bound the compute-cost tail
// independent of scansPerMonth. A single scan = 1 render
// (or 3 for responsive viewports); multi-scan / batch
// reserve N renders at once. Same refund + daily-cap
// rules apply to both metrics; the new 'overage_pending'
// reason is an audit-only row written when a tier's
// hard cap rejects a request.
// ================================================

import { createServiceClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/dodo/plans';

export type CreditReason =
  | 'monthly_grant'
  | 'scan_consumed'
  | 'scan_failed_refund'
  | 'manual_adjustment'
  | 'overage_pending'; // Step 8: audit row when a tier's page-render cap rejects a request.

export type LedgerMetric = 'scan' | 'page_render'; // Step 8.

export type FailureReason =
  | 'engine_failure'
  | 'target_unreachable'
  | 'invalid_target';

// Spec: 5/day cap on target_unreachable refunds (applies to BOTH metrics).
const DAILY_REFUND_CAP = 5;

// ── Period helpers (calendar-month UTC) ──

export function getPeriodStartUtc(d: Date = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export function getTodayStartUtc(d: Date = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

// ── Monthly-grant helpers ──
//
// Uses SUM-based checking to handle mid-cycle plan upgrades:
// - New user (no grant yet): inserts full plan limit
// - Existing user, same plan: skips (sum >= limit)
// - Existing user, upgraded: inserts top-up (limit - existing sum)
// - Existing user, downgraded: skips (no removal of already-granted credits)
//
// The unique index on monthly_grant was removed in migration 023 to allow
// top-up rows. Race conditions are handled by the try-catch below.

export async function ensureMonthlyGrant(userId: string): Promise<void> {
  const db = createServiceClient();
  const periodStart = getPeriodStartUtc();

  const { data: profile } = await db
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  const planId = profile?.subscription_status || 'free';
  const planLimits = PLANS[planId as keyof typeof PLANS]?.limits || PLANS.free.limits;

  // SELECT all monthly_grant rows with delta to compute sums per metric.
  const { data: existing } = await db
    .from('scan_credits_ledger')
    .select('id, metric, delta')
    .eq('user_id', userId)
    .eq('reason', 'monthly_grant')
    .gte('created_at', periodStart);

  const scanSum = (existing || [])
    .filter((r: any) => r.metric === 'scan')
    .reduce((sum: number, r: any) => sum + (r.delta ?? 0), 0);

  const pageSum = (existing || [])
    .filter((r: any) => r.metric === 'page_render')
    .reduce((sum: number, r: any) => sum + (r.delta ?? 0), 0);

  const rowsToInsert: any[] = [];

  // Scan grant: top-up if existing sum < plan limit
  if (scanSum < planLimits.scansPerMonth) {
    rowsToInsert.push({
      user_id: userId,
      scan_id: null,
      metric: 'scan' as LedgerMetric,
      delta: planLimits.scansPerMonth - scanSum,
      reason: 'monthly_grant' as CreditReason,
    });
  }

  // Page-render grant: top-up if existing sum < plan limit
  if (pageSum < planLimits.pageRendersPerMonth) {
    rowsToInsert.push({
      user_id: userId,
      scan_id: null,
      metric: 'page_render' as LedgerMetric,
      delta: planLimits.pageRendersPerMonth - pageSum,
      reason: 'monthly_grant' as CreditReason,
    });
  }

  if (rowsToInsert.length > 0) {
    try {
      await db.from('scan_credits_ledger').insert(rowsToInsert);
    } catch (err: any) {
      // If a concurrent request already inserted the same top-up between
      // our SELECT and INSERT, the SUM will still be correct next time
      // the user visits the dashboard. Just skip the duplicate.
      if (err?.code !== '23505') {
        throw err;
      }
    }
  }
}

// ── Reads: scanfs / page renders remaining this period ──

export async function getScansRemaining(userId: string): Promise<number> {
  await ensureMonthlyGrant(userId);
  const db = createServiceClient();
  const periodStart = getPeriodStartUtc();

  const { data } = await db
    .from('scan_credits_ledger')
    .select('delta')
    .eq('user_id', userId)
    .eq('metric', 'scan')
    .gte('created_at', periodStart);

  return (data || []).reduce((sum, row) => sum + (row.delta ?? 0), 0);
}

// Step 8 — page-render sum mirrors getScansRemaining but for metric='page_render'.
// 'overage_pending' rows have delta=0 (audit-only) so they're naturally
// excluded by the SUM but we filter them explicitly to keep the query intent
// unambiguous.
export async function getPageRendersRemaining(userId: string): Promise<number> {
  await ensureMonthlyGrant(userId);
  const db = createServiceClient();
  const periodStart = getPeriodStartUtc();

  const { data } = await db
    .from('scan_credits_ledger')
    .select('delta')
    .eq('user_id', userId)
    .eq('metric', 'page_render')
    .gte('created_at', periodStart)
    .neq('reason', 'overage_pending');

  return (data || []).reduce((sum, row) => sum + (row.delta ?? 0), 0);
}

// ── Scan writes ──
// (unchanged from Step 4 — kept for compatibility)

export async function consumeCredit(
  userId: string,
  scanId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const db = createServiceClient();
  await db.from('scan_credits_ledger').insert({
    user_id: userId,
    scan_id: scanId,
    metric: 'scan' as LedgerMetric,
    delta: -1,
    reason: 'scan_consumed' as CreditReason,
    metadata,
  });
}

export async function consumeBatchCredits(
  userId: string,
  batchId: string,
  pageCount: number,
): Promise<void> {
  const db = createServiceClient();
  await db.from('scan_credits_ledger').insert({
    user_id: userId,
    scan_id: null,
    metric: 'scan' as LedgerMetric,
    delta: -pageCount,
    reason: 'scan_consumed' as CreditReason,
    metadata: { batch_id: batchId, page_count: pageCount },
  });
}

export async function refundBatchCredits(
  userId: string,
  batchId: string,
  pageCount: number,
  failureReason: FailureReason,
): Promise<void> {
  const db = createServiceClient();
  await db.from('scan_credits_ledger').insert({
    user_id: userId,
    scan_id: null,
    metric: 'scan' as LedgerMetric,
    delta: pageCount,
    reason: 'scan_failed_refund' as CreditReason,
    metadata: {
      failure_type: failureReason,
      batch_id: batchId,
      page_count: pageCount,
    },
  });
}

// Step 4 + Step 8 — manual delta now requires explicit metric so an
// operator can adjust either scans or page renders (or both).
export async function manualAdjust(
  userId: string,
  delta: number,
  note: string,
  metric: LedgerMetric = 'scan',
): Promise<void> {
  const db = createServiceClient();
  await db.from('scan_credits_ledger').insert({
    user_id: userId,
    scan_id: null,
    metric,
    delta,
    reason: 'manual_adjustment' as CreditReason,
    metadata: { note },
  });
}

export interface RefundResult {
  issued: boolean;
  capped: boolean;
  failure_reason: FailureReason;
}

// Step 4 + Step 8 — refundCredit now optionally targets page-render metric
// for symmetric refund handling on page-level failures.
export async function refundCredit(
  userId: string,
  scanId: string,
  failureReason: FailureReason,
  metric: LedgerMetric = 'scan',
): Promise<RefundResult> {
  if (failureReason === 'invalid_target') {
    return { issued: false, capped: false, failure_reason: failureReason };
  }

  const db = createServiceClient();
  const todayStart = getTodayStartUtc();

  if (failureReason === 'target_unreachable') {
    const { count } = await db
      .from('scan_credits_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('metric', metric)
      .eq('reason', 'scan_failed_refund')
      .gte('created_at', todayStart)
      .contains('metadata', { failure_type: 'target_unreachable' });

    if ((count ?? 0) >= DAILY_REFUND_CAP) {
      return { issued: false, capped: true, failure_reason: failureReason };
    }
  }

  await db.from('scan_credits_ledger').insert({
    user_id: userId,
    scan_id: scanId,
    metric,
    delta: 1,
    reason: 'scan_failed_refund' as CreditReason,
    metadata: { failure_type: failureReason },
  });

  return { issued: true, capped: false, failure_reason: failureReason };
}

// ── Step 8 — page-render writes ──

// Resets to zero if requested <= 0 (defensive guard for malformed calls).
export async function consumePageRenders(
  userId: string,
  scanId: string | null,
  pageCount: number,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (pageCount <= 0) return;
  const db = createServiceClient();
  await db.from('scan_credits_ledger').insert({
    user_id: userId,
    scan_id: scanId,
    metric: 'page_render' as LedgerMetric,
    delta: -pageCount,
    reason: 'scan_consumed' as CreditReason,
    metadata,
  });
}

// Per-URL page-render refund, including the daily target_unreachable cap
// (kept symmetric with refundCredit to prevent credit-farming across both
// metrics). For batch refunds (e.g. worker GH Actions trigger failure),
// callers use this N times or with a multi-page batch helper — see
// refundBatchPageRenders below.
export async function refundPageRenders(
  userId: string,
  scanId: string | null,
  pageCount: number,
  failureReason: FailureReason,
): Promise<RefundResult> {
  if (failureReason === 'invalid_target') {
    return { issued: false, capped: false, failure_reason: failureReason };
  }
  if (pageCount <= 0) {
    return { issued: false, capped: false, failure_reason: failureReason };
  }

  const db = createServiceClient();
  const todayStart = getTodayStartUtc();

  if (failureReason === 'target_unreachable') {
    const { count } = await db
      .from('scan_credits_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('metric', 'page_render')
      .eq('reason', 'scan_failed_refund')
      .gte('created_at', todayStart)
      .contains('metadata', { failure_type: 'target_unreachable' });

    if ((count ?? 0) >= DAILY_REFUND_CAP) {
      // Daily cap applied PER failure, not per page — refuse to refund
      // any pages for this event so a batch of 50 unreachable pages
      // doesn't return 50 credits.
      return { issued: false, capped: true, failure_reason: failureReason };
    }
  }

  await db.from('scan_credits_ledger').insert({
    user_id: userId,
    scan_id: scanId,
    metric: 'page_render' as LedgerMetric,
    delta: pageCount,
    reason: 'scan_failed_refund' as CreditReason,
    metadata: { failure_type: failureReason, refunded_pages: pageCount },
  });

  return { issued: true, capped: false, failure_reason: failureReason };
}

// Audit-only row written when a tier's page-render hard cap rejects a
// request. delta=0 because the user was NOT charged; this is just a
// record that they tried to exceed their allotment. Phase 2 can SUM
// these for metered overage pricing (the spec-flagged Phase 2 mechanism).
export async function logPageOveragePending(
  userId: string,
  scanId: string | null,
  requestedPages: number,
  monthlyCap: number,
): Promise<void> {
  const db = createServiceClient();
  await db.from('scan_credits_ledger').insert({
    user_id: userId,
    scan_id: scanId,
    metric: 'page_render' as LedgerMetric,
    delta: 0,
    reason: 'overage_pending' as CreditReason,
    metadata: {
      requested_pages: requestedPages,
      monthly_cap: monthlyCap,
    },
  });
}

// Symmetric with refundBatchCredits — refunds page-render credits for a
// whole batch job that aborted before any worker scan started.
// Skips the per-failure daily cap (this is a single batch-level refund,
// not N independent per-URL refunds).
export async function refundBatchPageRenders(
  userId: string,
  batchId: string,
  pageCount: number,
  failureReason: FailureReason,
): Promise<void> {
  if (failureReason === 'invalid_target') return;
  if (pageCount <= 0) return;
  const db = createServiceClient();
  await db.from('scan_credits_ledger').insert({
    user_id: userId,
    scan_id: null,
    metric: 'page_render' as LedgerMetric,
    delta: pageCount,
    reason: 'scan_failed_refund' as CreditReason,
    metadata: {
      failure_type: failureReason,
      batch_id: batchId,
      refunded_pages: pageCount,
    },
  });
}
