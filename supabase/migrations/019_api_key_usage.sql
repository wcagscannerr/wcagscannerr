-- ================================================
-- Step 5 — Per-key usage stats
-- One row per /api/v1/scan call so the Enterprise dashboard
-- can show the last 20 calls per key (acceptance criteria).
-- user_id is denormalized so the existing "user can read their
-- own usage" RLS works without a join back through api_keys.
-- ================================================

-- Create table without foreign key to api_keys (may not exist yet)
CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Target URL the user submitted (may be normalized; not the key).
  target_url TEXT NOT NULL,
  -- The /api/v1/scan response's `passed` boolean OR null on engine
  -- failure (so we don't pretend an HTTP error was a real test).
  passed BOOLEAN,
  -- Response code we sent back (200 = pass, 400 = below-threshold
  -- pass-fail in CI mode, 401/403/429/500 = error path).
  status_code INT NOT NULL,
  -- Wall-clock duration we measured inside the POST handler.
  response_time_ms INT NOT NULL,
  -- Captured score for the dashboard trend column. NULL on error path.
  score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Conditionally add foreign key to api_keys table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'api_key_usage_api_key_id_fkey'
    ) THEN
      ALTER TABLE api_key_usage
        ADD CONSTRAINT api_key_usage_api_key_id_fkey
        FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Last 20 per key: (api_key_id, created_at DESC) lookup.
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_recent
  ON api_key_usage (api_key_id, created_at DESC);

-- Per-user admin queries: usage on any of my keys.
CREATE INDEX IF NOT EXISTS idx_api_key_usage_user_recent
  ON api_key_usage (user_id, created_at DESC);

-- RLS: a user can read only their own usage rows; the routes that
-- WRITE rows run with the service role, bypassing RLS.
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own API key usage"
  ON api_key_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to api_key_usage"
  ON api_key_usage FOR ALL USING (true) WITH CHECK (true);
