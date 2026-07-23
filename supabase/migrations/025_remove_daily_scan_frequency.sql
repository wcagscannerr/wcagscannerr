-- ================================================
-- Remove 'daily' from scan_frequency options
-- Daily scanning of 25 pages via GH Actions is
-- wasteful. Only weekly and monthly remain.
-- ================================================

ALTER TABLE monitored_sites DROP CONSTRAINT IF EXISTS monitored_sites_scan_frequency_check;
ALTER TABLE monitored_sites ADD CONSTRAINT monitored_sites_scan_frequency_check
  CHECK (scan_frequency IN ('weekly', 'monthly'));

-- Update any sites that were set to 'daily' to 'weekly'
UPDATE monitored_sites SET scan_frequency = 'weekly' WHERE scan_frequency = 'daily';
