-- Scan Reports Table
-- Stores AI-generated reports for scan results

CREATE TABLE IF NOT EXISTS reports (
  scan_id uuid PRIMARY KEY REFERENCES scans(id) ON DELETE CASCADE,
  report_json jsonb NOT NULL,
  confidence_score float NOT NULL,
  generated_at timestamp with time zone DEFAULT now()
);

-- Index for querying reports by scan
CREATE INDEX IF NOT EXISTS idx_reports_scan_id ON reports(scan_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reports for their own scans
CREATE POLICY "Reports: users can view own"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scans
      WHERE scans.id = reports.scan_id
      AND (scans.user_id = auth.uid() OR scans.user_id IS NULL)
    )
  );

-- Policy: System can insert reports (via service role)
-- Note: Service role bypasses RLS, so this is mainly for documentation

