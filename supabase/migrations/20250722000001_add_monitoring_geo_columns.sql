-- Add geo-location columns to monitored_sites
-- These are used by the monitoring dashboard to display site locations
-- and are populated via DNS-based geo-IP lookup (lib/monitoring/geoLookup.ts)

ALTER TABLE monitored_sites
  ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geo_country TEXT,
  ADD COLUMN IF NOT EXISTS geo_city TEXT,
  ADD COLUMN IF NOT EXISTS geo_looked_up_at TIMESTAMPTZ;
