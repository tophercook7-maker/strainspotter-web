-- 024_user_collections_sync.sql
--
-- Cloud sync for the garden's localStorage data (plants, grow groups, grow
-- log, saved scans, journal, favorites, grow-coach grows, scan chain).
--
-- Design: one JSONB document per (user, collection) — the client sync engine
-- (lib/sync/cloudSync.ts) union-merges on login and pushes last-write-wins on
-- change. Document-per-collection keeps the sync generic: features keep their
-- existing localStorage shapes untouched.
--
-- Unlike the service-role-only tables, this one is CLIENT-DIRECT: the browser
-- supabase client reads/writes it under RLS, so policies are the enforcement.

create table if not exists public.user_collections (
  user_id    uuid not null references auth.users (id) on delete cascade,
  collection text not null check (char_length(collection) between 1 and 64),
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection)
);

alter table public.user_collections enable row level security;

drop policy if exists "user_collections_select_own" on public.user_collections;
create policy "user_collections_select_own" on public.user_collections
  for select using (user_id = auth.uid());

drop policy if exists "user_collections_insert_own" on public.user_collections;
create policy "user_collections_insert_own" on public.user_collections
  for insert with check (user_id = auth.uid());

drop policy if exists "user_collections_update_own" on public.user_collections;
create policy "user_collections_update_own" on public.user_collections
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_collections_delete_own" on public.user_collections;
create policy "user_collections_delete_own" on public.user_collections
  for delete using (user_id = auth.uid());
