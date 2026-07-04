-- Training sync writes to scanner_reference_images with upsert onConflict (strain_slug, content_hash).
-- If the unique constraint is missing or malformed, rerun this (matches reference sync migration intent).

ALTER TABLE public.scanner_reference_images
DROP CONSTRAINT IF EXISTS scanner_reference_images_strain_hash_key;

DELETE FROM public.scanner_reference_images
WHERE content_hash IS NULL
   OR strain_slug IS NULL
   OR trim(strain_slug) = '';

ALTER TABLE public.scanner_reference_images
ALTER COLUMN content_hash SET NOT NULL;

ALTER TABLE public.scanner_reference_images
ALTER COLUMN strain_slug SET NOT NULL;

ALTER TABLE public.scanner_reference_images
ADD CONSTRAINT scanner_reference_images_strain_hash_key
UNIQUE (strain_slug, content_hash);
