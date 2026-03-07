
-- =====================================================
-- PPM MVP – Chunk A: profiles reconciliation
-- Safe, idempotent, non-destructive
-- =====================================================

-- Ensure required columns exist on profiles
alter table profiles
  add column if not exists tier text not null default 'free';

alter table profiles
  add column if not exists preferences jsonb default '{}'::jsonb;

alter table profiles
  add column if not exists created_at timestamptz default now();

-- Ensure RLS is enabled
alter table profiles enable row level security;

-- Policies (create only if missing)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can read own profile'
  ) then
    create policy "Users can read own profile"
      on profiles for select
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on profiles for update
      using (auth.uid() = id);
  end if;
end $$;

-- =====================================================
-- PPM MVP – Chunk E: measurements
-- Safe, idempotent, non-destructive
-- =====================================================

-- Create measurements table if it does not exist
create table if not exists measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  grow_id uuid references grows(id) on delete cascade,
  type text not null, -- ph | ec | temp | humidity | nitrogen | etc.
  value numeric not null,
  unit text,
  created_at timestamptz default now()
);

-- Ensure RLS is enabled
alter table measurements enable row level security;

-- Policy: users manage their own measurements
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'measurements'
      and policyname = 'Users manage their measurements'
  ) then
    create policy "Users manage their measurements"
      on measurements
      for all
      using (auth.uid() = user_id);
  end if;
end $$;

-- =====================================================
-- PPM MVP – Chunk D: logs
-- Safe, idempotent, non-destructive
-- =====================================================

-- Create logs table if it does not exist
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  grow_id uuid references grows(id) on delete cascade,
  type text not null, -- note | feed | issue | observation
  content text,
  tags jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Ensure RLS is enabled
alter table logs enable row level security;

-- Policy: users manage their own logs
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'logs'
      and policyname = 'Users manage their logs'
  ) then
    create policy "Users manage their logs"
      on logs
      for all
      using (auth.uid() = user_id);
  end if;
end $$;

-- =====================================================
-- PPM MVP – Chunk C: scans
-- Safe, idempotent, non-destructive
-- =====================================================

-- Create scans table if it does not exist
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  grow_id uuid references grows(id) on delete set null,
  image_url text not null,
  embedding_ref text,
  model_output jsonb,
  created_at timestamptz default now()
);

-- Ensure RLS is enabled
alter table scans enable row level security;

-- Policy: users manage their own scans
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'scans'
      and policyname = 'Users manage their scans'
  ) then
    create policy "Users manage their scans"
      on scans
      for all
      using (auth.uid() = user_id);
  end if;
end $$;

-- =====================================================
-- PPM MVP – Chunk B: grows
-- Safe, idempotent, non-destructive
-- =====================================================

-- Create grows table if it does not exist
create table if not exists grows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text,
  medium text,
  environment text,
  started_at date default now(),
  ended_at date,
  created_at timestamptz default now()
);

-- Ensure RLS is enabled
alter table grows enable row level security;

-- Policy: users manage their own grows
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'grows'
      and policyname = 'Users manage their grows'
  ) then
    create policy "Users manage their grows"
      on grows
      for all
      using (auth.uid() = user_id);
  end if;
end $$;


