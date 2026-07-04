-- Align PostgREST upsert onConflict target with a real UNIQUE constraint (strain_slug, content_hash).
-- Also drop repo-default triple UNIQUE if present so (strain_slug, content_hash) is the authoritative key.

ALTER TABLE public.scanner_reference_images
  DROP CONSTRAINT IF EXISTS scanner_reference_images_strain_hash_key;

ALTER TABLE public.scanner_reference_images
  DROP CONSTRAINT IF EXISTS scanner_reference_images_strain_hash_bucket_unique;

DELETE FROM public.scanner_reference_images
WHERE content_hash IS NULL OR strain_slug IS NULL;

DELETE FROM public.scanner_reference_images a
USING public.scanner_reference_images b
WHERE a.strain_slug IS NOT DISTINCT FROM b.strain_slug
  AND a.content_hash IS NOT DISTINCT FROM b.content_hash
  AND a.ctid > b.ctid;

ALTER TABLE public.scanner_reference_images
  ALTER COLUMN content_hash SET NOT NULL;

ALTER TABLE public.scanner_reference_images
  ALTER COLUMN strain_slug SET NOT NULL;

ALTER TABLE public.scanner_reference_images
  ADD CONSTRAINT scanner_reference_images_strain_hash_key
  UNIQUE (strain_slug, content_hash);
