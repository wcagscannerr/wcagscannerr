-- ================================================
-- WCAG SCANNER — ADD WCAG VERSION TO SCANS
-- ================================================

ALTER TABLE scans ADD COLUMN IF NOT EXISTS wcag_version TEXT DEFAULT '2.1';