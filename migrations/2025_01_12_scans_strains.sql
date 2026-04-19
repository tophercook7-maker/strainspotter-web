-- Scans table for storing scan records
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  image_path text NOT NULL,
  image_url text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'matched', 'error')),
  vision jsonb,
  match jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Strains table (if not exists)
CREATE TABLE IF NOT EXISTS strains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  aliases text[],
  created_at timestamptz DEFAULT now()
);

-- Indexes for scans
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);

-- Indexes for strains
CREATE INDEX IF NOT EXISTS idx_strains_slug ON strains(slug);
CREATE INDEX IF NOT EXISTS idx_strains_name ON strains(name);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_scans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_scans_updated_at ON scans;
CREATE TRIGGER trg_scans_updated_at
BEFORE UPDATE ON scans
FOR EACH ROW
EXECUTE FUNCTION update_scans_updated_at();

-- Enable RLS (optional, can be adjusted based on access needs)
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE strains ENABLE ROW LEVEL SECURITY;

-- Basic policies (users can see their own scans, everyone can see strains)
CREATE POLICY "Scans: users can view own"
  ON scans FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Scans: users can insert own"
  ON scans FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Strains: public read"
  ON strains FOR SELECT
  USING (true);
