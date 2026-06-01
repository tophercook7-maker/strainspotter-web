-- 2026_05_31_profiles_rls_cleanup.sql
--
-- CRITICAL PII LEAK FIX: at least four overlapping SELECT policies on
-- public.profiles had `USING (true)` for the anon or authenticated role,
-- meaning ANYONE (including unauthenticated visitors) could fetch every
-- user's row via the Supabase REST API with just the public anon key:
--
--   curl -sS 'https://<project>.supabase.co/rest/v1/profiles?select=*' \
--     -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>"
--
-- Confirmed 2026-05-31 — returned real user emails, membership tier,
-- and stripe_customer_id values to an anonymous caller.
--
-- The leaky policies came from earlier migrations or manual SQL editor
-- runs. They were ORed with proper own-row policies — and Postgres RLS
-- evaluates policies disjunctively, so any single permissive policy
-- means everyone sees everything.
--
-- This migration:
--   1. DROPs the leaky policies (USING true for anon / authenticated).
--   2. DROPs duplicate own-row policies (same intent, different names).
--   3. KEEPS the moderator-can-update-credits policy (intentional).
--   4. KEEPS exactly one own-or-moderator SELECT, one own INSERT, and
--      the column-restricted UPDATE from 2026_05_30_lockdown_profiles_rls.
--
-- After this, anon callers see zero rows from profiles via REST.
-- Authenticated users see only their own row plus (if moderator)
-- everyone else's row for credit-grant moderation flows.
--
-- Idempotent. Safe to re-run.

BEGIN;

/* ─── 1. Drop the four anon/all-authenticated leaks ─────────────────── */
-- These were the actual PII vectors.
DROP POLICY IF EXISTS profiles_public_read           ON public.profiles;
DROP POLICY IF EXISTS profiles_read                  ON public.profiles;
DROP POLICY IF EXISTS profiles_read_all              ON public.profiles;
DROP POLICY IF EXISTS profiles_read_all_authenticated ON public.profiles;

/* ─── 2. Drop redundant own-row SELECT duplicates ───────────────────── */
-- profiles_read_own_or_moderator covers both "own" and the moderator
-- use-case; the two "Users can …" variants and profiles_select_own are
-- duplicates of (or supersets of) that policy.
DROP POLICY IF EXISTS "Users can read own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own            ON public.profiles;

/* ─── 3. Consolidate the INSERT policies to one ─────────────────────── */
-- profiles_insert_own writes against the legacy user_id column; the
-- "Users can insert their own profile" matches the live `id` column.
-- Keep that one, drop the others.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own            ON public.profiles;

/* ─── 4. Drop the broad UPDATE that 2026_05_30_lockdown missed ──────── */
-- That migration dropped "Users can update own profile" (no 'their')
-- and profiles_update_own. "Users can update their own profile" was a
-- third name variant with no column restriction. The column-level
-- GRANT on `authenticated` was already preventing membership writes,
-- but this policy is conceptually redundant with profiles_update_own_columns
-- so we drop it for clarity.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

COMMIT;

/* ─── Smoke checks (run after migration) ──────────────────────────────

  -- 1. Remaining policies — expect a SHORT list:
  --    profiles_read_own_or_moderator     SELECT  authenticated
  --    Users can insert their own profile INSERT  public
  --    profiles_update_credits_moderator_only UPDATE authenticated
  --    profiles_update_own_columns        UPDATE  public
  SELECT policyname, cmd, roles::text
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'profiles'
   ORDER BY cmd, policyname;

  -- 2. End-to-end: as anon (apikey only, no Authorization header), this
  --    MUST return zero rows OR a permission error — NOT real profiles.
  --      curl 'https://<project>.supabase.co/rest/v1/profiles?select=id&limit=1' \
  --        -H 'apikey: <ANON_KEY>'

──────────────────────────────────────────────────────────────────────── */
