-- 026_fix_is_moderator_recursion.sql
--
-- PRODUCTION-DOWN FIX (2026-07-04). Someone/something added a profiles SELECT
-- policy ("profiles_read_own_or_moderator") that calls is_moderator(), and
-- is_moderator() itself SELECTs FROM profiles — with the function running as
-- SECURITY INVOKER, that select re-evaluates the same policy, which calls the
-- function again… → Postgres 54001 "stack depth limit exceeded" on EVERY
-- profiles read through PostgREST. Since requireSubscription() reads
-- profiles.membership on every gated API call, this 500'd scans, B2B,
-- community — the whole paid app.
--
-- Fix: SECURITY DEFINER (+ pinned search_path). The function's internal read
-- of profiles then runs as the owner and BYPASSES RLS, breaking the cycle.
-- Behavior is unchanged: it still just answers "is the caller a moderator".

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  -- Priority: JWT claim, then profiles column
  SELECT COALESCE(
    (auth.jwt() ->> 'user_role') IN ('moderator','admin'),
    false
  ) OR COALESCE(
    (SELECT is_moderator FROM profiles WHERE id = auth.uid()),
    false
  );
$function$;
