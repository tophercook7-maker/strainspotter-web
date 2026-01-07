-- Model Comparisons Table
-- Stores A/B test comparison data between legacy and shadow models
-- Silent testing only - does not affect user outputs

CREATE TABLE IF NOT EXISTS model_comparisons (
  comparison_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  legacy_metrics jsonb NOT NULL,
  shadow_metrics jsonb,
  delta_metrics jsonb,
  created_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_comparisons_scan_id 
  ON model_comparisons(scan_id);
CREATE INDEX IF NOT EXISTS idx_model_comparisons_created_at 
  ON model_comparisons(created_at DESC);

-- Enable RLS
ALTER TABLE model_comparisons ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all comparisons
CREATE POLICY "Comparisons: admins can read all"
  ON model_comparisons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy: System can insert comparisons (service role)
-- Note: This will be inserted via admin client, so no user context needed
CREATE POLICY "Comparisons: system can insert"
  ON model_comparisons FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed (comparison data is immutable)

