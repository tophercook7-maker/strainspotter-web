-- Grow Logbook v1 Tables
-- Mobile-first grow tracking

-- Grows (one per plant/cycle)
CREATE TABLE IF NOT EXISTS grows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strain_name text NOT NULL,
  start_date date NOT NULL,
  stage text NOT NULL CHECK (stage IN ('seed','veg','flower','dry','cure')),
  created_at timestamptz DEFAULT now()
);

-- Daily log entries
CREATE TABLE IF NOT EXISTS grow_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_id uuid NOT NULL REFERENCES grows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('seed','veg','flower','dry','cure')),
  photo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grow_logs_grow_id_idx ON grow_logs(grow_id);
CREATE INDEX IF NOT EXISTS grows_user_id_idx ON grows(user_id);

-- Enable RLS
ALTER TABLE grows ENABLE ROW LEVEL SECURITY;
ALTER TABLE grow_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users manage own grows
CREATE POLICY "Users manage own grows"
ON grows
FOR ALL
USING (auth.uid() = user_id);

-- Policy: Users manage own grow logs
CREATE POLICY "Users manage own grow logs"
ON grow_logs
FOR ALL
USING (auth.uid() = user_id);
