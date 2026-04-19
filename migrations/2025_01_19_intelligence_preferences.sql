-- Add intelligence preferences column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS intelligence_preferences jsonb DEFAULT '{"enabled": true, "weekly_summaries": true, "pattern_signals": true, "what_you_missed": true}'::jsonb;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_intelligence_prefs ON profiles USING gin (intelligence_preferences);
