-- Plants table for Plant Manager
CREATE TABLE IF NOT EXISTS plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  strain_id uuid NULL,
  strain_name text,
  stage text CHECK (stage IN ('seedling', 'veg', 'flower', 'dry', 'cure', 'harvested', 'archived')),
  room text,
  medium text CHECK (medium IN ('soil', 'coco', 'hydro', 'rockwool', 'other')),
  start_date date,
  expected_harvest date,
  last_watered timestamp with time zone,
  last_fed timestamp with time zone,
  notes text,
  health_status text CHECK (health_status IN ('healthy', 'watching', 'stressed', 'critical')),
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_archived boolean DEFAULT false
);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION update_plants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plants_updated_at ON plants;
CREATE TRIGGER trg_plants_updated_at
BEFORE UPDATE ON plants
FOR EACH ROW
EXECUTE FUNCTION update_plants_updated_at();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_stage ON plants(stage);
CREATE INDEX IF NOT EXISTS idx_plants_room ON plants(room);
CREATE INDEX IF NOT EXISTS idx_plants_is_archived ON plants(is_archived);

-- Enable RLS
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

-- Policies: users only see and manage their own plants
CREATE POLICY "Plants: select own"
  ON plants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Plants: insert own"
  ON plants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Plants: update own"
  ON plants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Plants: delete own"
  ON plants FOR DELETE
  USING (auth.uid() = user_id);

