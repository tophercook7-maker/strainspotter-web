-- 019_b2b_connection_thread.sql
--
-- Link an accepted B2B connection to its chat thread. When a connection
-- request is accepted, the API creates a 'direct' chat_threads row + both
-- chat_participants and stores the thread id here, so "Open chat" on an
-- accepted connection is a single lookup.

alter table public.connection_requests
  add column if not exists thread_id uuid references public.chat_threads (id) on delete set null;

create index if not exists connection_requests_thread_idx
  on public.connection_requests (thread_id);
