-- ================================================
-- Add missing screenshot_url column to scans table
-- screenshot_markers, screenshot_width, and
-- screenshot_height were added in migration 009
-- but screenshot_url was never added to the schema.
-- The scan route has always tried to set it for
-- paid users, causing PostgREST PGRST204 errors.
-- ================================================

ALTER TABLE scans ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
