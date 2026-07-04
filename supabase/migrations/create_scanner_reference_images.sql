-- Metadata index for scanner reference + training objects mirrored to Supabase Storage.

CREATE TABLE IF NOT EXISTS public.scanner_reference_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_slug text NOT NULL,
  strain_name text NOT NULL,
  source_name text,
  source_page_url text,
  original_image_url text,
  local_path text,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  content_hash text NOT NULL,
  width int,
  height int,
  status text,
  review_status text,
  trust_level text,
  disabled boolean NOT NULL DEFAULT false,
  disabled_reason text,
  license_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scanner_reference_images_bucket_path_unique UNIQUE (storage_bucket, storage_path),
  CONSTRAINT scanner_reference_images_strain_hash_bucket_unique UNIQUE (strain_slug, content_hash, storage_bucket)
);

CREATE INDEX IF NOT EXISTS scanner_reference_images_strain_slug_idx
  ON public.scanner_reference_images (strain_slug);

CREATE INDEX IF NOT EXISTS scanner_reference_images_content_hash_idx
  ON public.scanner_reference_images (content_hash);

CREATE INDEX IF NOT EXISTS scanner_reference_images_disabled_idx
  ON public.scanner_reference_images (disabled);

CREATE INDEX IF NOT EXISTS scanner_reference_images_review_status_idx
  ON public.scanner_reference_images (review_status);

CREATE OR REPLACE FUNCTION public.scanner_reference_images_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scanner_reference_images_updated_at ON public.scanner_reference_images;
CREATE TRIGGER scanner_reference_images_updated_at
  BEFORE UPDATE ON public.scanner_reference_images
  FOR EACH ROW
  EXECUTE FUNCTION public.scanner_reference_images_set_updated_at();

ALTER TABLE public.scanner_reference_images ENABLE ROW LEVEL SECURITY;

-- Backend jobs use service role (bypasses RLS). Optional read surface for logged-in app users.
DROP POLICY IF EXISTS "scanner_reference_images_select_authenticated" ON public.scanner_reference_images;
CREATE POLICY "scanner_reference_images_select_authenticated"
ON public.scanner_reference_images
FOR SELECT
TO authenticated
USING (
  disabled = false
  AND storage_bucket = 'scanner-reference-images'
);

COMMENT ON TABLE public.scanner_reference_images IS
  'Scanner reference/training image metadata; blobs live in Supabase Storage buckets.';
