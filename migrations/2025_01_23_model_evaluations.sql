-- Model Evaluations Table
-- Stores evaluation metrics for shadow model comparisons

CREATE TABLE IF NOT EXISTS model_evaluations (
  evaluation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version text NOT NULL,
  evaluation_type text NOT NULL, -- 'shadow' | 'production' | 'comparison'
  metrics jsonb NOT NULL,
  disagreement_rate float,
  confidence_alignment float,
  phenotype_agreement float,
  evaluated_at timestamp DEFAULT now(),
  notes text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_evaluations_model_version 
  ON model_evaluations(model_version);
CREATE INDEX IF NOT EXISTS idx_model_evaluations_evaluated_at 
  ON model_evaluations(evaluated_at DESC);

-- Enable RLS
ALTER TABLE model_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all evaluations
CREATE POLICY "Evaluations: admins can read all"
  ON model_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can insert evaluations
CREATE POLICY "Evaluations: admins can insert"
  ON model_evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

