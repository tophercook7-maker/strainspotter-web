-- Grow Notes table
CREATE TABLE IF NOT EXISTS grow_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  related_plant_id uuid REFERENCES plants(id) ON DELETE SET NULL,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'scan', 'community')),
  shareable boolean DEFAULT false
);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION update_grow_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grow_notes_updated_at ON grow_notes;
CREATE TRIGGER trg_grow_notes_updated_at
BEFORE UPDATE ON grow_notes
FOR EACH ROW
EXECUTE FUNCTION update_grow_notes_updated_at();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_grow_notes_user_id ON grow_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_notes_created_at ON grow_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grow_notes_related_plant_id ON grow_notes(related_plant_id) WHERE related_plant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grow_notes_source ON grow_notes(source);

-- Enable RLS
ALTER TABLE grow_notes ENABLE ROW LEVEL SECURITY;

-- Policies: users only see and manage their own notes
CREATE POLICY "Grow Notes: select own"
  ON grow_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Grow Notes: insert own"
  ON grow_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Grow Notes: update own"
  ON grow_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Grow Notes: delete own"
  ON grow_notes FOR DELETE
  USING (auth.uid() = user_id);
