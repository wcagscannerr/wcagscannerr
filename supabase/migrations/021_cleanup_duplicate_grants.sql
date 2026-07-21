-- ================================================
-- Fix: Remove duplicate monthly_grant rows
-- Migration 016's broken backfill + ensureMonthlyGrant()
-- could have created duplicate grants, doubling the
-- displayed quota (e.g., 6 scans shown instead of 3).
-- Works for ALL users (free + paid) by keeping only
-- the first grant per (user_id, metric, month).
-- ================================================

-- Step 1: Log what we're about to clean up (for audit trail)
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT user_id, metric, date_trunc('month', created_at) as month
    FROM scan_credits_ledger
    WHERE reason = 'monthly_grant'
    GROUP BY user_id, metric, date_trunc('month', created_at)
    HAVING COUNT(*) > 1
  ) t;

  RAISE NOTICE 'Found % (user, metric, month) groups with duplicate monthly_grant rows', dup_count;
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

-- Step 3: Verify cleanup — this query should return 0 rows after running
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
