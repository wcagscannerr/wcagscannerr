-- ================================================
-- Fix: Add missing service role policies
-- The service role needs full access to all tables
-- for backend operations (scan creation, updates, etc.)
-- ================================================

-- Scans table: service role needs INSERT/UPDATE for scan creation and status updates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to scans' AND tablename = 'scans') THEN
    CREATE POLICY "Service role full access to scans"
      ON scans FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Violations table: service role needs INSERT for inserting violations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to violations' AND tablename = 'violations') THEN
    CREATE POLICY "Service role full access to violations"
      ON violations FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reports table: service role needs INSERT for creating reports
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to reports' AND tablename = 'reports') THEN
    CREATE POLICY "Service role full access to reports"
      ON reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Monitored sites table: service role needs access for monitoring operations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to monitored_sites' AND tablename = 'monitored_sites') THEN
    CREATE POLICY "Service role full access to monitored_sites"
      ON monitored_sites FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- API keys table: service role needs access for key management
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to api_keys' AND tablename = 'api_keys') THEN
    CREATE POLICY "Service role full access to api_keys"
      ON api_keys FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
