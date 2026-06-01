-- 2026_05_31_repo_wide_rls_lockdown.sql
--
-- CRITICAL PII LEAK FIX (continuation): extended the audit beyond
-- profiles to every public table. Found the same overlapping-permissive
-- policy pattern on at least 11 other tables — including some that hold
-- emails (users), licence numbers (grower_profiles), personal journal
-- content (journals), and user feedback (feedback_*).
--
-- Each "leaky" policy below uses USING (true) for anon and/or
-- authenticated. Postgres RLS is disjunctive: ANY single permissive
-- policy admits everyone, so these defeat the proper own-row
-- policies that already exist on the same table.
--
-- This migration only DROPs the leaky policies. It keeps the working
-- own-row / member-only / moderator-only policies in place. Verified
-- via anon REST probes that dropping each policy does not break the
-- corresponding own-row read path.
--
-- Tables touched and the leak vector:
--
--   users                  — `Users are viewable by everyone` (public, true)
--                          — `dev_all_users` (authenticated, true; dev leftover)
--   user_profiles          — `Public profiles are viewable by everyone` (true)
--                          — `user_profiles_read_all` (anon+auth, true)
--   grower_profiles        — `grower_profiles_select_public` (anon+auth, true)
--                            ⚠ leaks license_state / license_number
--   journals               — `dev_all_journals` (authenticated, ALL, true)
--                            ⚠ EVERY signed-in user can read+write+delete
--                              EVERY OTHER user's journal
--   events                 — `dev_all_events` (authenticated, ALL, true)
--   feedback_threads       — `ft_select_public` + `ft_insert_public`
--   feedback_messages      — `fm_select_public` + `fm_insert_public`
--   documents              — `documents_anon_select` (anon, true)
--   items                  — `items_anon_select` (anon, true)
--   organizations          — `organizations_anon_select` (anon, true)
--
-- Tables NOT touched here (intentional public catalogs):
--   strains, effects, flavors, terpenes, strain_*, dispensary_profiles
--
-- Tables NOT touched here (need product-context to fix safely; followup):
--   comments, comment_reactions, strain_reactions  — community visibility
--   messages_legacy_20251025, item_messages         — group chat patterns
--   chat_user_presence                               — presence sharing
--   dispensaries, dispensary_strains                 — admin-named policies
--                                                      using USING true
--
-- Idempotent. Safe to re-run.

BEGIN;

/* ─── users (has `email` column) ──────────────────────────────────────── */
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS dev_all_users                    ON public.users;

/* ─── user_profiles (has full_name, bio, admin flag) ──────────────────── */
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_read_all                     ON public.user_profiles;

/* ─── grower_profiles (license info) ──────────────────────────────────── */
DROP POLICY IF EXISTS grower_profiles_select_public ON public.grower_profiles;

/* ─── journals (personal grow journals) ───────────────────────────────── */
-- ALL command, USING(true), to authenticated = full leak + tamper vector.
DROP POLICY IF EXISTS dev_all_journals ON public.journals;

/* ─── events ──────────────────────────────────────────────────────────── */
DROP POLICY IF EXISTS dev_all_events ON public.events;

/* ─── feedback_threads / feedback_messages (user feedback) ────────────── */
-- These let anon callers BOTH read everyone's feedback AND post new
-- threads/messages as any user — drop both directions of the leak.
DROP POLICY IF EXISTS ft_select_public ON public.feedback_threads;
DROP POLICY IF EXISTS ft_insert_public ON public.feedback_threads;
DROP POLICY IF EXISTS fm_select_public ON public.feedback_messages;
DROP POLICY IF EXISTS fm_insert_public ON public.feedback_messages;

/* ─── documents / items / organizations (org-scoped content) ──────────── */
-- All three have proper member_read / org member policies underneath.
-- The *_anon_select policies are the leak — drop them.
DROP POLICY IF EXISTS documents_anon_select     ON public.documents;
DROP POLICY IF EXISTS items_anon_select         ON public.items;
DROP POLICY IF EXISTS organizations_anon_select ON public.organizations;

COMMIT;

/* ─── Smoke checks (run after migration) ──────────────────────────────

  -- Should return ZERO USING(true) policies on any of these tables:
  SELECT tablename, policyname, cmd, roles::text
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('users','user_profiles','grower_profiles',
                       'journals','events','feedback_threads',
                       'feedback_messages','documents','items',
                       'organizations')
     AND qual = 'true'
   ORDER BY tablename, cmd;

  -- Anon REST probe — must return 0 rows for each:
  --   curl 'https://.../rest/v1/users?select=email&limit=1' -H 'apikey:<anon>'
  --   curl 'https://.../rest/v1/user_profiles?select=*&limit=1' -H 'apikey:<anon>'
  --   curl 'https://.../rest/v1/grower_profiles?select=license_number&limit=1' -H 'apikey:<anon>'

──────────────────────────────────────────────────────────────────────── */
