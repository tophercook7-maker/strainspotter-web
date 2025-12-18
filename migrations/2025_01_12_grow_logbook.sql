-- Grow Logbook Tables
-- Personal grows and daily log entries

-- Grows table
CREATE TABLE IF NOT EXISTS grows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  strain text,
  stage text CHECK (stage IN ('seed', 'veg', 'flower', 'harvest')) DEFAULT 'seed',
  started_at date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE grows ENABLE ROW LEVEL SECURITY;

-- Policy: Users manage own grows
CREATE POLICY "Users manage own grows"
ON grows
FOR ALL
USING (auth.uid() = user_id);

-- Grow Logs table
CREATE TABLE IF NOT EXISTS grow_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_id uuid REFERENCES grows(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date DEFAULT CURRENT_DATE,
  notes text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE grow_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users manage own grow logs
CREATE POLICY "Users manage own grow logs"
ON grow_logs
FOR ALL
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS grows_user_id_idx ON grows(user_id);
CREATE INDEX IF NOT EXISTS grows_created_at_idx ON grows(created_at DESC);
CREATE INDEX IF NOT EXISTS grow_logs_grow_id_idx ON grow_logs(grow_id);
CREATE INDEX IF NOT EXISTS grow_logs_entry_date_idx ON grow_logs(entry_date ASC);
