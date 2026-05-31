-- StrainSpotter Smart Scanner feedback compatibility migration
-- Source: StrainSpotter-Mobile/docs/migrations/2026_smart_scanner_feedback_compat.sql
-- Safe for projects that may use either public.scans or public.scan_history.

create extension if not exists "uuid-ossp";
create extension if not exists vector;

create table if not exists public.strain_reference_images (
  id uuid primary key default uuid_generate_v4(),
  strain_slug text not null,
  image_url text not null,
  source text default 'user' check (source in ('user','admin','web','import')),
  submitted_by uuid null,
  approved boolean not null default false,
  feature_signature jsonb not null default '{}'::jsonb,
  embedding vector null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists strain_reference_images_slug_idx
  on public.strain_reference_images(strain_slug);

create index if not exists strain_reference_images_approved_idx
  on public.strain_reference_images(approved);

create table if not exists public.scan_feedback (
  id uuid primary key default uuid_generate_v4(),
  scan_id uuid null,
  scan_history_id uuid null,
  user_id uuid null,
  matched_strain_slug text null,
  selected_strain_slug text null,
  was_correct boolean not null,
  confidence numeric null,
  notes text null,
  feedback_type text null,
  feedback_context text null,
  created_at timestamptz not null default now()
);

alter table public.scan_feedback
  add column if not exists scan_id uuid null,
  add column if not exists scan_history_id uuid null,
  add column if not exists user_id uuid null,
  add column if not exists matched_strain_slug text null,
  add column if not exists selected_strain_slug text null,
  add column if not exists was_correct boolean,
  add column if not exists confidence numeric null,
  add column if not exists notes text null,
  add column if not exists feedback_type text null,
  add column if not exists feedback_context text null,
  add column if not exists created_at timestamptz not null default now();

alter table public.scan_feedback
  alter column scan_id drop not null,
  alter column was_correct set default false,
  alter column feedback_type set default 'unsure';

create index if not exists scan_feedback_scan_id_idx
  on public.scan_feedback(scan_id);

create index if not exists scan_feedback_scan_history_id_idx
  on public.scan_feedback(scan_history_id);

create index if not exists scan_feedback_matched_strain_idx
  on public.scan_feedback(matched_strain_slug);

create index if not exists scan_feedback_selected_strain_idx
  on public.scan_feedback(selected_strain_slug);

-- RLS is enabled, but writes should go through the service-role backend routes.
alter table public.strain_reference_images enable row level security;
alter table public.scan_feedback enable row level security;
