-- Admin Alerts Table
-- Stores read-only alerts for canary observation
-- Non-intrusive, admin-only visibility

CREATE TABLE IF NOT EXISTS admin_alerts (
  alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL, -- 'canary_feedback', 'canary_metrics', 'canary_trend'
  severity text NOT NULL CHECK (severity IN ('info', 'warning')),
  message text NOT NULL,
  metrics jsonb,
  created_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at 
  ON admin_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity 
  ON admin_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_type 
  ON admin_alerts(alert_type);

-- Enable RLS
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all alerts
CREATE POLICY "Alerts: admins can read all"
  ON admin_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy: System can insert alerts (service role)
CREATE POLICY "Alerts: system can insert"
  ON admin_alerts FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed (alerts are immutable)

