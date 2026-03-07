-- Garden Messaging schema: groups + 1:1 threads with AI/cost guardrails

-- Enums (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'chat_thread_type') then
    create type chat_thread_type as enum ('group', 'direct');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'chat_participant_role') then
    create type chat_participant_role as enum ('member', 'moderator', 'system');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'chat_sender_type') then
    create type chat_sender_type as enum ('user', 'ai', 'system');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'chat_ai_request_type') then
    create type chat_ai_request_type as enum ('group_summary', 'clarification');
  end if;
end $$;

-- Threads
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  type chat_thread_type not null,
  name text,
  system_group boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  is_pro_only boolean not null default false,
  check ( (type = 'group' and name is not null) or (type = 'direct' and name is null) )
);

-- Participants
create table if not exists public.chat_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role chat_participant_role not null default 'member',
  joined_at timestamptz not null default now()
);
create index if not exists chat_participants_thread_idx on public.chat_participants(thread_id);
create index if not exists chat_participants_user_idx on public.chat_participants(user_id);
create unique index if not exists chat_participants_thread_user_uniq on public.chat_participants(thread_id, user_id);

-- Messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_type chat_sender_type not null default 'user',
  content text not null,
  created_at timestamptz not null default now(),
  ai_invoked boolean not null default false,
  hidden boolean not null default false
);
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'chat_messages' and column_name = 'thread_id') then
    create index if not exists chat_messages_thread_created_idx on public.chat_messages(thread_id, created_at desc);
  end if;
end $$;

-- AI requests (for cost/safety tracking)
create table if not exists public.chat_ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  request_type chat_ai_request_type not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_ai_requests_user_idx on public.chat_ai_requests(user_id, created_at desc);
create index if not exists chat_ai_requests_thread_idx on public.chat_ai_requests(thread_id);

-- Seed system groups (idempotent)
insert into public.chat_threads (id, type, name, system_group, created_by)
values
  ('00000000-0000-0000-0000-000000000101', 'group', 'New Growers', true, null),
  ('00000000-0000-0000-0000-000000000102', 'group', 'Plant Health & Care', true, null),
  ('00000000-0000-0000-0000-000000000103', 'group', 'Strains & Genetics', true, null),
  ('00000000-0000-0000-0000-000000000104', 'group', 'Labs & Testing', true, null),
  ('00000000-0000-0000-0000-000000000105', 'group', 'Dispensaries & Products', true, null)
on conflict (id) do update set name = excluded.name;

-- RLS
alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_ai_requests enable row level security;

-- Policies: threads readable by participants (idempotent)
drop policy if exists "chat_threads_select_participant" on public.chat_threads;
create policy "chat_threads_select_participant" on public.chat_threads
  for select using (
    exists (select 1 from public.chat_participants cp where cp.thread_id = chat_threads.id and cp.user_id = auth.uid())
  );

-- Participants
drop policy if exists "chat_participants_select_self_threads" on public.chat_participants;
create policy "chat_participants_select_self_threads" on public.chat_participants
  for select using (user_id = auth.uid());

-- Messages: select only if participant (skip if chat_messages lacks thread_id)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'chat_messages' and column_name = 'thread_id') then
    drop policy if exists "chat_messages_select_participant" on public.chat_messages;
    create policy "chat_messages_select_participant" on public.chat_messages
      for select using (
        exists (select 1 from public.chat_participants cp where cp.thread_id = chat_messages.thread_id and cp.user_id = auth.uid())
      );
    drop policy if exists "chat_messages_insert_user" on public.chat_messages;
    create policy "chat_messages_insert_user" on public.chat_messages
      for insert with check (
        sender_type = 'user' and sender_id = auth.uid() and
        exists (select 1 from public.chat_participants cp where cp.thread_id = chat_messages.thread_id and cp.user_id = auth.uid())
      );
    drop policy if exists "chat_messages_insert_ai_system" on public.chat_messages;
    create policy "chat_messages_insert_ai_system" on public.chat_messages
      for insert using (false) with check (
        sender_type in ('ai','system') and (select current_setting('request.jwt.claim.role', true)) = 'service_role'
      );
  end if;
end $$;

-- AI request logging: user must be participant; service role allowed
drop policy if exists "chat_ai_requests_insert" on public.chat_ai_requests;
create policy "chat_ai_requests_insert" on public.chat_ai_requests
  for insert with check (
    (auth.uid() is not null and user_id = auth.uid() and exists (select 1 from public.chat_participants cp where cp.thread_id = chat_ai_requests.thread_id and cp.user_id = auth.uid()))
    or (select current_setting('request.jwt.claim.role', true)) = 'service_role'
  );
drop policy if exists "chat_ai_requests_select_self" on public.chat_ai_requests;
create policy "chat_ai_requests_select_self" on public.chat_ai_requests
  for select using (user_id = auth.uid());

-- Direct chats: require exactly 2 participants (soft guard via constraint trigger placeholder)
-- NOTE: Not enforced in this migration; enforce at application layer for now.

-- TODO: Verified professional accounts; pro-only threads; file uploads; expert office hours; message pinning.
