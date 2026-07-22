-- ================================================
-- Fix: Mid-cycle plan upgrades not reflected in
-- scan credits (Enterprise shows 3 scans instead
-- of 500 when upgraded mid-month).
--
-- Problem 1: The unique index idx_credits_monthly_grant_unique
-- prevents inserting top-up rows when a user upgrades mid-cycle.
-- ensureMonthlyGrant() now uses SUM-based top-ups, so it may
-- insert multiple monthly_grant rows per period.
--
-- Problem 2: Users who were upgraded before this migration
-- (via SQL or Dodo webhook) have the wrong grant sum.
--
-- Fix: Drop unique index, create regular (non-unique) index,
-- and recalculate monthly grants for all users to match
-- their current plan.
-- ================================================

-- ================================================
-- PART 1: Drop unique index, create regular index
-- ================================================

DROP INDEX IF EXISTS idx_credits_monthly_grant_unique;

-- Regular (non-unique) index for performance — allows multiple
-- monthly_grant rows per user/metric/month for top-up support.
CREATE INDEX IF NOT EXISTS idx_credits_monthly_grant_lookup
  ON scan_credits_ledger (user_id, metric, immutable_year_month(created_at))
  WHERE reason = 'monthly_grant';

-- ================================================
-- PART 2: Recalculate monthly grants for all users
-- whose grant sum doesn't match their current plan.
-- ensureMonthlyGrant() will handle future upgrades,
-- but existing accounts need fixing now.
-- ================================================

DO $$
DECLARE
  r RECORD;
  current_scan_sum INTEGER;
  current_page_sum INTEGER;
  expected_scan INTEGER;
  expected_page INTEGER;
  fixed_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT
      p.id AS user_id,
      p.subscription_status
    FROM profiles p
    WHERE p.subscription_status IS NOT NULL
      AND p.subscription_status IN ('free', 'starter', 'growth', 'enterprise')
  LOOP
    -- Compute expected amounts per plan
    expected_scan := CASE r.subscription_status
      WHEN 'free' THEN 3
      WHEN 'starter' THEN 75
      WHEN 'growth' THEN 250
      WHEN 'enterprise' THEN 500
      ELSE 3
    END;

    expected_page := CASE r.subscription_status
      WHEN 'free' THEN 3
      WHEN 'starter' THEN 120
      WHEN 'growth' THEN 600
      WHEN 'enterprise' THEN 2500
      ELSE 3
    END;

    -- Sum existing monthly grants for the current month
    SELECT COALESCE(SUM(CASE WHEN metric = 'scan' THEN delta ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN metric = 'page_render' THEN delta ELSE 0 END), 0)
    INTO current_scan_sum, current_page_sum
    FROM scan_credits_ledger
    WHERE user_id = r.user_id
      AND reason = 'monthly_grant'
      AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC');

    -- Fix scans if needed
    IF current_scan_sum < expected_scan THEN
      INSERT INTO scan_credits_ledger (user_id, scan_id, metric, delta, reason)
      VALUES (r.user_id, NULL, 'scan', expected_scan - current_scan_sum, 'monthly_grant');
      fixed_count := fixed_count + 1;
    END IF;

    -- Fix page renders if needed
    IF current_page_sum < expected_page THEN
      INSERT INTO scan_credits_ledger (user_id, scan_id, metric, delta, reason)
      VALUES (r.user_id, NULL, 'page_render', expected_page - current_page_sum, 'monthly_grant');
      fixed_count := fixed_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration 023: Fixed % users with incorrect grant sums', fixed_count;
END $$;
