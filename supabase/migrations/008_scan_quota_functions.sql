-- Database functions for atomic scan quota checking and incrementing
-- These functions ensure quota enforcement is done server-side

-- Function to check if user can perform a scan (atomic check)
CREATE OR REPLACE FUNCTION can_perform_scan(
  p_user_id uuid,
  p_scan_type text
)
RETURNS TABLE(
  allowed boolean,
  reason text,
  reset_at timestamp with time zone,
  remaining integer
) AS $$
DECLARE
  v_profile RECORD;
  v_membership text;
  v_id_scans_used integer;
  v_doctor_scans_used integer;
  v_id_scans_limit integer;
  v_doctor_scans_limit integer;
  v_reset_at timestamp with time zone;
  v_normalized_tier text;
BEGIN
  -- Get user profile
  SELECT 
    membership,
    COALESCE(id_scans_used, 0) as id_used,
    COALESCE(doctor_scans_used, 0) as doctor_used,
    COALESCE(quota_reset_at, last_reset, now()) as reset_date
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id OR user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'user_not_found'::text, NULL::timestamp with time zone, 0;
    RETURN;
  END IF;

  v_membership := v_profile.membership;
  v_id_scans_used := v_profile.id_used;
  v_doctor_scans_used := v_profile.doctor_used;
  v_reset_at := v_profile.reset_date;

  -- Normalize tier (map legacy to new system)
  IF v_membership IN ('garden', 'standard') THEN
    v_normalized_tier := 'pro';
  ELSIF v_membership = 'elite' THEN
    v_normalized_tier := 'elite';
  ELSIF v_membership = 'pro' THEN
    v_normalized_tier := 'pro';
  ELSE
    v_normalized_tier := 'free';
  END IF;

  -- Check if reset is needed (30 days since last reset)
  IF v_reset_at < now() - INTERVAL '30 days' THEN
    -- Reset counters
    UPDATE profiles
    SET 
      id_scans_used = 0,
      doctor_scans_used = 0,
      quota_reset_at = now(),
      last_reset = now()
    WHERE id = p_user_id OR user_id = p_user_id;
    
    v_id_scans_used := 0;
    v_doctor_scans_used := 0;
    v_reset_at := now();
  END IF;

  -- Determine limits based on tier
  CASE v_normalized_tier
    WHEN 'free' THEN
      v_id_scans_limit := COALESCE((SELECT current_setting('app.free_tier_id_scan_limit', true))::integer, 5);
      v_doctor_scans_limit := 0;
    WHEN 'pro' THEN
      v_id_scans_limit := 250;
      v_doctor_scans_limit := 40;
    WHEN 'elite' THEN
      v_id_scans_limit := NULL; -- Unlimited
      v_doctor_scans_limit := NULL; -- Unlimited
    ELSE
      v_id_scans_limit := 5;
      v_doctor_scans_limit := 0;
  END CASE;

  -- Check quota based on scan type
  IF v_normalized_tier = 'elite' THEN
    -- Elite tier: always allowed
    RETURN QUERY SELECT true, 'elite_tier'::text, v_reset_at, NULL::integer;
  ELSIF p_scan_type = 'doctor' THEN
    -- Doctor scan check
    IF v_doctor_scans_limit IS NULL THEN
      -- Unlimited
      RETURN QUERY SELECT true, 'unlimited'::text, v_reset_at, NULL::integer;
    ELSIF v_doctor_scans_limit = 0 THEN
      -- Not allowed for this tier
      RETURN QUERY SELECT false, 'not_allowed'::text, v_reset_at, 0;
    ELSIF v_doctor_scans_used >= v_doctor_scans_limit THEN
      -- Quota exceeded
      RETURN QUERY SELECT false, 'quota_exceeded'::text, v_reset_at, 0;
    ELSE
      -- Quota available
      RETURN QUERY SELECT true, 'quota_available'::text, v_reset_at, (v_doctor_scans_limit - v_doctor_scans_used);
    END IF;
  ELSE
    -- ID scan check
    IF v_id_scans_limit IS NULL THEN
      -- Unlimited
      RETURN QUERY SELECT true, 'unlimited'::text, v_reset_at, NULL::integer;
    ELSIF v_id_scans_used >= v_id_scans_limit THEN
      -- Quota exceeded
      RETURN QUERY SELECT false, 'quota_exceeded'::text, v_reset_at, 0;
    ELSE
      -- Quota available
      RETURN QUERY SELECT true, 'quota_available'::text, v_reset_at, (v_id_scans_limit - v_id_scans_used);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically increment scan usage (only if quota allows)
CREATE OR REPLACE FUNCTION increment_scan_usage(
  p_user_id uuid,
  p_scan_type text
)
RETURNS TABLE(
  success boolean,
  id_scans_used integer,
  doctor_scans_used integer,
  reason text
) AS $$
DECLARE
  v_profile RECORD;
  v_membership text;
  v_id_scans_used integer;
  v_doctor_scans_used integer;
  v_id_scans_limit integer;
  v_doctor_scans_limit integer;
  v_reset_at timestamp with time zone;
  v_normalized_tier text;
  v_allowed boolean;
BEGIN
  -- Get user profile with row lock
  SELECT 
    membership,
    COALESCE(id_scans_used, 0) as id_used,
    COALESCE(doctor_scans_used, 0) as doctor_used,
    COALESCE(quota_reset_at, last_reset, now()) as reset_date
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id OR user_id = p_user_id
  FOR UPDATE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'user_not_found'::text;
    RETURN;
  END IF;

  v_membership := v_profile.membership;
  v_id_scans_used := v_profile.id_used;
  v_doctor_scans_used := v_profile.doctor_used;
  v_reset_at := v_profile.reset_date;

  -- Normalize tier
  IF v_membership IN ('garden', 'standard') THEN
    v_normalized_tier := 'pro';
  ELSIF v_membership = 'elite' THEN
    v_normalized_tier := 'elite';
  ELSIF v_membership = 'pro' THEN
    v_normalized_tier := 'pro';
  ELSE
    v_normalized_tier := 'free';
  END IF;

  -- Check if reset is needed
  IF v_reset_at < now() - INTERVAL '30 days' THEN
    v_id_scans_used := 0;
    v_doctor_scans_used := 0;
    v_reset_at := now();
  END IF;

  -- Determine limits
  CASE v_normalized_tier
    WHEN 'free' THEN
      v_id_scans_limit := COALESCE((SELECT current_setting('app.free_tier_id_scan_limit', true))::integer, 5);
      v_doctor_scans_limit := 0;
    WHEN 'pro' THEN
      v_id_scans_limit := 250;
      v_doctor_scans_limit := 40;
    WHEN 'elite' THEN
      v_id_scans_limit := NULL;
      v_doctor_scans_limit := NULL;
    ELSE
      v_id_scans_limit := 5;
      v_doctor_scans_limit := 0;
  END CASE;

  -- Check quota
  IF v_normalized_tier = 'elite' THEN
    v_allowed := true;
  ELSIF p_scan_type = 'doctor' THEN
    v_allowed := (v_doctor_scans_limit IS NULL OR v_doctor_scans_used < v_doctor_scans_limit);
  ELSE
    v_allowed := (v_id_scans_limit IS NULL OR v_id_scans_used < v_id_scans_limit);
  END IF;

  IF NOT v_allowed THEN
    RETURN QUERY SELECT false, v_id_scans_used, v_doctor_scans_used, 'quota_exceeded'::text;
    RETURN;
  END IF;

  -- Increment usage
  IF p_scan_type = 'doctor' THEN
    v_doctor_scans_used := v_doctor_scans_used + 1;
  ELSE
    v_id_scans_used := v_id_scans_used + 1;
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    id_scans_used = v_id_scans_used,
    doctor_scans_used = v_doctor_scans_used,
    quota_reset_at = v_reset_at,
    last_reset = v_reset_at,
    updated_at = now()
  WHERE id = p_user_id OR user_id = p_user_id;

  RETURN QUERY SELECT true, v_id_scans_used, v_doctor_scans_used, 'success'::text;
END;
$$ LANGUAGE plpgsql;
