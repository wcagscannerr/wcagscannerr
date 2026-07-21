-- Shared Reports Table
-- Enables public, shareable scan reports without authentication

-- Create table without foreign key to scans (may not exist yet)
CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT shared_reports_slug_unique UNIQUE (slug)
);

-- Conditionally add foreign key to scans table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scans') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'shared_reports_scan_id_fkey'
    ) THEN
      ALTER TABLE shared_reports
        ADD CONSTRAINT shared_reports_scan_id_fkey
        FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shared_reports_scan_id ON shared_reports(scan_id);
CREATE INDEX IF NOT EXISTS idx_shared_reports_revoked_at ON shared_reports(revoked_at) WHERE revoked_at IS NOT NULL;

ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shares"
  ON shared_reports FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create shares"
  ON shared_reports FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own shares"
  ON shared_reports FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Public can read active shares"
  ON shared_reports FOR SELECT
  USING (
    revoked_at IS NULL OR revoked_at > NOW()
  );

-- Service role full access
CREATE POLICY "Service role full access to shared_reports"
  ON shared_reports FOR ALL USING (true) WITH CHECK (true);
