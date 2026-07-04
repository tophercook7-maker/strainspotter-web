alter table public.scans add column if not exists confidence numeric;
alter table public.scans add column if not exists provider text;
alter table public.scans add column if not exists model text;
alter table public.scans add column if not exists detected_text text;
alter table public.scans add column if not exists visual_traits jsonb;
alter table public.scans add column if not exists top_matches jsonb;
