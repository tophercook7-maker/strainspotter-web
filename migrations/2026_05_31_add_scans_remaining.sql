-- 2026_05_31_add_scans_remaining.sql
--
-- HOTFIX: the 2025_01_20_scan_quota_backend.sql migration declared
-- `scans_remaining` in CREATE TABLE IF NOT EXISTS profiles(...), which
-- means it was only created if the profiles table didn't already exist.
-- It existed, so this column never landed in production — but the
-- consume_scan() / refund_scan() RPCs added in 2026_05_30 read and write
-- it, so the scan endpoint 500s on every call.
--
-- This adds the column with default 0 so existing users start with no
-- topup credits (Stripe + IAP webhooks increment from there on purchase).
--
-- Idempotent. Already applied to prod via Management API on 2026-05-31;
-- this file documents the change for repeatable environments.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scans_remaining integer NOT NULL DEFAULT 0;

COMMIT;

/* ─── Smoke check ────────────────────────────────────────────────────

  SELECT column_name, data_type, column_default
    FROM information_schema.columns
   WHERE table_name = 'profiles'
     AND column_name = 'scans_remaining';
  -- Expected: 1 row, integer, default 0.

──────────────────────────────────────────────────────────────────── */
