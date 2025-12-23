-- Update scan quota functions to check top-ups after monthly quota
-- Usage rules: 1) Consume monthly quota first, 2) Then consume top-ups

-- Update can_perform_scan to check top-ups when monthly quota is exhausted
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
  v_id_topups_remaining integer;
  v_doctor_topups_remaining integer;
  v_quota_reset_at timestamp with time zone;
  v_id_limit integer;
  v_doctor_limit integer;
  v_monthly_remaining integer;
BEGIN
  -- Get user profile (handle both user_id and id columns)
  SELECT 
    COALESCE(membership, 'free')::text,
    COALESCE(id_scans_used, 0),
    COALESCE(doctor_scans_used, 0),
    COALESCE(id_scan_topups_remaining, 0),
    COALESCE(doctor_scan_topups_remaining, 0),
    COALESCE(quota_reset_at, now() + interval '1 month')
  INTO v_tier, v_id_scans_used, v_doctor_scans_used, v_id_topups_remaining, v_doctor_topups_remaining, v_quota_reset_at
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

  -- Normalize tier (map legacy to new system) BEFORE getting limits
  IF v_tier IN ('garden', 'standard') THEN
    v_tier := 'pro';
  END IF;

  -- Elite tier: unlimited (check before getting limits)
  IF v_tier = 'elite' THEN
    RETURN QUERY SELECT true, 'elite_tier'::text, v_quota_reset_at, NULL::integer;
    RETURN;
  END IF;

  -- Get quota limits for normalized tier
  SELECT id_scans_limit, doctor_scans_limit
  INTO v_id_limit, v_doctor_limit
  FROM get_quota_limits(v_tier);

  -- Check quota based on scan type
  IF p_scan_type = 'id' THEN
    IF v_id_limit IS NULL THEN
      -- Unlimited (elite tier)
      RETURN QUERY SELECT true, 'unlimited'::text, v_quota_reset_at, NULL::integer;
    ELSIF v_id_scans_used < v_id_limit THEN
      -- Monthly quota available
      v_monthly_remaining := v_id_limit - v_id_scans_used;
      RETURN QUERY SELECT true, 'quota_available'::text, v_quota_reset_at, (v_monthly_remaining + v_id_topups_remaining);
    ELSIF v_id_topups_remaining > 0 THEN
      -- Monthly quota exhausted, but top-ups available
      RETURN QUERY SELECT true, 'topup_available'::text, v_quota_reset_at, v_id_topups_remaining;
    ELSE
      -- Both monthly quota and top-ups exhausted
      RETURN QUERY SELECT false, 'quota_exceeded'::text, v_quota_reset_at, 0;
    END IF;
  ELSIF p_scan_type = 'doctor' THEN
    IF v_doctor_limit IS NULL THEN
      -- Unlimited (elite tier)
      RETURN QUERY SELECT true, 'unlimited'::text, v_quota_reset_at, NULL::integer;
    ELSIF v_doctor_limit = 0 THEN
      -- Not allowed for free tier (check top-ups as fallback)
      IF v_doctor_topups_remaining > 0 THEN
        RETURN QUERY SELECT true, 'topup_available'::text, v_quota_reset_at, v_doctor_topups_remaining;
      ELSE
        RETURN QUERY SELECT false, 'not_allowed'::text, v_quota_reset_at, 0;
      END IF;
    ELSIF v_doctor_scans_used < v_doctor_limit THEN
      -- Monthly quota available
      v_monthly_remaining := v_doctor_limit - v_doctor_scans_used;
      RETURN QUERY SELECT true, 'quota_available'::text, v_quota_reset_at, (v_monthly_remaining + v_doctor_topups_remaining);
    ELSIF v_doctor_topups_remaining > 0 THEN
      -- Monthly quota exhausted, but top-ups available
      RETURN QUERY SELECT true, 'topup_available'::text, v_quota_reset_at, v_doctor_topups_remaining;
    ELSE
      -- Both monthly quota and top-ups exhausted
      RETURN QUERY SELECT false, 'quota_exceeded'::text, v_quota_reset_at, 0;
    END IF;
  ELSE
    RETURN QUERY SELECT false, 'invalid_scan_type'::text, NULL::timestamp with time zone, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update increment_scan_usage to consume monthly quota first, then top-ups
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
  v_id_scans_used integer;
  v_doctor_scans_used integer;
  v_id_topups_remaining integer;
  v_doctor_topups_remaining integer;
  v_id_limit integer;
  v_doctor_limit integer;
BEGIN
  -- First check if scan is allowed
  SELECT * INTO v_check_result
  FROM can_perform_scan(p_user_id, p_scan_type);

  IF NOT v_check_result.allowed THEN
    RETURN QUERY SELECT false, 0, 0, v_check_result.reason;
    RETURN;
  END IF;

  -- Get current state with row lock
  SELECT 
    COALESCE(membership, 'free')::text,
    COALESCE(id_scans_used, 0),
    COALESCE(doctor_scans_used, 0),
    COALESCE(id_scan_topups_remaining, 0),
    COALESCE(doctor_scan_topups_remaining, 0)
  INTO v_tier, v_id_scans_used, v_doctor_scans_used, v_id_topups_remaining, v_doctor_topups_remaining
  FROM profiles
  WHERE (user_id = p_user_id OR id = p_user_id)
  FOR UPDATE
  LIMIT 1;

  -- Normalize tier
  IF v_tier IN ('garden', 'standard') THEN
    v_tier := 'pro';
  END IF;

  -- Get limits
  SELECT id_scans_limit, doctor_scans_limit
  INTO v_id_limit, v_doctor_limit
  FROM get_quota_limits(v_tier);

  -- Consume monthly quota first, then top-ups
  IF p_scan_type = 'id' THEN
    IF v_id_limit IS NOT NULL AND v_id_scans_used < v_id_limit THEN
      -- Consume from monthly quota
      UPDATE profiles
      SET 
        id_scans_used = id_scans_used + 1,
        updated_at = now()
      WHERE (user_id = p_user_id OR id = p_user_id)
      RETURNING COALESCE(id_scans_used, 0), COALESCE(doctor_scans_used, 0)
      INTO v_id_scans_used, v_doctor_scans_used;
    ELSIF v_id_topups_remaining > 0 THEN
      -- Consume from top-ups
      UPDATE profiles
      SET 
        id_scan_topups_remaining = id_scan_topups_remaining - 1,
        updated_at = now()
      WHERE (user_id = p_user_id OR id = p_user_id)
      RETURNING COALESCE(id_scans_used, 0), COALESCE(doctor_scans_used, 0)
      INTO v_id_scans_used, v_doctor_scans_used;
    ELSE
      RETURN QUERY SELECT false, 0, 0, 'quota_exceeded'::text;
      RETURN;
    END IF;
  ELSIF p_scan_type = 'doctor' THEN
    IF v_doctor_limit IS NOT NULL AND v_doctor_limit > 0 AND v_doctor_scans_used < v_doctor_limit THEN
      -- Consume from monthly quota
      UPDATE profiles
      SET 
        doctor_scans_used = doctor_scans_used + 1,
        updated_at = now()
      WHERE (user_id = p_user_id OR id = p_user_id)
      RETURNING COALESCE(id_scans_used, 0), COALESCE(doctor_scans_used, 0)
      INTO v_id_scans_used, v_doctor_scans_used;
    ELSIF v_doctor_topups_remaining > 0 THEN
      -- Consume from top-ups
      UPDATE profiles
      SET 
        doctor_scan_topups_remaining = doctor_scan_topups_remaining - 1,
        updated_at = now()
      WHERE (user_id = p_user_id OR id = p_user_id)
      RETURNING COALESCE(id_scans_used, 0), COALESCE(doctor_scans_used, 0)
      INTO v_id_scans_used, v_doctor_scans_used;
    ELSE
      RETURN QUERY SELECT false, 0, 0, 'quota_exceeded'::text;
      RETURN;
    END IF;
  ELSE
    RETURN QUERY SELECT false, 0, 0, 'invalid_scan_type'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_id_scans_used, v_doctor_scans_used, 'success'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
