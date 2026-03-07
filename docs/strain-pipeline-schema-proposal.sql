-- StrainSpotter Strain Database Pipeline — Schema Proposal
-- PROPOSAL ONLY: Review before applying. Does NOT run automatically.
-- See docs/strain-database-pipeline-plan.md for full plan.

-- =============================================================================
-- 1. Extend vault_strains (canonical strain records)
-- =============================================================================
ALTER TABLE vault_strains
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'approved' CHECK (review_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- =============================================================================
-- 2. Extend vault_strain_images
-- =============================================================================
ALTER TABLE vault_strain_images
  ADD COLUMN IF NOT EXISTS image_type text CHECK (image_type IN ('bud','whole_plant','leaf','packaging','trichome')),
  ADD COLUMN IF NOT EXISTS quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 1),
  ADD COLUMN IF NOT EXISTS source_record_id uuid;

-- =============================================================================
-- 3. Extend strain_reference_images
-- =============================================================================
ALTER TABLE strain_reference_images
  ADD COLUMN IF NOT EXISTS image_type text CHECK (image_type IN ('bud','whole_plant','leaf','packaging','trichome')),
  ADD COLUMN IF NOT EXISTS quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 1),
  ADD COLUMN IF NOT EXISTS source_record_id uuid;

-- =============================================================================
-- 4. Create strain_source_records (raw ingestion tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS strain_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('file','api','scraper','manual')),
  source_uri text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  extraction_status text NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending','extracted','failed')),
  extraction_error text,
  extracted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strain_source_records_source_type ON strain_source_records(source_type);
CREATE INDEX IF NOT EXISTS idx_strain_source_records_extraction_status ON strain_source_records(extraction_status);

-- =============================================================================
-- 5. Create strain_source_extractions (AI-assisted structured output)
-- =============================================================================
CREATE TABLE IF NOT EXISTS strain_source_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES strain_source_records(id) ON DELETE CASCADE,
  extractor_model text,
  structured_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strain_source_extractions_source_record ON strain_source_extractions(source_record_id);
CREATE INDEX IF NOT EXISTS idx_strain_source_extractions_review_status ON strain_source_extractions(review_status);

-- =============================================================================
-- 6. FK from vault_strain_images to strain_source_records (optional)
-- =============================================================================
-- ALTER TABLE vault_strain_images
--   ADD CONSTRAINT fk_vault_strain_images_source
--   FOREIGN KEY (source_record_id) REFERENCES strain_source_records(id);

-- =============================================================================
-- 7. Future: vault_image_embeddings (pgvector)
-- Uncomment when ready for vector search.
-- =============================================================================
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE TABLE IF NOT EXISTS vault_image_embeddings (
--   image_id uuid NOT NULL REFERENCES vault_strain_images(image_id) ON DELETE CASCADE,
--   embedding vector(1536),
--   model_version text NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now(),
--   PRIMARY KEY (image_id, model_version)
-- );
