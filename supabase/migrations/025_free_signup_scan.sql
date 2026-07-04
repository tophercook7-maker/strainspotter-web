-- 025_free_signup_scan.sql
--
-- One free strain scan per ACCOUNT (the signup hook). Server-enforced via an
-- atomic claim in /api/scan (update ... where free_scan_used = false), so it
-- can't be farmed by clearing localStorage — a new free scan requires a new
-- account. Existing free-tier accounts get one too (default false), which is
-- exactly the re-engagement nudge we want.

alter table public.profiles
  add column if not exists free_scan_used boolean not null default false;
