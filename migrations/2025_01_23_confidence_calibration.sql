-- Confidence Calibration & Trend Memory Tables
-- Additive only - does not modify existing schemas

-- Signal storage for confidence calibration
CREATE TABLE IF NOT EXISTS scan_confidence_signals (
  scan_id uuid PRIMARY KEY REFERENCES scans(id) ON DELETE CASCADE,
  image_quality text,
  phenotype_agreement float,
  matcher_agreement float,
  packaging_consistency float,
  generated_confidence float,
  created_at timestamp DEFAULT now()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_scan_confidence_signals_created_at 
  ON scan_confidence_signals(created_at);

-- Trend aggregation for phenotype patterns
CREATE TABLE IF NOT EXISTS phenotype_trends (
  trend_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text, -- 'global' | 'brand' | 'grower' | 'batch' (nullable)
  scope_id text, -- optional external identifier
  phenotype_signature jsonb NOT NULL,
  occurrence_count int DEFAULT 1,
  first_seen timestamp DEFAULT now(),
  last_seen timestamp DEFAULT now()
);

-- Indexes for trend queries
CREATE INDEX IF NOT EXISTS idx_phenotype_trends_scope 
  ON phenotype_trends(scope);
CREATE INDEX IF NOT EXISTS idx_phenotype_trends_last_seen 
  ON phenotype_trends(last_seen DESC);

-- Enable RLS
ALTER TABLE scan_confidence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE phenotype_trends ENABLE ROW LEVEL SECURITY;

-- Policies: users can view their own signals
CREATE POLICY "Signals: users can view own"
  ON scan_confidence_signals FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM scans WHERE scans.id = scan_confidence_signals.scan_id AND (scans.user_id = auth.uid() OR scans.user_id IS NULL))
  );

-- Policies: trends are read-only for now (aggregation happens server-side)
CREATE POLICY "Trends: public read"
  ON phenotype_trends FOR SELECT
  USING (true);

