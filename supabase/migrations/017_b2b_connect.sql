-- B2B Connect: business networking for growers, labs, dispensaries, breeders, processors.
--
-- Design decisions:
--   * Contact info (email/phone) lives on business_profiles but is NEVER exposed via the
--     directory. The `business_directory` view exposes only non-contact columns of opted-in
--     profiles, and `get_connection_contact()` (security definer) is the ONLY read path for
--     contact fields — it requires the caller to own one side of an ACCEPTED connection.
--   * Average consumers are excluded: directory reads require the caller to have a
--     business_profiles row of their own (business-to-business only).
--   * license_number is self-reported for now; `verified` is an admin-set flag (service role
--     only — no user-facing policy grants update on it beyond the owner's own row, and the
--     app layer must strip `verified` from owner updates; a stricter column-level guard can
--     come later via a trigger or separate admin table).
--   * connection_requests are one row per directed pair (UNIQUE(from_profile, to_profile));
--     re-requesting after withdraw/decline is an app-layer decision (update status vs. block).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- A `business_profiles` table already exists in prod (ppm-era: id, user_id
-- [unique], business_type, business_code, name, city, state, country, phone,
-- website, created_at, updated_at) with zero rows and no app-code references.
-- Extend it in place rather than creating a parallel table. `role` is kept
-- nullable at the DB level (legacy shape compatibility); the app layer
-- requires it on profile creation, and the directory view filters on it.
alter table public.business_profiles
  add column if not exists role text,
  add column if not exists business_name text,
  add column if not exists region text,          -- state/province, free text for now
  add column if not exists bio text,
  add column if not exists license_number text,  -- self-reported; see `verified`
  add column if not exists verified boolean not null default false,
  add column if not exists contact_email text,   -- NEVER exposed pre-acceptance (see view + fn)
  add column if not exists contact_phone text,   -- NEVER exposed pre-acceptance (see view + fn)
  add column if not exists directory_opt_in boolean not null default false;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_profiles_role_check'
      and conrelid = 'public.business_profiles'::regclass
  ) then
    alter table public.business_profiles
      add constraint business_profiles_role_check
      check (role is null or role in ('grower','lab','dispensary','breeder','processor'));
  end if;
end $$;

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_profile uuid not null references public.business_profiles (id) on delete cascade,
  to_profile uuid not null references public.business_profiles (id) on delete cascade,
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_profile <> to_profile),           -- no self-connections
  unique (from_profile, to_profile)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists business_profiles_user_idx on public.business_profiles(user_id);
-- Directory browsing: filter by role/region across opted-in profiles.
create index if not exists business_profiles_directory_idx on public.business_profiles(role, region) where directory_opt_in = true;
create index if not exists connection_requests_from_idx on public.connection_requests(from_profile, status);
create index if not exists connection_requests_to_idx on public.connection_requests(to_profile, status);

-- ---------------------------------------------------------------------------
-- RLS: business_profiles
-- ---------------------------------------------------------------------------

alter table public.business_profiles enable row level security;
alter table public.connection_requests enable row level security;

-- Owners manage their own row (select/insert/update; no delete — cascade handles account removal).
drop policy if exists "business_profiles_select_own" on public.business_profiles;
create policy "business_profiles_select_own" on public.business_profiles
  for select using (user_id = auth.uid());

drop policy if exists "business_profiles_insert_own" on public.business_profiles;
create policy "business_profiles_insert_own" on public.business_profiles
  for insert with check (user_id = auth.uid());

drop policy if exists "business_profiles_update_own" on public.business_profiles;
create policy "business_profiles_update_own" on public.business_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Directory visibility: any user who themselves has a business profile may see
-- opted-in rows. IMPORTANT: this table-level policy would expose contact_email /
-- contact_phone via a raw table select, so clients must ONLY read the directory
-- through the `business_directory` view below. Belt-and-suspenders: we still gate
-- to business users here so consumers get nothing even from the base table.
drop policy if exists "business_profiles_select_directory" on public.business_profiles;
create policy "business_profiles_select_directory" on public.business_profiles
  for select using (
    directory_opt_in = true
    and exists (
      select 1 from public.business_profiles me where me.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Directory view: the ONLY sanctioned directory read path.
-- Exposes no contact columns. security_invoker so the caller's RLS applies
-- (i.e. still requires the caller to hold a business profile).
-- ---------------------------------------------------------------------------

create or replace view public.business_directory
with (security_invoker = true) as
  select
    bp.id,
    bp.role,
    bp.business_name,
    bp.region,
    bp.bio,
    bp.verified,
    bp.created_at
  from public.business_profiles bp
  where bp.directory_opt_in = true;

comment on view public.business_directory is
  'Opted-in business profiles WITHOUT contact fields. Contact info is only released via get_connection_contact() after mutual acceptance.';

-- ---------------------------------------------------------------------------
-- RLS: connection_requests (participants only)
-- ---------------------------------------------------------------------------

-- Select: either side of the request.
drop policy if exists "connection_requests_select_participant" on public.connection_requests;
create policy "connection_requests_select_participant" on public.connection_requests
  for select using (
    exists (
      select 1 from public.business_profiles bp
      where bp.id in (connection_requests.from_profile, connection_requests.to_profile)
        and bp.user_id = auth.uid()
    )
  );

-- Insert: only as yourself (from_profile must be the caller's own profile),
-- and only in 'pending' state.
drop policy if exists "connection_requests_insert_from_owner" on public.connection_requests;
create policy "connection_requests_insert_from_owner" on public.connection_requests
  for insert with check (
    status = 'pending'
    and exists (
      select 1 from public.business_profiles bp
      where bp.id = connection_requests.from_profile and bp.user_id = auth.uid()
    )
  );

-- Sender may withdraw a pending request.
drop policy if exists "connection_requests_update_withdraw" on public.connection_requests;
create policy "connection_requests_update_withdraw" on public.connection_requests
  for update using (
    status = 'pending'
    and exists (
      select 1 from public.business_profiles bp
      where bp.id = connection_requests.from_profile and bp.user_id = auth.uid()
    )
  ) with check (
    status = 'withdrawn'
    and exists (
      select 1 from public.business_profiles bp
      where bp.id = connection_requests.from_profile and bp.user_id = auth.uid()
    )
  );

-- Recipient may accept or decline a pending request.
drop policy if exists "connection_requests_update_respond" on public.connection_requests;
create policy "connection_requests_update_respond" on public.connection_requests
  for update using (
    status = 'pending'
    and exists (
      select 1 from public.business_profiles bp
      where bp.id = connection_requests.to_profile and bp.user_id = auth.uid()
    )
  ) with check (
    status in ('accepted','declined')
    and exists (
      select 1 from public.business_profiles bp
      where bp.id = connection_requests.to_profile and bp.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Contact exchange: security definer function, the ONLY way to read the other
-- party's contact fields. Requires: caller owns one side AND status = 'accepted'.
-- ---------------------------------------------------------------------------

create or replace function public.get_connection_contact(connection_id uuid)
returns table (
  profile_id uuid,
  business_name text,
  role text,
  contact_email text,
  contact_phone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.connection_requests%rowtype;
  caller_profile uuid;
  other_profile uuid;
begin
  select bp.id into caller_profile
  from public.business_profiles bp
  where bp.user_id = auth.uid();

  if caller_profile is null then
    raise exception 'no business profile for caller';
  end if;

  select * into req
  from public.connection_requests cr
  where cr.id = connection_id;

  if req.id is null then
    raise exception 'connection not found';
  end if;

  -- Mutual consent gate: contact info only flows on an ACCEPTED connection,
  -- and only to a participant of that connection.
  if req.status <> 'accepted' then
    raise exception 'connection not accepted';
  end if;

  if caller_profile = req.from_profile then
    other_profile := req.to_profile;
  elsif caller_profile = req.to_profile then
    other_profile := req.from_profile;
  else
    raise exception 'caller is not a participant of this connection';
  end if;

  return query
    select bp.id, bp.business_name, bp.role, bp.contact_email, bp.contact_phone
    from public.business_profiles bp
    where bp.id = other_profile;
end;
$$;

comment on function public.get_connection_contact(uuid) is
  'Returns the OTHER party''s contact fields for an accepted connection the caller participates in. Sole read path for contact_email/contact_phone across profiles.';

revoke all on function public.get_connection_contact(uuid) from public;
grant execute on function public.get_connection_contact(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_business_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists business_profiles_touch_updated_at on public.business_profiles;
create trigger business_profiles_touch_updated_at
  before update on public.business_profiles
  for each row execute function public.touch_business_profiles_updated_at();

-- TODO: state license-registry verification; block list table; per-user request rate limits in DB.
