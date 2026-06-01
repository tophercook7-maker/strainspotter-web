-- 2026_05_31_meta_migrations_tracking.sql
--
-- Adopt minimal migrations tracking.
--
-- Until now, migrations in this repo were hand-applied via the Supabase
-- SQL editor with no record of which env had which one. After tonight's
-- audit found multiple migrations partially applied (e.g. scans_remaining
-- column never created because its CREATE TABLE IF NOT EXISTS short-
-- circuited), we need a way to know what's actually in the DB.
--
-- We don't use the Supabase CLI's `supabase_migrations.schema_migrations`
-- table because the local supabase/migrations/ folder is out of sync with
-- remote (different naming convention, parallel hand-rolled migrations/
-- directory used for actual ops), and switching to the CLI tracking would
-- require rewriting 38 migration files.
--
-- Instead: a simple public._meta_migrations table that records the
-- filename and timestamp. The apply-migrations workflow checks this
-- before running. Backfills are listed at the bottom of this file.
--
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS public._meta_migrations (
  filename    text        PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now(),
  applied_by  text        NOT NULL DEFAULT current_user,
  notes       text
);

ALTER TABLE public._meta_migrations ENABLE ROW LEVEL SECURITY;
-- No policies. Service role only. (RLS denies anon/authenticated by default.)

COMMENT ON TABLE public._meta_migrations IS
  'Records which hand-applied SQL migrations from the repo migrations/ ' ||
  'directory have run against this environment. Inserted by the ' ||
  'apply-migrations workflow.';

/* ─── Backfill: migrations applied 2026-05-30/31 in this audit ──────── */
INSERT INTO public._meta_migrations (filename, notes) VALUES
  ('2026_05_25_apple_iap_columns.sql',
     'profiles.apple_* columns'),
  ('2026_05_25_pricing_expansion.sql',
     'profiles.founder_purchase_at + training_consent*'),
  ('2026_smart_scanner_feedback_compat.sql',
     'scan_feedback compat shim'),
  ('2026_05_30_persistent_rate_limit_and_quota.sql',
     'scan_rate_limits + scan_idempotency tables + check_rate_limit / consume_scan / refund_scan RPCs'),
  ('2026_05_30_lockdown_profiles_rls.sql',
     'profiles UPDATE column-level GRANT lockdown'),
  ('2026_05_31_iap_transaction_uniqueness.sql',
     'profiles.apple_original_transaction_id UNIQUE constraint'),
  ('2026_05_31_add_scans_remaining.sql',
     'HOTFIX: scans_remaining column was missing'),
  ('2026_05_31_profiles_rls_cleanup.sql',
     'Dropped 10 redundant/leaky profiles policies (PII leak fix)'),
  ('2026_05_31_repo_wide_rls_lockdown.sql',
     'Dropped 12 leaky policies on users/user_profiles/grower_profiles/journals/etc.'),
  ('2026_05_31_meta_migrations_tracking.sql',
     'This file — bootstraps tracking')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

/* ─── Going-forward workflow ──────────────────────────────────────────

  Before applying a new migration:
    SELECT 1 FROM public._meta_migrations WHERE filename = '<file>';
  If a row exists → migration already applied; skip.

  After applying:
    INSERT INTO public._meta_migrations (filename, notes) VALUES
      ('<file>', '<one-line summary>');

  The apply-migrations script can do this automatically in a future PR.

──────────────────────────────────────────────────────────────────────── */
