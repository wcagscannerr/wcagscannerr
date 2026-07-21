-- Multiscan Feature
-- Adds scan_type and base_url columns to batch_scans table

-- Only run if batch_scans table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'batch_scans') THEN
    -- Add scan_type column to distinguish between batch scans and multiscans
    ALTER TABLE batch_scans ADD COLUMN IF NOT EXISTS scan_type TEXT DEFAULT 'batch' CHECK (scan_type IN ('batch', 'multiscan'));

    -- Add base_url column to store the original URL for multiscans
    ALTER TABLE batch_scans ADD COLUMN IF NOT EXISTS base_url TEXT;

    -- Create index for faster queries on scan_type
    CREATE INDEX IF NOT EXISTS idx_batch_scans_scan_type ON batch_scans(scan_type);

    -- Update existing batch scans to have scan_type = 'batch'
    UPDATE batch_scans SET scan_type = 'batch' WHERE scan_type IS NULL;
  END IF;
END $$;
