-- Add scan quota tracking fields to profiles table
-- This migration ensures the profiles table has the necessary fields for quota enforcement

-- Add fields if they don't exist (idempotent)
DO $$ 
BEGIN
  -- Add id_scans_used if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'id_scans_used'
  ) THEN
    ALTER TABLE profiles ADD COLUMN id_scans_used integer DEFAULT 0;
  END IF;

  -- Add doctor_scans_used if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'doctor_scans_used'
  ) THEN
    ALTER TABLE profiles ADD COLUMN doctor_scans_used integer DEFAULT 0;
  END IF;

  -- Add quota_reset_at if it doesn't exist (alternative name for last_reset)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'quota_reset_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN quota_reset_at timestamp with time zone;
    -- Initialize from last_reset if it exists
    UPDATE profiles SET quota_reset_at = last_reset WHERE quota_reset_at IS NULL AND last_reset IS NOT NULL;
    -- Set default for new rows
    ALTER TABLE profiles ALTER COLUMN quota_reset_at SET DEFAULT now();
  END IF;

  -- Update membership constraint to include 'elite'
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_membership_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_membership_check 
    CHECK (membership IN ('free', 'garden', 'pro', 'elite', 'standard'));
END $$;

-- Create index for quota reset date
CREATE INDEX IF NOT EXISTS idx_profiles_quota_reset_at ON profiles(quota_reset_at);

-- Function to reset scan quotas monthly (can be called by cron or scheduled job)
CREATE OR REPLACE FUNCTION reset_monthly_scan_quotas()
RETURNS void AS $$
DECLARE
  profile_record RECORD;
  defaults RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, membership, quota_reset_at, last_reset
    FROM profiles
    WHERE quota_reset_at < now() - INTERVAL '30 days'
       OR (quota_reset_at IS NULL AND last_reset < now() - INTERVAL '30 days')
  LOOP
    -- Determine defaults based on membership tier
    CASE profile_record.membership
      WHEN 'free' THEN
        defaults := ROW(5, 0); -- Configurable, default 5
      WHEN 'garden', 'standard', 'pro' THEN
        defaults := ROW(250, 40);
      WHEN 'elite' THEN
        defaults := ROW(NULL, NULL); -- Unlimited
      ELSE
        defaults := ROW(5, 0);
    END CASE;

    -- Reset counters
    UPDATE profiles
    SET 
      id_scans_used = 0,
      doctor_scans_used = 0,
      quota_reset_at = now(),
      last_reset = now()
    WHERE id = profile_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
