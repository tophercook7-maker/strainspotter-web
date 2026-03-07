-- Console tables: allow service role/server to read/write.
-- If you use RLS, keep it enabled but add policies.

alter table public.gardens enable row level security;
alter table public.garden_sensor_readings enable row level security;

-- Public Garden is user_id is null. Allow read of that garden and its readings.
drop policy if exists "read_public_garden" on public.gardens;
create policy "read_public_garden"
on public.gardens for select
using (user_id is null);

drop policy if exists "read_public_garden_readings" on public.garden_sensor_readings;
create policy "read_public_garden_readings"
on public.garden_sensor_readings for select
using (
  garden_id in (select id from public.gardens where user_id is null)
);

-- Allow inserts into readings (for ingest). Keep it scoped to Public Garden.
drop policy if exists "insert_public_garden_readings" on public.garden_sensor_readings;
create policy "insert_public_garden_readings"
on public.garden_sensor_readings for insert
with check (
  garden_id in (select id from public.gardens where user_id is null)
);
