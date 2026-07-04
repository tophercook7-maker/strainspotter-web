-- Optional scan columns for richer persistence from saveUnifiedScanToServer.
-- Idempotent: safe to run multiple times.
--
-- Apply in Supabase: Dashboard → SQL → New query → paste → Run.
-- If your database already ran add_scan_confidence_fields.sql, overlapping
-- ALTERs are no-ops due to IF NOT EXISTS.

alter table public.scans add column if not exists confidence numeric;
alter table public.scans add column if not exists provider text;
alter table public.scans add column if not exists model text;
alter table public.scans add column if not exists detected_text text;
alter table public.scans add column if not exists visual_traits jsonb;
alter table public.scans add column if not exists top_matches jsonb;
alter table public.scans add column if not exists status text default 'pending';
alter table public.scans add column if not exists result jsonb;
alter table public.scans add column if not exists processed_at timestamptz;

comment on column public.scans.result is 'Full StoredScanResultV2 JSON (schemaVersion + unified + optional legacy)';
comment on column public.scans.top_matches is 'Snapshot of ranked matches (json array)';
comment on column public.scans.processed_at is 'Server timestamp when scan row was written';
