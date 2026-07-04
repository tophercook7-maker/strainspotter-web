-- 028_chat_messages_thread_columns.sql
--
-- CHAT-OUTAGE FIX (2026-07-04). Prod's chat_messages is the OLD group-based
-- shape (group_id/user_id/message_type…) — migration 015's thread-based
-- CREATE TABLE evidently failed midway (chat_threads + chat_participants from
-- 015 exist; its chat_messages never replaced the older table). Every
-- community/B2B message insert failed with 42703 "thread_id does not exist".
--
-- The table has ZERO rows and the only code referencing it is the thread-
-- based chat (community, B2B, reports, moderation) — so we ADD the thread
-- columns it expects rather than dropping anything. The legacy group_id
-- columns stay, unused and harmless.

alter table public.chat_messages
  add column if not exists thread_id uuid references public.chat_threads (id) on delete cascade,
  add column if not exists sender_id uuid references public.profiles (id) on delete set null,
  add column if not exists sender_type text not null default 'user',
  add column if not exists hidden boolean not null default false;

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at desc);

-- PostgREST caches the schema — without this, the API keeps failing with
-- "column does not exist" even after the columns land.
notify pgrst, 'reload schema';
