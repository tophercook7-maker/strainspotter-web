-- 020_moderators_feedback.sql
--
-- (1) Moderator program: business signups can volunteer to help moderate the
--     community groups ("keep our atmosphere clean and healthy"). The owner
--     approves volunteers from the admin console, which promotes them to
--     role='moderator' on the seeded system group threads and grants a small
--     one-time scan bonus (profiles.id_scan_topups_remaining).
-- (2) Two-way feedback: users submit ideas/suggestions/bugs; the owner replies
--     from the admin console and the user sees the reply on their feedback page.

-- ── Moderator volunteer flags on business profiles ──────────────────────────
alter table public.business_profiles
  add column if not exists moderator_volunteer boolean not null default false,
  add column if not exists moderator_active boolean not null default false,
  add column if not exists moderator_approved_at timestamptz;

create index if not exists business_profiles_mod_volunteer_idx
  on public.business_profiles (moderator_volunteer)
  where moderator_volunteer = true and moderator_active = false;

-- ── Two-way feedback ─────────────────────────────────────────────────────────
-- A legacy `feedback` table already exists in prod (id, created_at, user_id,
-- content, page) with zero rows and no code references — extend it in place.
-- `content` stays the message body. Service-role only (RLS enabled, no public
-- policies) — reads/writes flow through /api/feedback (user) and
-- /api/admin/feedback (owner) with explicit ownership checks in code.
alter table public.feedback
  add column if not exists category text not null default 'idea',
  add column if not exists status text not null default 'new',
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'feedback_category_check' and conrelid = 'public.feedback'::regclass
  ) then
    alter table public.feedback
      add constraint feedback_category_check
      check (category in ('idea','suggestion','bug','praise','other'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'feedback_status_check' and conrelid = 'public.feedback'::regclass
  ) then
    alter table public.feedback
      add constraint feedback_status_check
      check (status in ('new','replied','closed'));
  end if;
end $$;

create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);
create index if not exists feedback_status_idx on public.feedback (status, created_at desc);

alter table public.feedback enable row level security;
