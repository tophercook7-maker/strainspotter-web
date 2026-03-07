-- Ensure public.gardens exists (required by console, plants, garden_sensor_readings).
-- Idempotent: safe to run multiple times.

create table if not exists public.gardens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gardens_user_id
  on public.gardens (user_id);

create index if not exists idx_gardens_created_at
  on public.gardens (created_at desc);

-- Only one public garden: at most one row where user_id is null.
-- Partial unique index on constant so all such rows "conflict" on the same value.
create unique index if not exists idx_gardens_one_public
  on public.gardens ((true))
  where user_id is null;
