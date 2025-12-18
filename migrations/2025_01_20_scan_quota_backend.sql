-- Scan Quota Backend (Foundation)
-- Authoritative server-side quota system

-- Ensure profiles table exists with membership column
-- If profiles table doesn't exist, create it
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid, -- May or may not exist, handle both
  membership text DEFAULT 'free' CHECK (membership IN ('free', 'garden', 'standard', 'pro')),
  scans_remaining integer DEFAULT 25,
  doctor_scans_remaining integer DEFAULT 0,
  last_reset timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add membership column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'membership'
  ) THEN
    ALTER TABLE profiles ADD COLUMN membership text DEFAULT 'free';
    ALTER TABLE profiles ADD CONSTRAINT profiles_membership_check 
      CHECK (membership IN ('free', 'garden', 'standard', 'pro'));
  END IF;
END $$;

-- Update profiles table with quota fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS id_scans_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS doctor_scans_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS quota_reset_at timestamp with time zone DEFAULT (now() + interval '1 month');

-- Update membership tier constraint to include 'standard'
-- First, drop the old constraint if it exists (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'membership'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_membership_check;
    
    -- Add new constraint with 'standard' tier
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_membership_check 
    CHECK (membership IN ('free', 'garden', 'standard', 'pro'));
  END IF;
END $$;

-- Update membership tier enum if needed (free, standard, pro)
-- Note: If 'garden' exists, we'll migrate it to 'standard' in application code

-- Create index for quota reset queries
CREATE INDEX IF NOT EXISTS idx_profiles_quota_reset ON profiles(quota_reset_at) WHERE quota_reset_at IS NOT NULL;

-- Create index for tier queries
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(membership);

-- Function to get quota limits for a tier (locked values)
CREATE OR REPLACE FUNCTION get_quota_limits(tier text)
RETURNS TABLE(id_scans_limit integer, doctor_scans_limit integer) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE tier
      WHEN 'free' THEN 5  -- Very limited
      WHEN 'standard' THEN 250
      WHEN 'pro' THEN NULL  -- NULL = unlimited
      ELSE 5
    END AS id_scans_limit,
    CASE tier
      WHEN 'free' THEN 0
      WHEN 'standard' THEN 40
      WHEN 'pro' THEN NULL  -- NULL = unlimited
      ELSE 0
    END AS doctor_scans_limit;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Ensure membership column exists before creating functions that use it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'membership'
  ) THEN
    ALTER TABLE profiles ADD COLUMN membership text DEFAULT 'free';
    ALTER TABLE profiles ADD CONSTRAINT profiles_membership_check 
      CHECK (membership IN ('free', 'garden', 'standard', 'pro'));
  END IF;
END $$;

-- Function to check if user can perform a scan (atomic check)
CREATE OR REPLACE FUNCTION can_perform_scan(
  p_user_id uuid,
  p_scan_type text  -- 'id' or 'doctor'
)
RETURNS TABLE(
  allowed boolean,
  reason text,
  reset_at timestamp with time zone,
  remaining integer
) AS $$
DECLARE
  v_tier text;
  v_id_scans_used integer;
  v_doctor_scans_used integer;
  v_quota_reset_at timestamp with time zone;
  v_id_limit integer;
  v_doctor_limit integer;
BEGIN
  -- Get user profile (handle both user_id and id columns)
  -- Use COALESCE to default membership to 'free' if null
  SELECT 
    COALESCE(membership, 'free')::text,
    COALESCE(id_scans_used, 0),
    COALESCE(doctor_scans_used, 0),
    COALESCE(quota_reset_at, now() + interval '1 month')
  INTO v_tier, v_id_scans_used, v_doctor_scans_used, v_quota_reset_at
  FROM profiles
  WHERE (user_id = p_user_id OR id = p_user_id)
  LIMIT 1;

  -- If no profile found, return error
  IF v_tier IS NULL THEN
    RETURN QUERY SELECT false, 'user_not_found'::text, NULL::timestamp with time zone, 0;
    RETURN;
  END IF;
  
  -- Ensure tier is not null or empty (default to 'free')
  IF v_tier IS NULL OR v_tier = '' THEN
    v_tier := 'free';
  END IF;

  -- Get quota limits for tier
  SELECT id_scans_limit, doctor_scans_limit
  INTO v_id_limit, v_doctor_limit
  FROM get_quota_limits(v_tier);

  -- Pro tier: unlimited
  IF v_tier = 'pro' THEN
    RETURN QUERY SELECT true, 'pro_tier'::text, v_quota_reset_at, NULL::integer;
    RETURN;
  END IF;

  -- Check quota based on scan type
  IF p_scan_type = 'id' THEN
    IF v_id_limit IS NULL THEN
      -- Unlimited (shouldn't happen for non-pro, but handle it)
      RETURN QUERY SELECT true, 'unlimited'::text, v_quota_reset_at, NULL::integer;
    ELSIF v_id_scans_used < v_id_limit THEN
      RETURN QUERY SELECT true, 'quota_available'::text, v_quota_reset_at, (v_id_limit - v_id_scans_used);
    ELSE
      RETURN QUERY SELECT false, 'quota_exceeded'::text, v_quota_reset_at, 0;
    END IF;
  ELSIF p_scan_type = 'doctor' THEN
    IF v_doctor_limit IS NULL THEN
      RETURN QUERY SELECT true, 'unlimited'::text, v_quota_reset_at, NULL::integer;
    ELSIF v_doctor_scans_used < v_doctor_limit THEN
      RETURN QUERY SELECT true, 'quota_available'::text, v_quota_reset_at, (v_doctor_limit - v_doctor_scans_used);
    ELSE
      RETURN QUERY SELECT false, 'quota_exceeded'::text, v_quota_reset_at, 0;
    END IF;
  ELSE
    RETURN QUERY SELECT false, 'invalid_scan_type'::text, NULL::timestamp with time zone, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically increment scan usage (only if quota allows)
CREATE OR REPLACE FUNCTION increment_scan_usage(
  p_user_id uuid,
  p_scan_type text  -- 'id' or 'doctor'
)
RETURNS TABLE(
  success boolean,
  id_scans_used integer,
  doctor_scans_used integer,
  reason text
) AS $$
DECLARE
  v_check_result RECORD;
  v_tier text;
BEGIN
  -- First check if scan is allowed
  SELECT * INTO v_check_result
  FROM can_perform_scan(p_user_id, p_scan_type);

  IF NOT v_check_result.allowed THEN
    RETURN QUERY SELECT false, 0, 0, v_check_result.reason;
    RETURN;
  END IF;

  -- Atomically increment usage (handle both user_id and id columns)
  IF p_scan_type = 'id' THEN
    UPDATE profiles
    SET 
      id_scans_used = COALESCE(id_scans_used, 0) + 1,
      updated_at = now()
    WHERE (user_id = p_user_id OR id = p_user_id)
    RETURNING COALESCE(id_scans_used, 0), COALESCE(doctor_scans_used, 0)
    INTO v_check_result.id_scans_used, v_check_result.doctor_scans_used;
  ELSIF p_scan_type = 'doctor' THEN
    UPDATE profiles
    SET 
      doctor_scans_used = COALESCE(doctor_scans_used, 0) + 1,
      updated_at = now()
    WHERE (user_id = p_user_id OR id = p_user_id)
    RETURNING COALESCE(id_scans_used, 0), COALESCE(doctor_scans_used, 0)
    INTO v_check_result.id_scans_used, v_check_result.doctor_scans_used;
  ELSE
    RETURN QUERY SELECT false, 0, 0, 'invalid_scan_type'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_check_result.id_scans_used, v_check_result.doctor_scans_used, 'success'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset quotas for users whose reset date has passed
CREATE OR REPLACE FUNCTION reset_quota_for_expired_users()
RETURNS integer AS $$
DECLARE
  v_reset_count integer;
BEGIN
  WITH updated AS (
    UPDATE profiles
    SET 
      id_scans_used = 0,
      doctor_scans_used = 0,
      quota_reset_at = COALESCE(quota_reset_at, now() + interval '1 month') + interval '1 month',
      updated_at = now()
    WHERE COALESCE(quota_reset_at, now() + interval '1 month') <= now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_reset_count FROM updated;
  
  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing 'garden' tier to 'standard' if it exists
-- Only update if membership column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'membership'
  ) THEN
    UPDATE profiles
    SET membership = 'standard'
    WHERE membership = 'garden';
  END IF;
END $$;

-- Initialize quota_reset_at for existing users if null
UPDATE profiles
SET quota_reset_at = COALESCE(quota_reset_at, now() + interval '1 month')
WHERE quota_reset_at IS NULL;

-- Initialize usage counters for existing users
UPDATE profiles
SET 
  id_scans_used = COALESCE(id_scans_used, 0),
  doctor_scans_used = COALESCE(doctor_scans_used, 0)
WHERE id_scans_used IS NULL OR doctor_scans_used IS NULL;

-- Ensure all profiles have a membership value
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'membership'
  ) THEN
    UPDATE profiles
    SET membership = COALESCE(membership, 'free')
    WHERE membership IS NULL;
  END IF;
END $$;
