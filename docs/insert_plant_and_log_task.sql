-- Seed a test plant in the Public Garden, plus one log and one task (if tables exist).
-- Run in Supabase SQL Editor.
begin;

do $$
declare
  pg_id uuid;
  p_id uuid;
begin
  -- Public Garden
  select id into pg_id
  from public.gardens
  where user_id is null
  limit 1;

  if pg_id is null then
    raise exception 'No Public Garden found. Create it first.';
  end if;

  -- Plant (status is REQUIRED and must satisfy plants_status_check)
  insert into public.plants (garden_id, user_id, name, status, is_archived)
  values (pg_id, null, 'SQL Test Plant', 'active', false)
  returning id into p_id;

  -- Plant log (only if table exists)
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='plant_logs'
  ) then
    insert into public.plant_logs (plant_id, garden_id, user_id, kind, note)
    values (p_id, pg_id, null, 'note', 'First log from SQL seed.');
  end if;

  -- Plant task (only if table exists)
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='plant_tasks'
  ) then
    insert into public.plant_tasks (plant_id, garden_id, user_id, kind, title, due_at)
    values (p_id, pg_id, null, 'watering', 'Water plant', now() + interval '1 day');
  end if;

end $$;

commit;

-- Verify plant exists
select id, name, status, garden_id, created_at
from public.plants
order by created_at desc
limit 5;
