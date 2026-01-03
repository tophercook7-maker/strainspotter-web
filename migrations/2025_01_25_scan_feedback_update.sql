-- Update Scan Feedback Table
-- Change feedback_type to feedback_signal with new values
-- ALIGNED / UNSURE / MISMATCH (replaces RIGHT / UNSURE / WRONG)
-- Signal-collection system for pattern recognition improvement

-- Drop old constraints if they exist
ALTER TABLE scan_feedback 
  DROP CONSTRAINT IF EXISTS scan_feedback_confidence_level_at_scan_check;

ALTER TABLE scan_feedback 
  DROP CONSTRAINT IF EXISTS scan_feedback_feedback_type_check;

-- Rename columns (handle gracefully if already renamed)
DO $$ 
BEGIN
  -- Rename feedback_type to feedback_signal if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scan_feedback' AND column_name = 'feedback_type'
  ) THEN
    ALTER TABLE scan_feedback RENAME COLUMN feedback_type TO feedback_signal;
  END IF;

  -- Rename confidence_level_at_scan to confidence_level if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scan_feedback' AND column_name = 'confidence_level_at_scan'
  ) THEN
    ALTER TABLE scan_feedback RENAME COLUMN confidence_level_at_scan TO confidence_level;
  END IF;
END $$;

-- Add new check constraint with updated values
ALTER TABLE scan_feedback
  DROP CONSTRAINT IF EXISTS scan_feedback_feedback_signal_check;

ALTER TABLE scan_feedback
  ADD CONSTRAINT scan_feedback_feedback_signal_check 
  CHECK (feedback_signal IN ('ALIGNED', 'UNSURE', 'MISMATCH'));

-- Make primary_strain_slug optional (signal collection doesn't require it)
ALTER TABLE scan_feedback 
  ALTER COLUMN primary_strain_slug DROP NOT NULL;

-- Add new optional fields for signal collection (if they don't exist)
DO $$ 
BEGIN
  -- Add image_quality_bucket if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scan_feedback' AND column_name = 'image_quality_bucket'
  ) THEN
    ALTER TABLE scan_feedback 
      ADD COLUMN image_quality_bucket text;
  END IF;

  -- Add phenotype_cluster_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scan_feedback' AND column_name = 'phenotype_cluster_id'
  ) THEN
    ALTER TABLE scan_feedback 
      ADD COLUMN phenotype_cluster_id text;
  END IF;
END $$;

-- Update indexes (drop old, create new)
DROP INDEX IF EXISTS idx_scan_feedback_feedback_type;
CREATE INDEX IF NOT EXISTS idx_scan_feedback_feedback_signal 
  ON scan_feedback(feedback_signal);

DROP INDEX IF EXISTS idx_scan_feedback_confidence_level_at_scan;
CREATE INDEX IF NOT EXISTS idx_scan_feedback_confidence_level 
  ON scan_feedback(confidence_level);

