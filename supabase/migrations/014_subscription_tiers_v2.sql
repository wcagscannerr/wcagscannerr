-- ================================================
-- WCAG SCANNER — REPLACE SUBSCRIPTION TIERS
-- Old: free / pro / agency
-- New: free / starter / growth / enterprise
-- Pre-launch: no live paying customers, so we
-- simply swap the allowed set without grandfathering.
-- ================================================

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('free', 'starter', 'growth', 'enterprise'));

-- Auto-create-profile trigger already inserts 'free' by default, no change needed.
-- If any profiles existed with the legacy 'pro' / 'agency' status, normalize them
-- to the closest new tier before this constraint lands. (No live customers yet,
-- but a sample-report demo or staging row may exist.)
UPDATE profiles SET subscription_status = 'starter' WHERE subscription_status = 'pro';
UPDATE profiles SET subscription_status = 'growth'  WHERE subscription_status = 'agency';
