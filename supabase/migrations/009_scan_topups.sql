-- Add scan top-up fields to profiles table
-- Top-ups do NOT expire and stack cumulatively

-- Add top-up fields if they don't exist
DO $$ 
BEGIN
  -- Add id_scan_topups_remaining if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'id_scan_topups_remaining'
  ) THEN
    ALTER TABLE profiles ADD COLUMN id_scan_topups_remaining integer DEFAULT 0;
  END IF;

  -- Add doctor_scan_topups_remaining if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'doctor_scan_topups_remaining'
  ) THEN
    ALTER TABLE profiles ADD COLUMN doctor_scan_topups_remaining integer DEFAULT 0;
  END IF;
END $$;

-- Create index for top-up queries
CREATE INDEX IF NOT EXISTS idx_profiles_topups ON profiles(id_scan_topups_remaining, doctor_scan_topups_remaining) 
  WHERE id_scan_topups_remaining > 0 OR doctor_scan_topups_remaining > 0;
