-- Durable capture of confirmed-scan feedback — the labeled-data flywheel.
--
-- Today /api/scan/feedback appends to data/scan-feedback-local.jsonl, which is
-- EPHEMERAL on Vercel serverless (lost per-instance) — so the training signal
-- evaporates. This table persists every user correction so the scanner can
-- actually learn (recalibration, reference-image promotion, eval growth).
--
-- Apply: Supabase SQL editor, or `supabase db push` (needs the DB password).

create table if not exists public.scan_feedback (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  user_id              text,
  scan_id              text,
  correct_strain_slug  text,
  correct_strain_name  text,
  selected_match_slug  text,
  none_of_these        boolean default false,
  wrong_top_match_slug text,
  previous_rank        integer,
  previous_confidence  numeric,
  predicted_top_matches jsonb default '[]'::jsonb,
  visual_traits        jsonb default '{}'::jsonb,
  notes                text,
  model                text,
  provider             text
);

create index if not exists scan_feedback_strain_idx on public.scan_feedback (correct_strain_slug);
create index if not exists scan_feedback_scan_idx   on public.scan_feedback (scan_id);

-- Lock down: RLS on with NO policies → only the service role (server) reads/writes.
-- (Consistent with the repo's RLS-lockdown posture + the nightly anon-leak-check.)
alter table public.scan_feedback enable row level security;
