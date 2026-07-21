-- ================================================
-- Fix: Add explicit GRANT permissions for anon and
-- authenticated roles on ALL tables + re-run duplicate
-- grant cleanup + add unique index to prevent reoccurrence.
--
-- Problem 1: Some tables had RLS enabled but missing
-- GRANTs for anon/authenticated roles, causing
-- "permission denied" errors when users tried to read
-- their own data (reports, scans, etc.).
--
-- Problem 2: Migration 021 cleaned up duplicate
-- monthly_grant rows but didn't prevent them from
-- being re-created by ensureMonthlyGrant() due to
-- race conditions.
-- ================================================

-- ================================================
-- PART 1: Explicit GRANTs for all roles on all tables
-- ================================================

-- Grant USAGE on public schema to all roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant ALL on ALL tables to service_role (redundant with 020 but idempotent)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant SELECT/INSERT/UPDATE/DELETE to anon and authenticated on ALL tables
-- This is required for RLS to work — RLS policies control row-level access,
-- but the role still needs table-level GRANTs.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant USAGE on all sequences to anon and authenticated (needed for SERIAL/BIGSERIAL columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- These GRANTs only apply to EXISTING tables. Set default privileges so
-- FUTURE tables created in public schema automatically get the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- ================================================
-- PART 2: Re-run duplicate monthly_grant cleanup
-- (More robust version of migration 021)
-- ================================================

-- Step 1: Log current duplicate state
DO $$
DECLARE
  dup_count INTEGER;
  affected_users TEXT;
BEGIN
  -- Count duplicate groups
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT user_id, metric, date_trunc('month', created_at) as month
    FROM scan_credits_ledger
    WHERE reason = 'monthly_grant'
    GROUP BY user_id, metric, date_trunc('month', created_at)
    HAVING COUNT(*) > 1
  ) t;

  RAISE NOTICE 'Found % (user, metric, month) groups with duplicate monthly_grant rows', dup_count;

  -- Log which users are affected
  IF dup_count > 0 THEN
    SELECT string_agg(DISTINCT user_id::text, ', ') INTO affected_users
    FROM (
      SELECT user_id
      FROM scan_credits_ledger
      WHERE reason = 'monthly_grant'
      GROUP BY user_id, metric, date_trunc('month', created_at)
      HAVING COUNT(*) > 1
    ) t;
    RAISE NOTICE 'Affected users: %', affected_users;
  END IF;
END $$;

-- Step 2: Delete duplicate monthly_grant rows (keep only the first per user/metric/month)
DELETE FROM scan_credits_ledger
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, metric, date_trunc('month', created_at)
             ORDER BY created_at, id
           ) as rn
    FROM scan_credits_ledger
    WHERE reason = 'monthly_grant'
  ) t
  WHERE rn > 1
);

-- Step 3: Recalculate and fix any users whose remaining scans don't match their plan
-- If a user's SUM(delta) is not equal to their plan's scansPerMonth, reset it
-- by removing all monthly_grant rows for the current month and re-adding one correct grant.
-- This handles cases where cleanup alone isn't enough (e.g., mixed-up metrics).
DO $$
DECLARE
  rec RECORD;
  correct_scan_delta INT;
  correct_render_delta INT;
  current_scan_sum INT;
  current_render_sum INT;
  month_start TIMESTAMPTZ;
BEGIN
  month_start := date_trunc('month', timezone('utc', now()));

  FOR rec IN
    SELECT DISTINCT p.id as user_id, p.subscription_status
    FROM profiles p
    WHERE p.subscription_status IN ('free', 'starter', 'growth', 'enterprise')
  LOOP
    -- Get correct deltas based on plan
    correct_scan_delta := CASE rec.subscription_status
      WHEN 'free' THEN 3
      WHEN 'starter' THEN 75
      WHEN 'growth' THEN 250
      WHEN 'enterprise' THEN 500
      ELSE 3
    END;

    correct_render_delta := CASE rec.subscription_status
      WHEN 'free' THEN 3
      WHEN 'starter' THEN 120
      WHEN 'growth' THEN 600
      WHEN 'enterprise' THEN 2500
      ELSE 3
    END;

    -- Get current sums for this month
    SELECT COALESCE(SUM(delta), 0) INTO current_scan_sum
    FROM scan_credits_ledger
    WHERE user_id = rec.user_id
      AND metric = 'scan'
      AND reason = 'monthly_grant'
      AND created_at >= month_start;

    SELECT COALESCE(SUM(delta), 0) INTO current_render_sum
    FROM scan_credits_ledger
    WHERE user_id = rec.user_id
      AND metric = 'page_render'
      AND reason = 'monthly_grant'
      AND created_at >= month_start;

    -- Fix scan grants if wrong
    IF current_scan_sum != correct_scan_delta THEN
      -- Delete all current monthly_grant scan rows and insert correct one
      DELETE FROM scan_credits_ledger
      WHERE user_id = rec.user_id
        AND metric = 'scan'
        AND reason = 'monthly_grant'
        AND created_at >= month_start;

      INSERT INTO scan_credits_ledger (user_id, metric, delta, reason)
      VALUES (rec.user_id, 'scan', correct_scan_delta, 'monthly_grant');

      RAISE NOTICE 'Fixed scan grant for user %: was %, now %', rec.user_id, current_scan_sum, correct_scan_delta;
    END IF;

    -- Fix page_render grants if wrong
    IF current_render_sum != correct_render_delta THEN
      DELETE FROM scan_credits_ledger
      WHERE user_id = rec.user_id
        AND metric = 'page_render'
        AND reason = 'monthly_grant'
        AND created_at >= month_start;

      INSERT INTO scan_credits_ledger (user_id, metric, delta, reason)
      VALUES (rec.user_id, 'page_render', correct_render_delta, 'monthly_grant');

      RAISE NOTICE 'Fixed page_render grant for user %: was %, now %', rec.user_id, current_render_sum, correct_render_delta;
    END IF;
  END LOOP;
END $$;

-- Step 4: Verify cleanup
DO $$
DECLARE
  remaining_dups INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_dups
  FROM (
    SELECT user_id, metric, date_trunc('month', created_at) as month
    FROM scan_credits_ledger
    WHERE reason = 'monthly_grant'
    GROUP BY user_id, metric, date_trunc('month', created_at)
    HAVING COUNT(*) > 1
  ) t;

  IF remaining_dups > 0 THEN
    RAISE WARNING 'Still % duplicate groups after cleanup — manual investigation needed', remaining_dups;
  ELSE
    RAISE NOTICE 'All duplicate monthly_grant rows cleaned up successfully';
  END IF;
END $$;

-- ================================================
-- PART 3: Add unique index to prevent future duplicates
-- This ensures ensureMonthlyGrant() cannot insert
-- duplicate monthly_grant rows even in a race condition.
-- ================================================

-- First drop the old index that doesn't include metric
DROP INDEX IF EXISTS idx_credits_user_period;

-- Create a unique partial index that prevents duplicate monthly grants
-- per (user_id, metric, month) combination
-- Create an IMMUTABLE helper function to extract year-month from timestamptz.
-- date_trunc + timestamptz is STABLE (timezone-dependent), so PostgreSQL rejects
-- it in index expressions. This wrapper uses AT TIME ZONE 'UTC' to make the
-- computation timezone-independent, then marks itself IMMUTABLE.
-- The function returns an integer like 202607 for July 2026.
CREATE OR REPLACE FUNCTION immutable_year_month(ts timestamptz)
RETURNS integer
LANGUAGE SQL IMMUTABLE PARALLEL SAFE
AS $$
  SELECT EXTRACT(YEAR FROM ts AT TIME ZONE 'UTC')::integer * 100
       + EXTRACT(MONTH FROM ts AT TIME ZONE 'UTC')::integer;
$$;

-- Unique partial index: one monthly_grant per (user, metric, month).
-- Uses the IMMUTABLE function above so PostgreSQL accepts the expression index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credits_monthly_grant_unique
  ON scan_credits_ledger (user_id, metric, immutable_year_month(created_at))
  WHERE reason = 'monthly_grant';

-- Ensure the user_metric_period index exists for fast queries
CREATE INDEX IF NOT EXISTS idx_credits_user_metric_period
  ON scan_credits_ledger (user_id, metric, created_at);

-- Note: We do NOT add a unique index on scan_consumed here because there may be
-- legitimate duplicate scan_ids (e.g., refund + re-consume for retried scans).
-- The application logic in credits.ts already prevents double-charging.
