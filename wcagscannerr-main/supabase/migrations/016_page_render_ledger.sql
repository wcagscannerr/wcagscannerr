-- =============================================================
-- Step 8 — bound the compute-cost tail on quotas
-- Adds per-tier page-render accounting on top of the existing
-- scan accounting in scan_credits_ledger. Distinct metric so we
-- can SUM() per-metric and per-period without conflating the
-- two quotas (Step 2 already distinguished scansPerMonth and
-- multiscanPageCap; this adds a third orthogonal counter).
--
-- Pre-launch: no live paying customers yet, so the backfill
-- below is safe — no auditor will see historical scan rows
-- missing page-render grants.
-- =============================================================

-- The existing credit_reason enum is reused; we only add ONE new
-- reason ('overage_pending') for the audit row written when a
-- user is hard-rejected for exceeding their tier's page-render cap.
-- The existing reasons (monthly_grant / scan_consumed /
-- scan_failed_refund / manual_adjustment) all apply to BOTH metrics.
ALTER TYPE credit_reason ADD VALUE IF NOT EXISTS 'overage_pending';

-- New enum distinguishes scan vs page-render ledger entries on
-- the same table. Cleaner than exploding credit_reason into
-- 'monthly_grant_pages' / 'page_render_consumed' variants
-- (fewer values to maintain; SUM grouped by metric is unambiguous).
CREATE TYPE ledger_metric AS ENUM ('scan', 'page_render');

-- Existing rows are scan rows; default makes the migration safe.
ALTER TABLE scan_credits_ledger
  ADD COLUMN metric ledger_metric NOT NULL DEFAULT 'scan';

-- Replace the existing (user_id, created_at) index with one that
-- also includes the metric — every SUM query from lib/scanner/credits.ts
-- filters on both metric and created_at.
DROP INDEX IF EXISTS idx_credits_user_period;
CREATE INDEX idx_credits_user_metric_period
  ON scan_credits_ledger (user_id, metric, created_at);

-- Backfill: any user who already received a scan monthly_grant for
-- the current calendar-month period also receives the matching
-- page_render monthly_grant, so a deploy mid-period doesn't
-- start them at 0 render quota. New users after deploy get the
-- +pageRendersPerMonth row from ensureMonthlyGrant() in code.
INSERT INTO scan_credits_ledger (user_id, scan_id, metric, delta, reason, created_at, metadata)
SELECT
  s.user_id,
  s.scan_id,
  'page_render'::ledger_metric,
  CASE s.user_id
    WHEN s.user_id THEN (
      SELECT COALESCE(pl->>'pageRendersPerMonth', '3')::int
      FROM (
        SELECT to_jsonb(p.limits) AS pl
        FROM profiles p WHERE p.id = s.user_id
      ) lp
    )
  END,
  'monthly_grant'::credit_reason,
  s.created_at,
  jsonb_build_object('source', '016_backfill', 'paired_with', s.id)
FROM scan_credits_ledger s
WHERE s.reason = 'monthly_grant'
  AND s.metric = 'scan'
  AND s.created_at >= date_trunc('month', timezone('utc', now()))
  AND NOT EXISTS (
    SELECT 1 FROM scan_credits_ledger pr
    WHERE pr.user_id = s.user_id
      AND pr.metric = 'page_render'
      AND pr.reason = 'monthly_grant'
      AND pr.created_at >= date_trunc('month', timezone('utc', now()))
  );

-- RLS — keep the existing row-level policy; the metric column
-- is just a filterable label, no separate policy needed.
