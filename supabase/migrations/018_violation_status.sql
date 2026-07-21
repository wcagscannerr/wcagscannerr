-- =============================================================
-- Step 10 — Issue lifecycle tracking (status)
-- =============================================================
-- Stable cross-scan identity for violations is rule_id + page_url +
-- md5(element_html) — see lib/scanner/statusTracker.ts. Status lives
-- per (user, stable_key), not per violations row, because a single
-- axe "color-contrast" failure can hit 60 elements: when the user
-- marks one as false-positive, all 60 should report the same status
-- across scans, not just one element.
--
-- Pre-launch: no live paying customers, so we don't backfill
-- historical statuses. New scans start at status='open'.

CREATE TYPE violation_status_type AS ENUM (
  'open',
  'fixed',
  'false_positive',
  'in_progress'
);

-- Create table without foreign keys first (scans table may not exist yet)
CREATE TABLE IF NOT EXISTS violation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Stable cross-scan identity: md5(rule_id||'|'||page_url||'|'||element_html)
  stable_key TEXT NOT NULL,
  status violation_status_type NOT NULL DEFAULT 'open',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Audit trail — foreign keys added conditionally below
  first_marked_scan_id UUID,
  last_seen_scan_id UUID,
  -- Counter for "how many auto-resolved events have happened on this key".
  -- Useful for "the fix keeps coming back" signals in monitoring alerts.
  auto_resolved_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Conditionally add foreign keys to scans table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scans') THEN
    -- Add foreign key constraints if they don't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'violation_status_first_marked_scan_fkey'
    ) THEN
      ALTER TABLE violation_status
        ADD CONSTRAINT violation_status_first_marked_scan_fkey
        FOREIGN KEY (first_marked_scan_id) REFERENCES scans(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'violation_status_last_seen_scan_fkey'
    ) THEN
      ALTER TABLE violation_status
        ADD CONSTRAINT violation_status_last_seen_scan_fkey
        FOREIGN KEY (last_seen_scan_id) REFERENCES scans(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- One status row per (user, stable_key); upsert updates the existing row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_violation_status_user_key
  ON violation_status (user_id, stable_key);

-- Dashboard / cross-section queries (e.g. "all false-positives on page X").
CREATE INDEX IF NOT EXISTS idx_violation_status_user_status
  ON violation_status (user_id, status);

CREATE INDEX IF NOT EXISTS idx_violation_status_last_seen
  ON violation_status (user_id, last_seen_scan_id);

-- RLS: parent user can manage their own status rows; service role
-- bypasses RLS for write paths in the diff/reconcile loop.
ALTER TABLE violation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own violation status"
  ON violation_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to violation_status"
  ON violation_status FOR ALL USING (true) WITH CHECK (true);

-- Ensure the update_updated_at_column() function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- updated_at trigger
CREATE TRIGGER set_violation_status_updated_at
  BEFORE UPDATE ON violation_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
