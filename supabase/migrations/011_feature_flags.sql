-- Feature Flags System
-- Allows server-side control of feature visibility and behavior
-- Flags default to OFF and fail safely

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  description text,
  -- Optional: per-user or per-cohort targeting
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort text, -- e.g., 'beta', 'premium', 'all'
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_user ON feature_flags(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_flags_cohort ON feature_flags(cohort) WHERE cohort IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled, flag_key);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent)
-- Users can read their own flags and global flags
DROP POLICY IF EXISTS "Users can read feature flags" ON feature_flags;
CREATE POLICY "Users can read feature flags"
  ON feature_flags FOR SELECT
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL OR
    auth.uid() IS NOT NULL -- Authenticated users can see global flags
  );

-- Only admins can modify flags (handled via service role)
-- No UPDATE/DELETE policies for regular users

-- Function to get feature flag value for a user
-- Returns true if flag is enabled globally OR for the specific user/cohort
CREATE OR REPLACE FUNCTION get_feature_flag(
  p_flag_key text,
  p_user_id uuid DEFAULT NULL,
  p_user_cohort text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_enabled boolean;
BEGIN
  -- First check user-specific flag
  IF p_user_id IS NOT NULL THEN
    SELECT enabled INTO v_enabled
    FROM feature_flags
    WHERE flag_key = p_flag_key
      AND user_id = p_user_id
      AND enabled = true
    LIMIT 1;
    
    IF v_enabled = true THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Then check cohort-specific flag
  IF p_user_cohort IS NOT NULL THEN
    SELECT enabled INTO v_enabled
    FROM feature_flags
    WHERE flag_key = p_flag_key
      AND cohort = p_user_cohort
      AND enabled = true
      AND user_id IS NULL
    LIMIT 1;
    
    IF v_enabled = true THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Finally check global flag
  SELECT enabled INTO v_enabled
  FROM feature_flags
  WHERE flag_key = p_flag_key
    AND user_id IS NULL
    AND cohort IS NULL
    AND enabled = true
  LIMIT 1;
  
  -- Default to false if not found or not enabled
  RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Insert default feature flags (all disabled by default)
INSERT INTO feature_flags (flag_key, enabled, description) VALUES
  ('enable_grow_notes', false, 'Enable Grow Notes feature'),
  ('enable_news_sources_v2', false, 'Enable enhanced news sources'),
  ('enable_enriched_scans', true, 'Enable enriched scan results'), -- Already implemented, keep enabled
  ('enable_scan_topups', true, 'Enable scan top-up packages'), -- Already implemented, keep enabled
  ('enable_community_intelligence', false, 'Enable community intelligence loop'),
  ('enable_visual_matching', true, 'Enable visual strain matching') -- Already implemented, keep enabled
ON CONFLICT (flag_key) DO NOTHING;

-- Function to get all feature flags for a user (for client-side)
CREATE OR REPLACE FUNCTION get_user_feature_flags(
  p_user_id uuid DEFAULT NULL,
  p_user_cohort text DEFAULT NULL
)
RETURNS TABLE(flag_key text, enabled boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ff.flag_key,
    get_feature_flag(ff.flag_key, p_user_id, p_user_cohort) as enabled
  FROM feature_flags ff
  WHERE get_feature_flag(ff.flag_key, p_user_id, p_user_cohort) = true
     OR (ff.user_id IS NULL AND ff.cohort IS NULL); -- Include all global flags for visibility
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
