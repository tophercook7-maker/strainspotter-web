-- 2026_05_25_apple_iap_columns.sql
--
-- Apple IAP support: store the Apple transaction id and the current
-- subscription period end so the cron / webhook layer has a forensic
-- audit trail and a place to write renewal updates.
--
-- IMPORTANT: run BEFORE deploying the /api/iap/webhook handler. The
-- handler writes to apple_original_transaction_id + apple_current_period_end;
-- without these columns, every IAP webhook call will fail with a
-- "column does not exist" error.
--
-- Idempotent. Safe to re-run.

BEGIN;

/* ─── 1. profiles.apple_original_transaction_id ──────────────────── */
-- Apple gives every subscription an "original transaction id" that
-- stays stable across renewals. It's the right primary key for matching
-- a Supabase user to their App Store subscription.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_apple_orig_txn
  ON profiles(apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;

COMMENT ON COLUMN profiles.apple_original_transaction_id IS
  'Apple original_transaction_id — stable across renewals. ' ||
  'Set by the RevenueCat webhook (app/api/iap/webhook) on INITIAL_PURCHASE, ' ||
  'RENEWAL, PRODUCT_CHANGE, UNCANCELLATION, and NON_RENEWING_PURCHASE.';

/* ─── 2. profiles.apple_current_period_end ───────────────────────── */
-- For subscription tiers (member, pro), this is when the paid period
-- ends. UI can show "renews on X" / "expires on X" using this field.
-- For founder lifetime + topups, leave NULL.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS apple_current_period_end timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_profiles_apple_period_end
  ON profiles(apple_current_period_end)
  WHERE apple_current_period_end IS NOT NULL;

COMMENT ON COLUMN profiles.apple_current_period_end IS
  'End of current paid subscription period (Apple expires_date). ' ||
  'NULL for non-subscription purchases (founder lifetime, topups) and ' ||
  'for users who pay via Stripe (use stripe_customer_id for those).';

COMMIT;

/* ─── Smoke checks (run after migration) ────────────────────────────

  SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
   WHERE table_name = 'profiles'
     AND column_name IN ('apple_original_transaction_id', 'apple_current_period_end');

  -- Should return 2 rows, both nullable text/timestamp.

────────────────────────────────────────────────────────────────────── */
