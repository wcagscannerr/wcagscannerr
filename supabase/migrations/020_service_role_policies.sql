-- ================================================
-- Fix: Add missing service role policies AND grants
-- The service role needs both RLS policies AND
-- explicit GRANT permissions on all tables
-- ================================================

-- Grant full permissions to service_role on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

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

-- Chatbot usage table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to chatbot_usage' AND tablename = 'chatbot_usage') THEN
    CREATE POLICY "Service role full access to chatbot_usage"
      ON chatbot_usage FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AI fix usage table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to ai_fix_usage' AND tablename = 'ai_fix_usage') THEN
    CREATE POLICY "Service role full access to ai_fix_usage"
      ON ai_fix_usage FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rate limits table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to rate_limits' AND tablename = 'rate_limits') THEN
    CREATE POLICY "Service role full access to rate_limits"
      ON rate_limits FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Newsletter subscribers table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to newsletter_subscribers' AND tablename = 'newsletter_subscribers') THEN
    CREATE POLICY "Service role full access to newsletter_subscribers"
      ON newsletter_subscribers FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Scan credits ledger table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to scan_credits_ledger' AND tablename = 'scan_credits_ledger') THEN
    CREATE POLICY "Service role full access to scan_credits_ledger"
      ON scan_credits_ledger FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Free scan usage table (optional, for consistency)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to free_scan_usage' AND tablename = 'free_scan_usage') THEN
    CREATE POLICY "Service role full access to free_scan_usage"
      ON free_scan_usage FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
