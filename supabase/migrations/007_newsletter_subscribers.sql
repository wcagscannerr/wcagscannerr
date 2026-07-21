-- ================================================
-- WCAG SCANNER — NEWSLETTER SUBSCRIBERS
-- ================================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'free_scan'
);

-- RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage subscribers"
  ON newsletter_subscribers FOR ALL
  USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email
  ON newsletter_subscribers(email);