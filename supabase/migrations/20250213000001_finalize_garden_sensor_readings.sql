-- Finalizer: guarantee public.garden_sensor_readings matches the console/ingest contract.
-- Idempotent. Safe for tables created by 20250211000004 or by 20260211000010 (adds missing columns).
-- Does not drop optional columns (metrics, occurred_at, plant_id) if present.

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

-- Backfill recorded_at from occurred_at when applicable (table from 20260211000010)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'garden_sensor_readings' and column_name = 'occurred_at'
  ) then
    update public.garden_sensor_readings
    set recorded_at = occurred_at
    where occurred_at is not null;
  end if;
end $$;

create index if not exists idx_garden_sensor_readings_garden_recorded
  on public.garden_sensor_readings (garden_id, recorded_at desc);
