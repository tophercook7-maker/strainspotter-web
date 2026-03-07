-- strain_reference_images: Approved and candidate strain reference images for future image-to-image matching.
-- Candidates are created from high-confidence scans; approved images require manual promotion.

CREATE TABLE IF NOT EXISTS strain_reference_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_slug text NOT NULL,
  image_url text NOT NULL,
  source_type text NOT NULL,
  match_confidence numeric NULL,
  approved boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'candidate',
  scan_event_id uuid NULL,
  created_by uuid NULL,
  approved_by uuid NULL,
  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_strain_reference_images_strain_slug
  ON strain_reference_images (strain_slug);

CREATE INDEX IF NOT EXISTS idx_strain_reference_images_approved
  ON strain_reference_images (approved);

CREATE INDEX IF NOT EXISTS idx_strain_reference_images_approval_status
  ON strain_reference_images (approval_status);

CREATE INDEX IF NOT EXISTS idx_strain_reference_images_scan_event_id
  ON strain_reference_images (scan_event_id) WHERE scan_event_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_strain_reference_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_strain_reference_images_updated_at
  BEFORE UPDATE ON strain_reference_images
  FOR EACH ROW
  EXECUTE FUNCTION set_strain_reference_images_updated_at();

-- RLS: Enable RLS; service-role bypasses. No public/anon read; no anon insert.
ALTER TABLE strain_reference_images ENABLE ROW LEVEL SECURITY;

-- Service role (used by server) bypasses RLS by default.
-- Deny all for anon and authenticated by default:
CREATE POLICY "No public read"
  ON strain_reference_images FOR SELECT
  TO anon
  USING (false);

CREATE POLICY "No anon insert"
  ON strain_reference_images FOR INSERT
  TO anon
  WITH CHECK (false);

CREATE POLICY "No anon update"
  ON strain_reference_images FOR UPDATE
  TO anon
  USING (false);

-- Authenticated users: allow insert of candidate only when created_by matches (placeholder for future auth)
-- For now, no authenticated policies since app uses anonymous/public garden.
-- Add when auth is introduced:
-- CREATE POLICY "Authenticated insert candidate"
--   ON strain_reference_images FOR INSERT
--   TO authenticated
--   WITH CHECK (approval_status = 'candidate' AND approved = false AND created_by = auth.uid());
