-- 2026_05_25_pricing_expansion.sql
--
-- Monetization pivot follow-up (May 25 2026):
--   1. Add `founder_purchase_at` to profiles so we can identify founder-tier
--      lifetime customers and audit the limited-quantity SKU (first 1,000).
--   2. Add `training_consent` to profiles so the scanner pipeline can
--      ONLY use confirmed scans as training data when the user has
--      explicitly opted in. Default `false` is required for GDPR/CCPA.
--   3. Add `scans_training_eligible` to scans/scan_feedback (whichever
--      holds confirmed scans) so the training pipeline can filter cheaply.
--   4. Add `stripe_webhook_events` index for fast idempotency lookups
--      (we already have the table from 2026_05_07; add the proper index).
--
-- Manual application — Supabase migrations are not auto-applied in this
-- repo. Run in the SQL editor against the production DB AFTER deploying
-- the matching application code in this commit.

BEGIN;

/* ─── 1. profiles.founder_purchase_at ──────────────────────────────── */
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS founder_purchase_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_profiles_founder_purchase_at
  ON profiles(founder_purchase_at)
  WHERE founder_purchase_at IS NOT NULL;

COMMENT ON COLUMN profiles.founder_purchase_at IS
  'Set by Stripe webhook when user buys the founder_lifetime SKU. ' ||
  'NULL = not a founder. Used to count remaining inventory of the ' ||
  'first-1000 limited-quantity launch SKU.';

/* ─── 2. profiles.training_consent ─────────────────────────────────── */
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS training_consent boolean DEFAULT false NOT NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS training_consent_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_profiles_training_consent
  ON profiles(training_consent)
  WHERE training_consent = true;

COMMENT ON COLUMN profiles.training_consent IS
  'User has explicitly opted in to letting their confirmed scans be ' ||
  'used as training data for future model fine-tunes. MUST be false ' ||
  'by default. Toggle via /api/settings/training-consent or the ' ||
  'settings UI.';

COMMENT ON COLUMN profiles.training_consent_at IS
  'When the user last set training_consent to true. NULL if never ' ||
  'consented. Reset to NULL if the user revokes consent.';

/* ─── 3. Eligible-for-training flag on scan_feedback ───────────────── */
-- Some users will have confirmed scans BEFORE consenting; the pipeline
-- should only train on scans where BOTH consent and trust flags are
-- true. We materialize that as a column so the training query is fast.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'scan_feedback'
  ) THEN
    ALTER TABLE scan_feedback
      ADD COLUMN IF NOT EXISTS training_eligible boolean DEFAULT false NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_scan_feedback_training_eligible
      ON scan_feedback(training_eligible)
      WHERE training_eligible = true;

    COMMENT ON COLUMN scan_feedback.training_eligible IS
      'True only when (a) the scan was confirmed correct by the user, ' ||
      'AND (b) the user had training_consent=true at the time the ' ||
      'scan was confirmed. Training pipeline filters on this column.';
  END IF;
END $$;

/* ─── 4. Faster stripe webhook idempotency lookups ─────────────────── */
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'stripe_webhook_events'
  ) THEN
    -- event_id is already PK from the original migration; this is a
    -- belt-and-suspenders covering index for future-proofing if we add
    -- columns to the PK.
    CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id
      ON stripe_webhook_events(event_id);
  END IF;
END $$;

COMMIT;

/* ─── Smoke checks (run separately after migration) ────────────────────

  SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
   WHERE table_name = 'profiles'
     AND column_name IN ('founder_purchase_at', 'training_consent', 'training_consent_at');

  -- Should return three rows; founder_purchase_at nullable, training_consent NOT NULL default false.

  SELECT count(*) AS founder_count
    FROM profiles WHERE founder_purchase_at IS NOT NULL;

  -- Should equal the number of founder_lifetime SKU sales in Stripe.

──────────────────────────────────────────────────────────────────────── */
