-- =============================================================
-- Step 8 — bound the compute-cost tail on quotas
-- Adds per-tier page-render accounting on top of the existing
-- scan accounting in scan_credits_ledger. Distinct metric so we
-- can SUM() per-metric and per-period without conflating the
-- two quotas (Step 2 already distinguished scansPerMonth and
-- multiscanPageCap; this adds a third orthogonal counter).
--
-- Pre-launch: no live paying customers yet, so no backfill is
-- needed. New users after deploy get the +pageRendersPerMonth
-- row from ensureMonthlyGrant() in code.
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

-- No backfill needed: pre-launch means no paying customers with
-- historical scan monthly_grant rows. New users get their
-- page_render monthly_grant from ensureMonthlyGrant() in code.

-- RLS — keep the existing row-level policy; the metric column
-- is just a filterable label, no separate policy needed.
