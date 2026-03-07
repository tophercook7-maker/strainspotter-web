-- Ensure garden_sensor_readings exists + matches the console/ingest field contract.
-- Safe to run multiple times.

create table if not exists public.garden_sensor_readings (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid null,
  temp_f numeric null,
  rh numeric null,
  vpd numeric null,
  ph numeric null,
  nitrogen_ppm numeric null,
  phosphorus_ppm numeric null,
  potassium_ppm numeric null,
  source text null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.garden_sensor_readings
  add column if not exists user_id uuid null,
  add column if not exists temp_f numeric null,
  add column if not exists rh numeric null,
  add column if not exists vpd numeric null,
  add column if not exists ph numeric null,
  add column if not exists nitrogen_ppm numeric null,
  add column if not exists phosphorus_ppm numeric null,
  add column if not exists potassium_ppm numeric null,
  add column if not exists source text null,
  add column if not exists recorded_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_garden_sensor_readings_garden_recorded
  on public.garden_sensor_readings (garden_id, recorded_at desc);
