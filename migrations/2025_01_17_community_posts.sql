-- Community Posts and Replies Tables

-- Community Posts
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_category text NOT NULL,
  group_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type text NOT NULL CHECK (post_type IN ('question', 'experience', 'observation', 'tip')),
  title text NOT NULL,
  body text NOT NULL,
  status text DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
  report_count integer DEFAULT 0,
  ai_moderation_warning text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Community Replies
CREATE TABLE IF NOT EXISTS community_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
  report_count integer DEFAULT 0,
  ai_moderation_warning text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_group ON community_posts(group_category, group_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status);

CREATE INDEX IF NOT EXISTS idx_community_replies_post_id ON community_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_community_replies_user_id ON community_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_community_replies_created_at ON community_replies(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_community_replies_status ON community_replies(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_community_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trg_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_community_updated_at();

CREATE TRIGGER trg_community_replies_updated_at
  BEFORE UPDATE ON community_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_community_updated_at();

-- Enable Row Level Security
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
CREATE POLICY "Anyone can view published posts"
  ON community_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Users can create posts"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON community_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for replies
CREATE POLICY "Anyone can view published replies"
  ON community_replies FOR SELECT
  USING (status = 'published');

CREATE POLICY "Users can create replies"
  ON community_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON community_replies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON community_replies FOR DELETE
  USING (auth.uid() = user_id);

-- Reports table (for moderation tracking)
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT check_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_community_reports_post_id ON community_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_reply_id ON community_reports(reply_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_user_id ON community_reports(user_id);

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON community_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
