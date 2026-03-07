-- Align public.scans with app usage: /api/scans/[id], saveScanHistory, history pages.
-- Adds missing columns only; does not remove legacy columns (grow_id, model_output, etc.).
-- Idempotent: safe to run multiple times.

-- Add columns the app expects (ADD COLUMN IF NOT EXISTS)
alter table public.scans
  add column if not exists garden_id uuid null references public.gardens(id) on delete set null,
  add column if not exists status text null,
  add column if not exists result_payload jsonb null,
  add column if not exists processed_at timestamptz null;

-- Ensure created_at exists (legacy 013 has it; add if missing)
alter table public.scans
  add column if not exists created_at timestamptz null default now();

-- Helpful indexes for history list and status filtering
create index if not exists idx_scans_garden_created
  on public.scans (garden_id, created_at desc);

create index if not exists idx_scans_status
  on public.scans (status);
