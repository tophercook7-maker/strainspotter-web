-- Add is_owner field to profiles table
-- Owner has access to private dashboard and system metrics

-- Add is_owner column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_owner'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_owner boolean DEFAULT false;
  END IF;
END $$;

-- Create index for owner queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_owner ON profiles(is_owner) WHERE is_owner = true;

-- Note: Set is_owner = true manually for owner account(s) via SQL:
-- UPDATE profiles SET is_owner = true WHERE id = 'owner-user-uuid';
