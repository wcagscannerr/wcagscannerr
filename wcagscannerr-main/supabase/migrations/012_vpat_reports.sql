-- VPAT / ACR (Voluntary Product Accessibility Template / Accessibility
-- Conformance Report) generation. Agency-plan exclusive — this is the
-- kind of formal deliverable agencies charge $500-2000 for when done
-- manually; this automates the first draft from real scan data.

CREATE TABLE vpat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,

  -- Product / evaluation info (VPAT's required cover-page fields)
  product_name TEXT NOT NULL,
  product_version TEXT,
  product_description TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluator_name TEXT NOT NULL,
  evaluator_contact TEXT,
  evaluation_methods TEXT NOT NULL DEFAULT 'Automated testing using axe-core (Deque Systems), conducted against WCAG 2.1 Level A and AA success criteria.',

  -- Standard being reported against
  standard TEXT NOT NULL DEFAULT 'WCAG 2.1 AA' CHECK (standard IN ('WCAG 2.1 AA', 'WCAG 2.1 A', 'WCAG 2.2 AA')),

  -- Per-criterion overrides. Keyed by criterion number (e.g. "1.4.3"),
  -- value is { level, remarks }. Only entries the agency has manually
  -- edited are stored here — everything else falls back to the
  -- auto-generated conformance table computed fresh from scan violations
  -- at render time, so edits survive but nothing goes stale silently.
  criterion_overrides JSONB DEFAULT '{}'::jsonb,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  white_label BOOL DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ
);

CREATE INDEX idx_vpat_reports_user ON vpat_reports(user_id, created_at DESC);
CREATE INDEX idx_vpat_reports_scan ON vpat_reports(scan_id);

ALTER TABLE vpat_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own VPAT reports"
  ON vpat_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own VPAT reports"
  ON vpat_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own VPAT reports"
  ON vpat_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own VPAT reports"
  ON vpat_reports FOR DELETE
  USING (auth.uid() = user_id);