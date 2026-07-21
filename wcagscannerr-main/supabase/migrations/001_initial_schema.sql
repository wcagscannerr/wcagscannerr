-- ================================================
-- WCAG SCANNER — INITIAL DATaABASE SCHEMA
-- ================================================

-- USERS PROFILE (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'agency')),
  subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  scans_used_this_month INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCANS TABLE
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  pages_scanned INT DEFAULT 0,
  pages_requested INT DEFAULT 1,
  compliance_score INT,
  total_violations INT DEFAULT 0,
  critical_count INT DEFAULT 0,
  serious_count INT DEFAULT 0,
  moderate_count INT DEFAULT 0,
  minor_count INT DEFAULT 0,
  wcag_level TEXT DEFAULT 'AA' CHECK (wcag_level IN ('A', 'AA', 'AAA')),
  big_six JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIOLATIONS TABLE
CREATE TABLE violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  rule_description TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('critical', 'serious', 'moderate', 'minor')),
  wcag_criterion TEXT,
  wcag_level TEXT CHECK (wcag_level IN ('A', 'AA', 'AAA')),
  page_url TEXT NOT NULL,
  element_html TEXT,
  element_selector TEXT,
  fix_summary TEXT,
  fix_detail TEXT,
  help_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REPORTS TABLE
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,
  pdf_url TEXT,
  is_public BOOL DEFAULT FALSE,
  public_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MONITORED SITES
CREATE TABLE monitored_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  scan_frequency TEXT DEFAULT 'weekly' CHECK (scan_frequency IN ('daily', 'weekly', 'monthly')),
  last_scan_id UUID REFERENCES scans(id),
  last_scanned_at TIMESTAMPTZ,
  alert_on_regression BOOL DEFAULT TRUE,
  alert_email TEXT,
  revoked_at BOOL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API KEYS
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can read own scans" ON scans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read own violations" ON violations FOR SELECT
  USING (scan_id IN (SELECT id FROM scans WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own reports" ON reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public reports are readable" ON reports FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can manage own monitored sites" ON monitored_sites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own API keys" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- SERVICE ROLE has full access
CREATE POLICY "Service role full access to profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX idx_violations_scan_id ON violations(scan_id);
CREATE INDEX idx_violations_impact ON violations(impact);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_monitored_sites_user_id ON monitored_sites(user_id);

-- ================================================
-- AUTO CREATE PROFILE ON NEW USER SIGNUP
-- ================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================
-- HELPER: Update updated_at timestamp
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();