-- 2026_05_30_lockdown_profiles_rls.sql
--
-- CRITICAL SECURITY FIX: column-restrict the profiles UPDATE grant.
--
-- Before this migration: the `profiles_update_own` RLS policy on
-- public.profiles only checked row ownership (auth.uid() = id) and did
-- NOT restrict which columns the authenticated role could mutate. With
-- the anon key in hand (which the SPA already has), any signed-in user
-- could `PATCH /rest/v1/profiles?id=eq.<self>` with
--   { "membership": "elite",
--     "scans_remaining": 999999,
--     "founder_purchase_at": "2026-05-30T00:00:00Z" }
-- and self-grant any tier, scan credits, or founder status — bypassing
-- Stripe and Apple entirely.
--
-- After this migration: REVOKE all UPDATE rights from `authenticated`,
-- then re-GRANT UPDATE only on a small allowlist of columns that the
-- client legitimately writes (display_name set on signup, onboarding
-- fields, training consent toggle). All entitlement / quota / billing
-- columns become server-only — writeable solely by the service-role key
-- used in /api/stripe/webhook, /api/iap/webhook, and the scan route's
-- counter increment.
--
-- Server routes that write profiles via the user's bearer token (not
-- the service role) need to be migrated to the service role:
--   • app/api/profile/training-consent/route.ts → already uses bearer;
--     training_consent is in the safe-allowlist so this keeps working.
--   • app/api/profile/route.ts → updates onboarding-style fields with
--     bearer; the columns it writes (interests, user_type, etc.) are
--     in the safe-allowlist.
-- Service-role webhook writers are unaffected (service role bypasses
-- RLS by design).
--
-- Idempotent. Safe to re-run.

BEGIN;

/* ─── 1. Drop the broad UPDATE policies ───────────────────────────── */
-- 2025_01_12_profiles.sql created "Users can update own profile"
-- 2026_01_06_ppm_mvp_schema.sql created "profiles_update_own"
-- Drop both; we replace with a column-scoped GRANT below.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

/* ─── 2. Column-scoped privileges ─────────────────────────────────── */
-- Strip every column-level UPDATE privilege from `authenticated`, then
-- grant back ONLY the columns the client may legitimately write.
--
-- This is belt-and-suspenders alongside RLS: column-level GRANTs are
-- enforced by PostgreSQL itself, so even if a future RLS policy is
-- accidentally widened, the client still cannot touch billing columns.
REVOKE UPDATE ON public.profiles FROM authenticated;

-- Safe columns. Adding a new client-writable column? Add it here AND
-- re-run this GRANT. Anything not listed is server-only.
GRANT UPDATE (
  display_name,
  user_type,
  experience_level,
  interests,
  location_text,
  moderator_interest,
  onboarding_completed,
  training_consent,
  training_consent_at,
  preferences,
  intelligence_preferences
) ON public.profiles TO authenticated;

/* ─── 3. Re-create a row-scoped RLS policy ────────────────────────── */
-- RLS still scopes which rows the user can touch (only their own).
-- The column-level grant above scopes WHICH columns; this scopes WHICH
-- rows. Belt + suspenders.
CREATE POLICY profiles_update_own_columns ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

/* ─── 4. Defense-in-depth: prevent membership from being widened ──
   even by a misconfigured server route. The CHECK constraint on
   membership values already exists from 2025_01_20_scan_quota_backend.sql
   ('free' | 'garden' | 'standard' | 'pro' | 'elite'). Verify it's
   still present; if missing, add it. */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_membership_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_membership_check
      CHECK (membership IN ('free', 'garden', 'standard', 'pro', 'elite'));
  END IF;
END $$;

COMMIT;

/* ─── Smoke checks (run separately after migration) ──────────────────

  -- 1. Verify the broad policies are gone and the new one is present:
  SELECT polname, cmd
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'profiles';

  -- Expected: profiles_select_own, profiles_update_own_columns,
  -- plus any INSERT policy.

  -- 2. Verify column-level grants — only the safe-allowlist should
  -- appear for the `authenticated` role:
  SELECT column_name, privilege_type
    FROM information_schema.column_privileges
   WHERE table_schema = 'public'
     AND table_name = 'profiles'
     AND grantee = 'authenticated'
     AND privilege_type = 'UPDATE'
   ORDER BY column_name;

  -- Expected rows: display_name, experience_level, interests,
  -- intelligence_preferences, location_text, moderator_interest,
  -- onboarding_completed, preferences, training_consent,
  -- training_consent_at, user_type.

  -- 3. End-to-end check — as a signed-in user (anon key + bearer),
  -- the following should return 403 / no rows updated:
  --   PATCH /rest/v1/profiles?id=eq.<self>
  --   Body: {"membership":"elite"}
  -- And this should succeed:
  --   PATCH /rest/v1/profiles?id=eq.<self>
  --   Body: {"display_name":"new name"}

──────────────────────────────────────────────────────────────────────── */
