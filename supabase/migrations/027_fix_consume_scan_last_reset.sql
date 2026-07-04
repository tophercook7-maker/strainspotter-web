-- 027_fix_consume_scan_last_reset.sql
--
-- SCAN-OUTAGE FIX (2026-07-04). consume_scan()'s monthly-reset branch does
--   UPDATE profiles SET id_scans_used = 0, quota_reset_at = …, last_reset = now()
-- but profiles.last_reset was never created (42703). The branch only fires
-- when a user's quota period rolls over — which is why scans worked for weeks
-- and then started 503ing ("Couldn't verify scan quota") at the July reset.
-- Same failure family as 026: prod DB objects referencing columns that no
-- migration ever created.
--
-- Fix: create the column the function expects.

alter table public.profiles
  add column if not exists last_reset timestamptz;
