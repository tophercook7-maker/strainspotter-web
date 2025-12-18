-- Log Photos Table
-- Multiple photos per log entry

CREATE TABLE IF NOT EXISTS log_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES grow_logs(id) ON DELETE CASCADE,
  grow_id uuid NOT NULL REFERENCES grows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path text NOT NULL, -- storage path
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS log_photos_log_id_idx ON log_photos(log_id);
CREATE INDEX IF NOT EXISTS log_photos_grow_id_idx ON log_photos(grow_id);
CREATE INDEX IF NOT EXISTS log_photos_user_id_idx ON log_photos(user_id);

-- Enable RLS
ALTER TABLE log_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users manage own log photos
CREATE POLICY "Users manage own log photos"
ON log_photos
FOR ALL
USING (auth.uid() = user_id);
