// ============================================================
// Step 10 — Issue lifecycle tracking
// Per-stable-identity status migration + cross-scan carry-forward
// ============================================================
//
// The `violations` table is per-scan (one row per axe rule per URL
// per scan). Status, however, is per *issue identity* — a single
// color-contrast failure on the same HTML chunk should keep its
// false-positive mark across re-scans of the same page. So we
// keep status in a separate table keyed by a stable cross-scan
// identity (rule_id + page_url + md5(element_html)) that lives in
// `violation_status` (migration 018).
//
// The reconcile loop below is what the user-facing API routes call
// after a successful scan to:
//   - insert new 'open' rows for issues never seen before,
//   - bump last_seen_scan_id for keys present in BOTH scans,
//   - auto-resolve keys that disappeared from the new scan
//     (only if prior status was 'open' or 'in_progress'),
//   - leave 'false_positive' rows untouched regardless of
//     presence — the user explicitly marked it, so it stays
//     marked until either reset or the underlying html changes.

import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'node:crypto';

export type ViolationStatus = 'open' | 'fixed' | 'false_positive' | 'in_progress';

export interface StableIdentity {
  rule_id: string;
  page_url: string;
  element_html: string;
}

/**
 * Compute the cross-scan identity for a violation.
 *
 * Why md5(rule_id + page_url + element_html)?
 *
 * - rule_id alone: too coarse — one rule can match 100 elements.
 * - page_url alone: too coarse — two rules failing on the same URL
 *   would collide.
 * - element_html alone: too coarse — re-running the same scan with a
 *   diff axe version might shift whitespace; conversely a real fix
 *   also legitimately changes the html.
 *
 * Concatenating rule_id + page_url + html lets us distinguish
 * "color-contrast on the broken-image at /about" from "image-alt on
 * the broken-image at /about". Different rules on the same html
 * get different keys. Same rule on the same html (across scans)
 * hits the same row, so a manual flip carries forward.
 *
 * axe-core's `node.target` (CSS selectors) is intentionally NOT part
 * of the key — those selectors shift whenever the page structure
 * reorders, so they're unreliable across scans.
 */
export function computeStableKey(input: StableIdentity): string {
  const h = crypto.createHash('md5');
  h.update(`${input.rule_id}|${input.page_url}|${input.element_html}`);
  return h.digest('hex');
}

export interface ReconcileResult {
  new_open: number;
  carried_forward: number;
  auto_resolved: number;
  false_positives_kept: number;
}

/**
 * Reconcile violation_status across a new scan and the user's last
 * completed scan of the same URL. Idempotent / race-safe at the
 * per-key level — concurrent calls just write the same rows.
 */
export async function reconcileStatus(
  userId: string,
  currentScanId: string,
  currentUrl: string,
  currentViolations: StableIdentity[],
): Promise<ReconcileResult> {
  const db = createServiceClient();

  const currentKeys = new Set<string>();
  for (const v of currentViolations) currentKeys.add(computeStableKey(v));

  // Pull the prior completed scan for this URL (most recent before
  // current, ignoring any in-flight failed/running rows).
  const { data: priorScan } = await db
    .from('scans')
    .select('id')
    .eq('user_id', userId)
    .eq('url', currentUrl)
    .eq('status', 'completed')
    .neq('id', currentScanId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const priorKeys = new Set<string>();
  if (priorScan) {
    const { data: priorViolations } = await db
      .from('violations')
      .select('rule_id, page_url, element_html')
      .eq('scan_id', priorScan.id);
    for (const pv of priorViolations ?? []) {
      priorKeys.add(computeStableKey(pv));
    }
  }

  const result: ReconcileResult = {
    new_open: 0,
    carried_forward: 0,
    auto_resolved: 0,
    false_positives_kept: 0,
  };

  // Fast path: nothing to do.
  if (currentKeys.size === 0 && priorKeys.size === 0) {
    return result;
  }

  // Pull all existing status rows for the union of keys (one query,
  // dedup'd into a map).
  const allKeys = Array.from(new Set([...currentKeys, ...priorKeys]));
  const { data: existingStatuses } = await db
    .from('violation_status')
    .select('*')
    .eq('user_id', userId)
    .in('stable_key', allKeys);

  const existingMap = new Map<string, any>();
  for (const row of existingStatuses ?? []) {
    existingMap.set(row.stable_key, row);
  }

  // 1. Carried forward: present in BOTH scans AND status row exists.
  for (const v of currentViolations) {
    const key = computeStableKey(v);
    if (!existingMap.has(key)) continue;
    if (!priorKeys.has(key)) continue;
    await db
      .from('violation_status')
      .update({
        last_seen_scan_id: currentScanId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('stable_key', key);
    result.carried_forward += 1;
  }

  // 2. New opens: present in current scan AND no existing status row.
  for (const v of currentViolations) {
    const key = computeStableKey(v);
    if (existingMap.has(key)) continue;
    await db.from('violation_status').insert({
      user_id: userId,
      stable_key: key,
      status: 'open',
      first_marked_scan_id: currentScanId,
      last_seen_scan_id: currentScanId,
      metadata: { source: 'reconcile', rule_id: v.rule_id, page_url: v.page_url },
    });
    result.new_open += 1;
  }

  // 3. Auto-resolve or false-positive-keep: present ONLY in prior scan.
  if (priorScan) {
    for (const key of priorKeys) {
      if (currentKeys.has(key)) continue;
      const existing = existingMap.get(key);
      if (!existing) continue;
      if (existing.status === 'open' || existing.status === 'in_progress') {
        await db
          .from('violation_status')
          .update({
            status: 'fixed',
            last_seen_scan_id: currentScanId,
            auto_resolved_count: (existing.auto_resolved_count ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('stable_key', key);
        result.auto_resolved += 1;
      } else if (existing.status === 'false_positive') {
        // Spec: false-positive persists regardless of presence.
        result.false_positives_kept += 1;
      }
      // status === 'fixed' on prior: nothing to do.
    }
  }

  return result;
}
