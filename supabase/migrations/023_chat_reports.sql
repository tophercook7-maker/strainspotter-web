-- 023_chat_reports.sql
--
-- Member reports for community group chat: any member can flag a message;
-- reports land in the owner's admin console (Reports tab) with one-tap
-- hide/resolve. Duplicate reports of the same message by the same user are
-- prevented at the DB level.

create table if not exists public.chat_reports (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references public.chat_threads (id) on delete cascade,
  message_id   uuid not null references public.chat_messages (id) on delete cascade,
  reported_by  uuid references auth.users (id) on delete set null,
  reason       text check (reason is null or char_length(reason) <= 500),
  status       text not null default 'open' check (status in ('open','resolved')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  unique (message_id, reported_by)
);

create index if not exists chat_reports_status_idx
  on public.chat_reports (status, created_at desc);

alter table public.chat_reports enable row level security;
