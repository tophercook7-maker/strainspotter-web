-- Image lake: Supabase metadata for production vs raw mirror + matchability flags.

ALTER TABLE public.scanner_reference_images
  ADD COLUMN IF NOT EXISTS raw_storage_bucket text,
  ADD COLUMN IF NOT EXISTS raw_storage_path text,
  ADD COLUMN IF NOT EXISTS raw_public_url text,
  ADD COLUMN IF NOT EXISTS is_matchable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS library_tier text NOT NULL DEFAULT 'raw';

COMMENT ON COLUMN public.scanner_reference_images.is_matchable IS
  'When true, row may be used for scanner fingerprint/embedding matching (production-safe).';
COMMENT ON COLUMN public.scanner_reference_images.library_tier IS
  'raw | pending | approved | trusted | rejected — lake classification for sync/reporting.';
COMMENT ON COLUMN public.scanner_reference_images.raw_storage_bucket IS
  'For rows mirrored to scanner-reference-raw-images; may match storage_bucket when tier is raw/pending.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scanner_reference_images_library_tier_check'
  ) THEN
    ALTER TABLE public.scanner_reference_images
      ADD CONSTRAINT scanner_reference_images_library_tier_check
      CHECK (library_tier IN ('raw', 'pending', 'approved', 'trusted', 'rejected'));
  END IF;
END $$;

-- Backfill existing rows that already live in the production reference bucket.
UPDATE public.scanner_reference_images
SET
  is_matchable = true,
  library_tier = CASE
    WHEN review_status IN (
      'trusted_user_confirmed',
      'trusted_manual_exact',
      'api_exact_match'
    ) THEN 'trusted'
    WHEN review_status IN (
      'approved_external_exact',
      'approved_external_auto'
    ) THEN 'approved'
    ELSE library_tier
  END
WHERE storage_bucket = 'scanner-reference-images'
  AND COALESCE(disabled, false) = false
  AND review_status IN (
    'trusted_user_confirmed',
    'trusted_manual_exact',
    'api_exact_match',
    'approved_external_exact',
    'approved_external_auto'
  );
