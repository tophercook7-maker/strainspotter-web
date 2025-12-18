-- Community Intelligence Layer (Lane A)
-- Read-only summaries and insights

-- Weekly group summaries
CREATE TABLE IF NOT EXISTS community_group_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  group_id text NOT NULL,
  week_start date NOT NULL,
  summary_text text NOT NULL,
  themes jsonb, -- Array of theme strings
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(category, group_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_community_summaries_group ON community_group_summaries(category, group_id);
CREATE INDEX IF NOT EXISTS idx_community_summaries_week ON community_group_summaries(week_start DESC);

ALTER TABLE community_group_summaries ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view summaries" ON community_group_summaries;
END $$;

CREATE POLICY "Anyone can view summaries"
  ON community_group_summaries FOR SELECT
  USING (true);

-- User last seen tracking per group
CREATE TABLE IF NOT EXISTS community_user_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  group_id text NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, category, group_id)
);

CREATE INDEX IF NOT EXISTS idx_community_user_seen_user ON community_user_seen(user_id);
CREATE INDEX IF NOT EXISTS idx_community_user_seen_group ON community_user_seen(category, group_id);

ALTER TABLE community_user_seen ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (run these first if you get errors)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own seen records" ON community_user_seen;
  DROP POLICY IF EXISTS "Users can insert their own seen records" ON community_user_seen;
  DROP POLICY IF EXISTS "Users can update their own seen records" ON community_user_seen;
END $$;

CREATE POLICY "Users can view their own seen records"
  ON community_user_seen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seen records"
  ON community_user_seen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seen records"
  ON community_user_seen FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pattern signals (cross-group themes)
CREATE TABLE IF NOT EXISTS community_pattern_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_text text NOT NULL,
  affected_groups jsonb, -- Array of {category, group_id}
  confidence_score numeric(3, 2) DEFAULT 0.5, -- 0.0 to 1.0
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_community_pattern_signals_created ON community_pattern_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_pattern_signals_expires ON community_pattern_signals(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE community_pattern_signals ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view pattern signals" ON community_pattern_signals;
END $$;

CREATE POLICY "Anyone can view pattern signals"
  ON community_pattern_signals FOR SELECT
  USING (expires_at IS NULL OR expires_at > now());
