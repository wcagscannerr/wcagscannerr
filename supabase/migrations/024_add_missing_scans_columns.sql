-- ================================================
-- Add missing columns to scans table
-- keyboard_issues and viewport_breakdown were used in
-- the scan routes and monitoring cron but never added
-- to the database schema.
-- ================================================

ALTER TABLE scans ADD COLUMN IF NOT EXISTS keyboard_issues JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS viewport_breakdown JSONB DEFAULT '[]'::jsonb;
