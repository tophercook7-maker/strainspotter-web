-- 018_scan_flywheel_tables.sql
--
-- The training-flywheel tables. Both API routes already write to these
-- (app/api/scan/feedback → scan_corrections, app/api/scanner/feedback →
-- scan_feedback) but the tables were never created, so every insert failed
-- silently inside a non-blocking try/catch and the flywheel captured nothing
-- durable. Columns match the insert payloads exactly.
--
-- Writes come exclusively through the service-role client (getSupabaseAdmin /
-- requireScannerSupabase), which bypasses RLS. RLS is enabled with NO public
-- policies so anon/authenticated clients can neither read nor write raw
-- training data directly.

-- ── scan_corrections — the strain-confirmation flywheel ─────────────────────
-- One row per user confirm/correct action on a scan result. This is the
-- labeled data that re-fits the nameInImage calibration stratum and (later)
-- trains the re-ranker.
create table if not exists public.scan_corrections (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete set null,
  scan_id               text,
  correct_strain_slug   text,
  correct_strain_name   text,
  selected_match_slug   text,
  none_of_these         boolean default false,
  wrong_top_match_slug  text,
  previous_rank         integer,
  previous_confidence   numeric,
  predicted_top_matches jsonb,
  visual_traits         jsonb,
  notes                 text,
  model                 text,
  provider              text,
  created_at            timestamptz not null default now()
);

create index if not exists scan_corrections_user_idx
  on public.scan_corrections (user_id);
create index if not exists scan_corrections_slug_idx
  on public.scan_corrections (correct_strain_slug);
create index if not exists scan_corrections_created_idx
  on public.scan_corrections (created_at desc);

alter table public.scan_corrections enable row level security;

-- ── scan_feedback — lightweight right/wrong signal (v2 scanner route) ───────
create table if not exists public.scan_feedback (
  id                  uuid primary key default gen_random_uuid(),
  scan_id             uuid,
  scan_history_id     uuid,
  matched_strain_slug text,
  selected_strain_slug text,
  was_correct         boolean not null,
  confidence          numeric,
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists scan_feedback_scan_idx
  on public.scan_feedback (scan_id);
create index if not exists scan_feedback_created_idx
  on public.scan_feedback (created_at desc);

alter table public.scan_feedback enable row level security;
