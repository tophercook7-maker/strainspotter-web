-- Community Trust & Signal Features

-- Add role column to profiles if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role text;

-- Add helpful flag to replies
ALTER TABLE community_replies
ADD COLUMN IF NOT EXISTS is_helpful boolean DEFAULT false;

ALTER TABLE community_replies
ADD COLUMN IF NOT EXISTS marked_helpful_by uuid REFERENCES auth.users(id);

ALTER TABLE community_replies
ADD COLUMN IF NOT EXISTS marked_helpful_at timestamp with time zone;

-- Add pinned flag to posts
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users(id);

ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone;

-- Add moderation explanation fields
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS moderation_reason text;

ALTER TABLE community_replies
ADD COLUMN IF NOT EXISTS moderation_reason text;

-- Add AI context cards table
CREATE TABLE IF NOT EXISTS community_ai_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  context_type text NOT NULL CHECK (context_type IN ('safety', 'legality', 'method_note', 'general')),
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT check_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_community_ai_context_post_id ON community_ai_context(post_id);
CREATE INDEX IF NOT EXISTS idx_community_ai_context_reply_id ON community_ai_context(reply_id);

ALTER TABLE community_ai_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view AI context"
  ON community_ai_context FOR SELECT
  USING (true);

-- Indexes for helpful and pinned queries
CREATE INDEX IF NOT EXISTS idx_community_replies_helpful ON community_replies(is_helpful) WHERE is_helpful = true;
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON community_posts(is_pinned) WHERE is_pinned = true;

-- Function to check if user is a moderator
-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS is_moderator(uuid);

-- Create function to check if user is a moderator
CREATE OR REPLACE FUNCTION is_moderator(user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user has moderator role in profiles
  -- Adjust this based on your actual role system
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE (user_id = user_id_param OR id = user_id_param)
    AND role IN ('moderator', 'admin', 'grower_moderator', 'enthusiast')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
