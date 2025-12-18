-- Desktop Access Control
-- Whitelist and feature flag support for private testing

-- Whitelist table for explicit user access
CREATE TABLE IF NOT EXISTS desktop_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamp with time zone DEFAULT now(),
  added_by uuid REFERENCES auth.users(id),
  notes text,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_desktop_whitelist_user ON desktop_whitelist(user_id);

ALTER TABLE desktop_whitelist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for desktop_whitelist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Only admins can view whitelist" ON desktop_whitelist;
  DROP POLICY IF EXISTS "Only admins can manage whitelist" ON desktop_whitelist;
END $$;

CREATE POLICY "Only admins can view whitelist"
  ON desktop_whitelist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Only admins can manage whitelist"
  ON desktop_whitelist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Add desktop_access feature flag to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS desktop_access boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_desktop_access ON profiles(desktop_access) WHERE desktop_access = true;

-- Function to check desktop access (for server-side use)
CREATE OR REPLACE FUNCTION check_desktop_access(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_whitelisted boolean;
  v_feature_flag boolean;
BEGIN
  -- Check whitelist
  SELECT EXISTS (
    SELECT 1 FROM desktop_whitelist WHERE user_id = p_user_id
  ) INTO v_whitelisted;

  IF v_whitelisted THEN
    RETURN true;
  END IF;

  -- Check feature flag
  SELECT COALESCE(desktop_access, false) INTO v_feature_flag
  FROM profiles
  WHERE (user_id = p_user_id OR id = p_user_id)
  LIMIT 1;

  RETURN COALESCE(v_feature_flag, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
