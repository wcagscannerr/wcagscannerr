-- Add last_report_id to fix monitoring report links showing 404
-- The monitoring page links to /reports/{last_scan_id} but that's a scan ID,
-- not a report ID. The reports page expects a report ID, causing 404s.

-- Only run if monitored_sites table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monitored_sites') THEN
    ALTER TABLE monitored_sites 
    ADD COLUMN IF NOT EXISTS last_report_id UUID;

    -- Conditionally add foreign key to reports if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'monitored_sites_last_report_id_fkey'
      ) THEN
        ALTER TABLE monitored_sites
          ADD CONSTRAINT monitored_sites_last_report_id_fkey
          FOREIGN KEY (last_report_id) REFERENCES reports(id);
      END IF;
    END IF;

    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_monitored_sites_last_report_id 
    ON monitored_sites(last_report_id);
  END IF;
END $$;
