-- Scanner asset buckets (reference vs training).
-- Service-role uploads bypass Storage RLS; policies below gate anon/authenticated access.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'scanner-reference-images',
    'scanner-reference-images',
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'scanner-training-images',
    'scanner-training-images',
    false,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

-- Public read for approved reference imagery (bucket flagged public; policy allows SELECT).
DROP POLICY IF EXISTS "scanner_reference_images_public_read" ON storage.objects;
CREATE POLICY "scanner_reference_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'scanner-reference-images');

-- Training bucket: no anon/authenticated read policy (private). Uploads are via service role only.
