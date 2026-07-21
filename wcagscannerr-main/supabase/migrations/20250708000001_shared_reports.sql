-- Shared Reports Table
-- Enables public, shareable scan reports without authentication

CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT shared_reports_slug_unique UNIQUE (slug)
);

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