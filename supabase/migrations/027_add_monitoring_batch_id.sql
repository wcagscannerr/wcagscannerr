-- ================================================
-- Add last_batch_id to monitored_sites
-- Monitoring scans now create batch records with
-- per-page breakdowns (like batch_reports).
-- ================================================

ALTER TABLE monitored_sites ADD COLUMN IF NOT EXISTS last_batch_id UUID REFERENCES batch_scans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_monitored_sites_last_batch_id ON monitored_sites(last_batch_id);
