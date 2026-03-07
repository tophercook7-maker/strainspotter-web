-- Insert a garden sensor reading (NO user_id column in your DB)
-- Run in Supabase SQL Editor to seed/test Live Environment tiles.
do $$
declare
  pg_id uuid;
begin
  select id into pg_id
  from public.gardens
  where user_id is null
  limit 1;

  if pg_id is null then
    raise exception 'No Public Garden found.';
  end if;

  insert into public.garden_sensor_readings (
    garden_id,
    temp_f, rh, vpd, ph,
    nitrogen_ppm, phosphorus_ppm, potassium_ppm,
    source,
    recorded_at
  ) values (
    pg_id,
    74.2, 58, 1.2, 6.2,
    820, null, null,
    'manual',
    now()
  );
end $$;

-- Verify last reading
select *
from public.garden_sensor_readings
order by recorded_at desc
limit 1;
