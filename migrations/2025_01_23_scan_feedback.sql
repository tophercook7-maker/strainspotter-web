-- Scan Feedback Table
-- Signal collection only - additive and reversible

CREATE TABLE IF NOT EXISTS scan_feedback (
  feedback_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('agree', 'unsure', 'disagree')),
  feedback_context text,
  created_at timestamp DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_scan_feedback_scan_id 
  ON scan_feedback(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_created_at 
  ON scan_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_user_id 
  ON scan_feedback(user_id);

-- Unique constraint: one feedback per user per scan
CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_feedback_user_scan 
  ON scan_feedback(scan_id, user_id) 
  WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE scan_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert feedback for their own scans
CREATE POLICY "Feedback: users can insert own"
  ON scan_feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scans 
      WHERE scans.id = scan_feedback.scan_id 
      AND (scans.user_id = auth.uid() OR scans.user_id IS NULL)
    )
    AND (scan_feedback.user_id = auth.uid() OR scan_feedback.user_id IS NULL)
  );

-- Policy: Users can view their own feedback
CREATE POLICY "Feedback: users can view own"
  ON scan_feedback FOR SELECT
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM scans 
      WHERE scans.id = scan_feedback.scan_id 
      AND scans.user_id = auth.uid()
    )
  );

-- Policy: Admins can read all feedback
CREATE POLICY "Feedback: admins can read all"
  ON scan_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- No updates or deletes allowed (signal collection only)

