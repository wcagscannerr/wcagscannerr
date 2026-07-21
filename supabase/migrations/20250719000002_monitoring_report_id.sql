-- Add last_report_id to fix monitoring report links showing 404
-- The monitoring page links to /reports/{last_scan_id} but that's a scan ID,
-- not a report ID. The reports page expects a report ID, causing 404s.

ALTER TABLE monitored_sites 
ADD COLUMN IF NOT EXISTS last_report_id UUID REFERENCES reports(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_monitored_sites_last_report_id 
ON monitored_sites(last_report_id);
