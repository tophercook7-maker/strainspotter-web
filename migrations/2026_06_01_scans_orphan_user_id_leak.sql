-- 2026_06_01_scans_orphan_user_id_leak.sql
--
-- HIGH SECURITY FIX caught by the nightly anon-leak-check cron route
-- the moment it went live: the `scans` table had a policy granting
-- anyone read access to any row where user_id IS NULL.
--
--   POLICY "Scans: users can view own"
--   ON public.scans FOR SELECT TO public
--   USING ((auth.uid() = user_id) OR (user_id IS NULL))
--                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^
--                                  this leg admits every anon caller
--                                  to every guest-flow scan row
--
-- Confirmed 2026-06-01: anon GET /rest/v1/scans returned 363 rows of
-- old guest-flow scans (user_id = NULL, session_id = NULL because the
-- guest flow was retired). Image keys + analysis payloads exposed.
--
-- The proper guest-scan read path is the OTHER policy on this table:
--
--   POLICY "scans_anon_select" TO anon
--   USING ((user_id IS NULL) AND (session_id IS NOT NULL)
--           AND (session_id = current_setting('request.headers.x-session-id', true)))
--
-- That one requires the caller to know the session_id (set client-side
-- and sent via header), so it's safe — only the original guest can
-- read their own scans. Drop the broken policy and the proper one
-- handles the use-case.
--
-- Idempotent.

BEGIN;

DROP POLICY IF EXISTS "Scans: users can view own" ON public.scans;

COMMIT;

/* ─── Smoke check ───────────────────────────────────────────────────

  -- As anon:
  --   curl 'https://<project>.supabase.co/rest/v1/scans?select=count' \
  --     -H 'apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>' \
  --     -H 'Prefer: count=exact' -I | grep content-range
  -- Expected: content-range: * /0

──────────────────────────────────────────────────────────────────── */
