-- Profiles table for email collection and user data
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  plan text DEFAULT 'free'
);

-- Ensure last_login column exists (for existing tables)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read own profile
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can insert own profile (for initial creation)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);
