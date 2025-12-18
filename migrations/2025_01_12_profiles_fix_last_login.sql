-- Fix: Add last_login column if it doesn't exist
-- Run this in Supabase SQL editor if PGRST204 error occurs

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_login timestamptz;
