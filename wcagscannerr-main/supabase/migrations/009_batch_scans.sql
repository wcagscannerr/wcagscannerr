-- ================================================
-- BATCH SCANNING SYSTEM
-- Replaces the old synchronous multi-page crawl+scan (which timed out
-- on Vercel serverless functions when scanning 10-20 pages in one request).
--
-- New model: a "batch" is a set of up to 50 explicit URLs. Each URL becomes
-- its own row in `scans` (status: queued -> running -> completed/failed),
-- processed a few at a time by a cron job, so no single request ever runs
-- more than one real browser scan.
-- ================================================

CREATE TABLE batch_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'partial')),
  total_urls INT NOT NULL,
  completed_urls INT DEFAULT 0,
  failed_urls INT DEFAULT 0,
  wcag_level TEXT DEFAULT 'AA' CHECK (wcag_level IN ('A', 'AA', 'AAA')),
  wcag_version TEXT DEFAULT '2.1' CHECK (wcag_version IN ('2.1', '2.2')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Link individual scans to the batch they belong to (nullable — regular
-- single-URL scans have no batch_id).
ALTER TABLE scans ADD COLUMN batch_id UUID REFERENCES batch_scans(id) ON DELETE CASCADE;
ALTER TABLE scans ADD COLUMN queue_position INT;

-- 'queued' is a new valid status for scans sitting in a batch waiting
-- for the cron worker to pick them up.
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_status_check;
ALTER TABLE scans ADD CONSTRAINT scans_status_check
  CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed'));

CREATE INDEX idx_scans_batch_id ON scans(batch_id);
CREATE INDEX idx_scans_queued ON scans(status, queue_position) WHERE status = 'queued';
CREATE INDEX idx_batch_scans_user ON batch_scans(user_id, created_at DESC);

-- Real marker coordinates for the annotated screenshot (percent-based,
-- so the frontend can position dots accurately at any display size,
-- instead of the old fake evenly-spaced-grid placement).
ALTER TABLE scans ADD COLUMN screenshot_markers JSONB;
ALTER TABLE scans ADD COLUMN screenshot_width INT;
ALTER TABLE scans ADD COLUMN screenshot_height INT;

-- RLS
ALTER TABLE batch_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batches"
  ON batch_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batches"
  ON batch_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);
