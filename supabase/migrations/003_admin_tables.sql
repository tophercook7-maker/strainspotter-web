-- Admin tables for dataset management and model tuning

-- Matcher configuration table
CREATE TABLE IF NOT EXISTS matcher_config (
  id SERIAL PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  weight_phash FLOAT NOT NULL DEFAULT 0.25,
  weight_color FLOAT NOT NULL DEFAULT 0.20,
  weight_texture FLOAT NOT NULL DEFAULT 0.25,
  weight_embedding FLOAT NOT NULL DEFAULT 0.20,
  weight_label FLOAT NOT NULL DEFAULT 0.10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT weights_sum_check CHECK (
    ABS(weight_phash + weight_color + weight_texture + weight_embedding + weight_label - 1.0) < 0.01
  )
);

-- Insert default config
INSERT INTO matcher_config (version, weight_phash, weight_color, weight_texture, weight_embedding, weight_label)
VALUES (1, 0.25, 0.20, 0.25, 0.20, 0.10)
ON CONFLICT DO NOTHING;

-- Dataset update tracking
CREATE TABLE IF NOT EXISTS dataset_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strain TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('scrape', 'generate', 'process', 'upload', 'manifest', 'full_pipeline')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Index for querying by strain
CREATE INDEX IF NOT EXISTS idx_dataset_updates_strain ON dataset_updates(strain);
CREATE INDEX IF NOT EXISTS idx_dataset_updates_event ON dataset_updates(event);
CREATE INDEX IF NOT EXISTS idx_dataset_updates_created_at ON dataset_updates(created_at DESC);

-- Model version tracking
CREATE TABLE IF NOT EXISTS model_versions (
  id SERIAL PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_by UUID REFERENCES auth.users(id),
  notes TEXT,
  config_id INTEGER REFERENCES matcher_config(id)
);

-- Insert initial version
INSERT INTO model_versions (version, config_id)
SELECT 1, id FROM matcher_config ORDER BY id DESC LIMIT 1
ON CONFLICT (version) DO NOTHING;

-- Enable RLS
ALTER TABLE matcher_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can read/write
CREATE POLICY "Admins can read matcher_config" ON matcher_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update matcher_config" ON matcher_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can read dataset_updates" ON dataset_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert dataset_updates" ON dataset_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can read model_versions" ON model_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert model_versions" ON model_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
