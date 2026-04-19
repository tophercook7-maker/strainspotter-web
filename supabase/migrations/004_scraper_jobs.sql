-- Scraper jobs tracking table

CREATE TABLE IF NOT EXISTS scraper_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL UNIQUE,
  strain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  images_scraped INTEGER DEFAULT 0,
  error TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_scraper_jobs_strain ON scraper_jobs(strain);
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_status ON scraper_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_started_at ON scraper_jobs(started_at DESC);

-- Enable RLS
ALTER TABLE scraper_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can read/write
CREATE POLICY "Admins can read scraper_jobs" ON scraper_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert scraper_jobs" ON scraper_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update scraper_jobs" ON scraper_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
