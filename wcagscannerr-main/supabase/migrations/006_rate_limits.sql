-- ================================================
-- WCAG SCANNER — RATE LIMITING
-- ================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, action)
);

-- RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate_limits"
  ON rate_limits FOR ALL
  USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action
  ON rate_limits(identifier, action);