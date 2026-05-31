-- 2026_05_31_iap_transaction_uniqueness.sql
--
-- HIGH SECURITY FIX: bind each Apple original_transaction_id to at most
-- ONE Supabase user. Without this constraint, an attacker who tampers
-- with the Capacitor build (or just spoofs the iOS app's IPC to
-- RevenueCat) can call `Purchases.logIn(<victim_supabase_user_id>)` on
-- their device before purchasing on their own Apple ID. The RC webhook
-- arrives with the attacker's Apple transaction but the victim's
-- app_user_id, granting the victim's account a Pro/founder entitlement
-- the attacker paid for — and re-using the SAME transaction to upgrade
-- a SECOND account at no extra cost on subsequent webhook replays.
--
-- This migration:
--   1. Backfills any duplicate apple_original_transaction_id values by
--      keeping only the FIRST profile to claim each transaction (oldest
--      profile by created_at wins; the loser's IAP fields are cleared
--      so they can re-link properly).
--   2. Adds a UNIQUE constraint so future double-claims fail at the
--      database layer. The IAP webhook should catch the constraint
--      error and refuse the second binding.
--
-- Idempotent. Safe to re-run.

BEGIN;

/* ─── 1. Backfill: deduplicate any existing transaction_id collisions ── */
-- This is defensive — there shouldn't be any yet, but if a buggy webhook
-- ran in the past, this cleans it up. Keeps the oldest profile bound to
-- each transaction; clears the IAP fields on the duplicates so they
-- can re-bind via a fresh purchase.
WITH ranked AS (
  SELECT
    id,
    apple_original_transaction_id,
    ROW_NUMBER() OVER (
      PARTITION BY apple_original_transaction_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.profiles
  WHERE apple_original_transaction_id IS NOT NULL
)
UPDATE public.profiles
   SET apple_original_transaction_id = NULL,
       apple_current_period_end      = NULL
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

/* ─── 2. UNIQUE constraint on apple_original_transaction_id ───────────── */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'profiles_apple_original_transaction_id_key'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_apple_original_transaction_id_key
      UNIQUE (apple_original_transaction_id);
  END IF;
END $$;

COMMIT;

/* ─── Smoke checks ──────────────────────────────────────────────────────

  -- 1. Verify the constraint exists:
  SELECT conname, contype
    FROM pg_constraint
   WHERE conrelid = 'public.profiles'::regclass
     AND conname  = 'profiles_apple_original_transaction_id_key';
  -- Expected: 1 row with contype = 'u'.

  -- 2. Confirm no duplicates remain:
  SELECT apple_original_transaction_id, count(*)
    FROM public.profiles
   WHERE apple_original_transaction_id IS NOT NULL
   GROUP BY apple_original_transaction_id
   HAVING count(*) > 1;
  -- Expected: 0 rows.

──────────────────────────────────────────────────────────────────────── */
