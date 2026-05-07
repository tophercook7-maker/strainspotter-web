-- 2026_05_08_v2_ecosystem_repair.sql
--
-- Recovery migration. The previous v2 migration partial-applied because
-- of a failure mid-run, leaving some tables in inconsistent state.
-- This migration is fully idempotent and safe to run multiple times.
--
-- Run this INSTEAD OF retrying 2026_05_07_v2_ecosystem_foundations.sql.

-- ─── profiles.user_role column ─────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_role text DEFAULT 'consumer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_user_role_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_role_check
      CHECK (user_role IN ('consumer','grower','dispensary_owner','dispensary_staff','admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(user_role);

-- ─── grower_profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grower_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  bio             text,
  region          text,
  license_state   text,
  license_number  text,
  verified        boolean NOT NULL DEFAULT false,
  cover_image_url text,
  avatar_url      text,
  speciality_tags text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grower_profiles_region   ON grower_profiles(region);
CREATE INDEX IF NOT EXISTS idx_grower_profiles_verified ON grower_profiles(verified);
ALTER TABLE grower_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grower_profiles_select_public"    ON grower_profiles;
DROP POLICY IF EXISTS "grower_profiles_update_own"       ON grower_profiles;
DROP POLICY IF EXISTS "grower_profiles_insert_own"       ON grower_profiles;

CREATE POLICY "grower_profiles_select_public"
  ON grower_profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "grower_profiles_update_own"
  ON grower_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "grower_profiles_insert_own"
  ON grower_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── dispensary_profiles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispensary_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claimed_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name             text NOT NULL,
  address          text,
  city             text,
  state_code       text,
  zip              text,
  country_code     text DEFAULT 'US',
  lat              double precision,
  lng              double precision,
  phone            text,
  website          text,
  hours_text       text,
  bio              text,
  license_number   text,
  verified         boolean NOT NULL DEFAULT false,
  cover_image_url  text,
  avatar_url       text,
  service_type     text DEFAULT 'unknown',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dispensary_profiles_service_type_check'
  ) THEN
    ALTER TABLE dispensary_profiles ADD CONSTRAINT dispensary_profiles_service_type_check
      CHECK (service_type IN ('recreational','medical','both','unknown'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dispensary_profiles_state    ON dispensary_profiles(state_code);
CREATE INDEX IF NOT EXISTS idx_dispensary_profiles_verified ON dispensary_profiles(verified);
CREATE INDEX IF NOT EXISTS idx_dispensary_profiles_claimed  ON dispensary_profiles(claimed_by);
ALTER TABLE dispensary_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispensary_profiles_select_public"     ON dispensary_profiles;
DROP POLICY IF EXISTS "dispensary_profiles_update_claimed"    ON dispensary_profiles;

CREATE POLICY "dispensary_profiles_select_public"
  ON dispensary_profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "dispensary_profiles_update_claimed"
  ON dispensary_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = claimed_by) WITH CHECK (auth.uid() = claimed_by);

-- ─── follows  (DROP + RECREATE if shape is wrong) ──────────────────
-- This is the table that errored on you. Drop any partial version, recreate clean.
DROP TABLE IF EXISTS follows CASCADE;

CREATE TABLE follows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_grower_id      uuid REFERENCES grower_profiles(id) ON DELETE CASCADE,
  target_dispensary_id  uuid REFERENCES dispensary_profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follows_exactly_one_target CHECK (
    (target_grower_id IS NOT NULL AND target_dispensary_id IS NULL)
    OR
    (target_grower_id IS NULL AND target_dispensary_id IS NOT NULL)
  ),
  CONSTRAINT follows_unique_per_follower UNIQUE (follower_id, target_grower_id, target_dispensary_id)
);

CREATE INDEX idx_follows_follower      ON follows(follower_id);
CREATE INDEX idx_follows_target_grower ON follows(target_grower_id);
CREATE INDEX idx_follows_target_disp   ON follows(target_dispensary_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select_own" ON follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id);
CREATE POLICY "follows_insert_own" ON follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- ─── threads ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,
  title       text,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'threads_kind_check'
  ) THEN
    ALTER TABLE threads ADD CONSTRAINT threads_kind_check
      CHECK (kind IN ('direct','group','broadcast'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_threads_created_by ON threads(created_by);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- ─── thread_members ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS thread_members (
  thread_id    uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role  text NOT NULL DEFAULT 'member',
  joined_at    timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  PRIMARY KEY (thread_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'thread_members_role_check'
  ) THEN
    ALTER TABLE thread_members ADD CONSTRAINT thread_members_role_check
      CHECK (member_role IN ('admin','member'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_thread_members_user ON thread_members(user_id);
ALTER TABLE thread_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "threads_select_member"        ON threads;
DROP POLICY IF EXISTS "thread_members_select_member" ON thread_members;

CREATE POLICY "threads_select_member" ON threads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM thread_members
    WHERE thread_members.thread_id = threads.id
    AND thread_members.user_id = auth.uid()
  ));

CREATE POLICY "thread_members_select_member" ON thread_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM thread_members tm2
    WHERE tm2.thread_id = thread_members.thread_id
    AND tm2.user_id = auth.uid()
  ));

-- ─── thread_messages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS thread_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body            text NOT NULL,
  attachment_urls text[] DEFAULT '{}',
  hidden          boolean NOT NULL DEFAULT false,
  hidden_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created
  ON thread_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_messages_sender ON thread_messages(sender_id);
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thread_messages_select_member" ON thread_messages;
DROP POLICY IF EXISTS "thread_messages_insert_member" ON thread_messages;

CREATE POLICY "thread_messages_select_member" ON thread_messages FOR SELECT TO authenticated
  USING (NOT hidden AND EXISTS (
    SELECT 1 FROM thread_members
    WHERE thread_members.thread_id = thread_messages.thread_id
    AND thread_members.user_id = auth.uid()
  ));

CREATE POLICY "thread_messages_insert_member" ON thread_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM thread_members
    WHERE thread_members.thread_id = thread_messages.thread_id
    AND thread_members.user_id = auth.uid()
  ));

-- ─── reports ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_kind   text NOT NULL,
  target_id     uuid NOT NULL,
  reason        text NOT NULL,
  notes         text,
  status        text NOT NULL DEFAULT 'open',
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_target_kind_check') THEN
    ALTER TABLE reports ADD CONSTRAINT reports_target_kind_check
      CHECK (target_kind IN ('user','message','profile'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_status_check') THEN
    ALTER TABLE reports ADD CONSTRAINT reports_status_check
      CHECK (status IN ('open','reviewing','resolved','dismissed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
DROP POLICY IF EXISTS "reports_select_own" ON reports;

CREATE POLICY "reports_insert_own" ON reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_own" ON reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- ─── strain_submissions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strain_submissions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_name        text NOT NULL,
  normalized_name      text NOT NULL,
  evidence_image_url   text NOT NULL,
  ocr_text             text,
  ocr_matched          boolean NOT NULL DEFAULT false,
  source_dispensary_id uuid REFERENCES dispensary_profiles(id) ON DELETE SET NULL,
  source_seed_vendor   text,
  proposed_type        text,
  proposed_lineage     text,
  proposed_notes       text,
  trust_weight         numeric(3,2) NOT NULL DEFAULT 1.0,
  status               text NOT NULL DEFAULT 'pending',
  approved_strain_id   text,
  approved_at          timestamptz,
  rejected_reason      text,
  rejected_at          timestamptz,
  report_count         integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'strain_submissions_proposed_type_check') THEN
    ALTER TABLE strain_submissions ADD CONSTRAINT strain_submissions_proposed_type_check
      CHECK (proposed_type IN ('Sativa','Indica','Hybrid','unknown'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'strain_submissions_status_check') THEN
    ALTER TABLE strain_submissions ADD CONSTRAINT strain_submissions_status_check
      CHECK (status IN ('pending','reviewing','approved','rejected','flagged'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_strain_subs_status     ON strain_submissions(status);
CREATE INDEX IF NOT EXISTS idx_strain_subs_normalized ON strain_submissions(normalized_name);
CREATE INDEX IF NOT EXISTS idx_strain_subs_submitter  ON strain_submissions(submitter_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_strain_subs_unique_per_submitter
  ON strain_submissions(submitter_id, normalized_name);

ALTER TABLE strain_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strain_subs_select_own" ON strain_submissions;
DROP POLICY IF EXISTS "strain_subs_insert_own" ON strain_submissions;

CREATE POLICY "strain_subs_select_own" ON strain_submissions FOR SELECT TO authenticated
  USING (auth.uid() = submitter_id);
CREATE POLICY "strain_subs_insert_own" ON strain_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitter_id);

-- ─── shared updated_at trigger function + triggers ─────────────────
CREATE OR REPLACE FUNCTION set_updated_at_now()
RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grower_profiles_updated_at      ON grower_profiles;
DROP TRIGGER IF EXISTS trg_dispensary_profiles_updated_at  ON dispensary_profiles;
DROP TRIGGER IF EXISTS trg_threads_updated_at              ON threads;
DROP TRIGGER IF EXISTS trg_strain_submissions_updated_at   ON strain_submissions;

CREATE TRIGGER trg_grower_profiles_updated_at
  BEFORE UPDATE ON grower_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();
CREATE TRIGGER trg_dispensary_profiles_updated_at
  BEFORE UPDATE ON dispensary_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();
CREATE TRIGGER trg_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();
CREATE TRIGGER trg_strain_submissions_updated_at
  BEFORE UPDATE ON strain_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();
