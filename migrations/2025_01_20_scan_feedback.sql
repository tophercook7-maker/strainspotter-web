-- Scan Feedback Table
-- Stores user feedback on scan results for passive learning loop

CREATE TABLE IF NOT EXISTS scan_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES scans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_strain_slug text NOT NULL,
  confidence_level_at_scan text NOT NULL CHECK (confidence_level_at_scan IN ('LOW', 'MEDIUM', 'HIGH')),
  feedback_type text NOT NULL CHECK (feedback_type IN ('RIGHT', 'UNSURE', 'WRONG')),
  optional_note text,
  created_at timestamptz DEFAULT now(),
  
  -- One feedback per user per scan
  CONSTRAINT scan_feedback_unique_user_scan UNIQUE (scan_id, user_id)
);

-- Indexes for learning signal extraction
CREATE INDEX IF NOT EXISTS idx_scan_feedback_scan_id ON scan_feedback(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_user_id ON scan_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_primary_strain_slug ON scan_feedback(primary_strain_slug);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_confidence_level ON scan_feedback(confidence_level_at_scan);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_feedback_type ON scan_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_created_at ON scan_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE scan_feedback ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only insert their own feedback, can view their own feedback
CREATE POLICY "Scan feedback: users can insert own"
  ON scan_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Scan feedback: users can view own"
  ON scan_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- No UPDATE or DELETE policies (immutable as per spec)

