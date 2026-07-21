-- =============================================================
-- Step 9 — Client accounts & white-label portal
-- Enables Growth / Enterprise agencies to manage multiple
-- client sites under one parent account. Each client account
-- can have its own branding for white-labeled reports.
--
-- Pre-launch: no paying customers, so no backfill needed.
-- =============================================================

-- Client accounts: sub-accounts owned by an agency user.
-- Each row represents one client of the agency.
CREATE TABLE IF NOT EXISTS client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  contact_email TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT client_accounts_slug_unique UNIQUE (parent_user_id, slug)
);

-- White-label settings per client account.
-- Controls branding on PDF reports and VPAT documents.
CREATE TABLE IF NOT EXISTS client_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT 'My Agency',
  primary_color TEXT DEFAULT '#3b82f6',
  accent_color TEXT DEFAULT '#10b981',
  logo_url TEXT,
  website_url TEXT,
  custom_footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT client_branding_client_unique UNIQUE (client_account_id)
);

-- Link scans to client accounts (nullable: direct scans have no client).
-- This lets agencies attribute scans to specific clients.
-- Only runs if the scans table exists (may not exist on fresh databases).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scans') THEN
    ALTER TABLE scans ADD COLUMN IF NOT EXISTS client_account_id UUID REFERENCES client_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Link reports to client accounts for white-label PDF generation.
-- Only runs if the reports table exists (may not exist on fresh databases).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports') THEN
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_account_id UUID REFERENCES client_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_client_accounts_parent ON client_accounts(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_client_branding_client ON client_branding(client_account_id);

-- Conditional indexes on scans/reports (only if tables and columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scans' AND column_name = 'client_account_id') THEN
    CREATE INDEX IF NOT EXISTS idx_scans_client_account ON scans(client_account_id) WHERE client_account_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'client_account_id') THEN
    CREATE INDEX IF NOT EXISTS idx_reports_client_account ON reports(client_account_id) WHERE client_account_id IS NOT NULL;
  END IF;
END $$;

-- RLS: agencies can only see their own client accounts
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies can manage own client accounts"
  ON client_accounts FOR ALL
  USING (auth.uid() = parent_user_id);

CREATE POLICY "Agencies can manage own client branding"
  ON client_branding FOR ALL
  USING (
    client_account_id IN (
      SELECT id FROM client_accounts WHERE parent_user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to client_accounts"
  ON client_accounts FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to client_branding"
  ON client_branding FOR ALL USING (true) WITH CHECK (true);

-- Ensure the update_updated_at_column() function exists (may not exist on remote DB)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Auto-update updated_at triggers
CREATE TRIGGER set_client_accounts_updated_at
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_client_branding_updated_at
  BEFORE UPDATE ON client_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
