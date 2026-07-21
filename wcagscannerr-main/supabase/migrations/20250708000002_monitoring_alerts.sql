-- Monitoring Alerts Table
-- Tracks accessibility regressions and improvements for monitored sites

CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES monitored_sites(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('score_drop', 'new_critical', 'new_serious', 'fixed')),
  message TEXT NOT NULL,
  previous_value INTEGER,
  current_value INTEGER,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_user_id ON monitoring_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_site_id ON monitoring_alerts(site_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_read ON monitoring_alerts(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at ON monitoring_alerts(created_at DESC);

ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts"
  ON monitoring_alerts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can create alerts"
  ON monitoring_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own alerts"
  ON monitoring_alerts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own alerts"
  ON monitoring_alerts FOR DELETE
  USING (user_id = auth.uid());