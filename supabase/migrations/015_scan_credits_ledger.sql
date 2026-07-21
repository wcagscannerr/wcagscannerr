-- ================================================
-- Step 4 — Scan credits ledger
-- Replace the mutable `profiles.scans_used_this_month`
-- counter with an append-only ledger. This is safer
-- against the race between the batch tick endpoint
-- and direct scan requests hitting the quota check —
-- SUM(delta) is lock-free under READ COMMITTED.
-- Pre-launch: no paying customers, so we can drop the
-- old counter without backfill.
-- ================================================

CREATE TYPE credit_reason AS ENUM (
  'monthly_grant',
  'scan_consumed',
  'scan_failed_refund',
  'manual_adjustment'
);

CREATE TABLE scan_credits_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Nullable: monthly_grant rows are not tied to a scan.
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  -- Positive = credit granted. Negative = credit consumed.
  -- A user with monthly_grant +75 and three consumes + one
  -- refund will have SUM(delta) = 75 - 3 + 1 = 73 credits
  -- remaining in the period.
  delta INTEGER NOT NULL,
  reason credit_reason NOT NULL,
  -- For scan_failed_refund rows: {"failure_type": "engine_failure"
  --  | "target_unreachable"}. For batch consumes:
  -- {"batch_id": "...", "page_count": N}.
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Fast SUM(delta) WHERE user_id = ? AND created_at >= period_start
CREATE INDEX idx_credits_user_period
  ON scan_credits_ledger (user_id, created_at);

-- Fast COUNT(*) for the daily cap check on target_unreachable refunds
-- (count where reason='scan_failed_refund' and the JSONB contains
-- the failure_type key — a partial index keeps it tight).
CREATE INDEX idx_credits_daily_refund_cap
  ON scan_credits_ledger (user_id, created_at)
  WHERE reason = 'scan_failed_refund';

-- RLS: rows are private to their user (service role bypasses RLS
-- for the route handlers, which is what writes/reads them).
ALTER TABLE scan_credits_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own credits ledger"
  ON scan_credits_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Drop the legacy mutable counter. Pre-launch ↑ so we don't need a
-- backfill; ledger SUM replaces every read and write site.
ALTER TABLE profiles DROP COLUMN scans_used_this_month;
