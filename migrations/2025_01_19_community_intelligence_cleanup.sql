-- Cleanup script: Drop existing policies before running main migration
-- Run this ONLY if you get "policy already exists" errors
-- This script checks if tables exist before dropping policies

DO $$ 
BEGIN
  -- Only drop policies if tables exist
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_group_summaries') THEN
    DROP POLICY IF EXISTS "Anyone can view summaries" ON community_group_summaries;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_user_seen') THEN
    DROP POLICY IF EXISTS "Users can view their own seen records" ON community_user_seen;
    DROP POLICY IF EXISTS "Users can insert their own seen records" ON community_user_seen;
    DROP POLICY IF EXISTS "Users can update their own seen records" ON community_user_seen;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_pattern_signals') THEN
    DROP POLICY IF EXISTS "Anyone can view pattern signals" ON community_pattern_signals;
  END IF;
END $$;
