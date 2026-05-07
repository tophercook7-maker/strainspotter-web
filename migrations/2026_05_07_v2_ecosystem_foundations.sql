-- 2026_05_07_v2_ecosystem_foundations.sql
--
-- Foundation schema for v2.0 marketplace/community features.
-- The v1.0 app does NOT read or write any of these tables. They exist so
-- v2.0 has a real foundation when development begins.
--
-- Conceptual model:
--
--   - Every account has a user_role (consumer | grower | dispensary).
--     A user can later promote from consumer to grower via a self-serve
--     verification flow (claim a profile, prove identity).
--
--   - growers and dispensaries are claimed PROFILES — separate rows
--     from the user account, with their own metadata (location, license,
--     description, photos). One user can claim one profile.
--
--   - threads are messaging conversations. Each has a kind:
--       'direct'     — 1:1 between two users
--       'group'      — small named multi-user channel
--       'broadcast'  — read-only updates from a verified grower or dispensary
--                      to anyone who follows them.
--
--   - thread_members records who belongs to a thread and their role
--     (admin, member). thread_messages stores the actual messages.
--
--   - follows is the lighter-weight subscribe relation (consumer follows
--     a grower; grower follows another grower).
--
-- All tables enable RLS. Policies are deliberately permissive in this
-- migration (auth.uid() must equal the relevant user_id column) so the
-- shape is in place; v2.0 development can tighten them.

-- ─── Roles on the existing profiles table ────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_role text
    CHECK (user_role IN ('consumer', 'grower', 'dispensary_owner', 'dispensary_staff', 'admin'))
    DEFAULT 'consumer';

CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(user_role);

-- ─── Grower profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grower_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  bio             text,
  region          text,                       -- e.g. "Humboldt County, CA"
  license_state   text,                       -- e.g. "CA"
  license_number  text,                       -- self-reported; for now display only
  verified        boolean NOT NULL DEFAULT false,
  cover_image_url text,
  avatar_url      text,
  speciality_tags text[] DEFAULT '{}',         -- e.g. {'indoor','sungrown','autoflower'}
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grower_profiles_region   ON grower_profiles(region);
CREATE INDEX IF NOT EXISTS idx_grower_profiles_verified ON grower_profiles(verified);

ALTER TABLE grower_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read a grower profile
CREATE POLICY "grower_profiles_select_public"
  ON grower_profiles FOR SELECT TO authenticated, anon USING (true);

-- Owners can update their own profile
CREATE POLICY "grower_profiles_update_own"
  ON grower_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Owners can insert their own profile
CREATE POLICY "grower_profiles_insert_own"
  ON grower_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── Dispensary profiles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispensary_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- nullable user_id — a dispensary listing can exist before being claimed.
  -- When a dispensary owner verifies, this gets set.
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
  -- 'recreational' | 'medical' | 'both' | 'unknown'
  service_type     text CHECK (service_type IN ('recreational','medical','both','unknown'))
                        DEFAULT 'unknown',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispensary_profiles_state    ON dispensary_profiles(state_code);
CREATE INDEX IF NOT EXISTS idx_dispensary_profiles_verified ON dispensary_profiles(verified);
CREATE INDEX IF NOT EXISTS idx_dispensary_profiles_claimed  ON dispensary_profiles(claimed_by);

ALTER TABLE dispensary_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read a dispensary profile
CREATE POLICY "dispensary_profiles_select_public"
  ON dispensary_profiles FOR SELECT TO authenticated, anon USING (true);

-- The claiming user can update their own dispensary
CREATE POLICY "dispensary_profiles_update_claimed"
  ON dispensary_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = claimed_by) WITH CHECK (auth.uid() = claimed_by);

-- ─── Follows ────────────────────────────────────────────────────────
-- Lightweight subscribe edge. Used for: consumer→grower notifications,
-- grower→grower social feed, etc.
CREATE TABLE IF NOT EXISTS follows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- A user can follow either a grower_profile or a dispensary_profile.
  -- We model it as nullable target columns rather than a polymorphic FK.
  target_grower_id      uuid REFERENCES grower_profiles(id) ON DELETE CASCADE,
  target_dispensary_id  uuid REFERENCES dispensary_profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Exactly one target must be set
  CHECK (
    (target_grower_id IS NOT NULL AND target_dispensary_id IS NULL)
    OR
    (target_grower_id IS NULL AND target_dispensary_id IS NOT NULL)
  ),
  UNIQUE (follower_id, target_grower_id, target_dispensary_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower      ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_target_grower ON follows(target_grower_id);
CREATE INDEX IF NOT EXISTS idx_follows_target_disp   ON follows(target_dispensary_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- A follower can read their own follow rows
CREATE POLICY "follows_select_own"
  ON follows FOR SELECT TO authenticated USING (auth.uid() = follower_id);

-- A follower can insert / delete their own follow rows
CREATE POLICY "follows_insert_own"
  ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own"
  ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ─── Threads ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('direct', 'group', 'broadcast')),
  title       text,                              -- groups have a title; direct don't
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_created_by ON threads(created_by);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- ─── Thread members ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS thread_members (
  thread_id  uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'member'
    CHECK (member_role IN ('admin', 'member')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  -- Last time this member read the thread (for unread counts).
  last_read_at timestamptz,
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_members_user ON thread_members(user_id);

ALTER TABLE thread_members ENABLE ROW LEVEL SECURITY;

-- A user can see the threads they belong to
CREATE POLICY "threads_select_member"
  ON threads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM thread_members
      WHERE thread_members.thread_id = threads.id
      AND thread_members.user_id = auth.uid()
    )
  );

-- A user can see member rows for threads they belong to
CREATE POLICY "thread_members_select_member"
  ON thread_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM thread_members tm2
      WHERE tm2.thread_id = thread_members.thread_id
      AND tm2.user_id = auth.uid()
    )
  );

-- ─── Thread messages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS thread_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  attachment_urls text[] DEFAULT '{}',
  -- For moderation / abuse handling.
  hidden      boolean NOT NULL DEFAULT false,
  hidden_reason text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created
  ON thread_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_messages_sender ON thread_messages(sender_id);

ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

-- Members of a thread can read its messages
CREATE POLICY "thread_messages_select_member"
  ON thread_messages FOR SELECT TO authenticated
  USING (
    NOT hidden AND EXISTS (
      SELECT 1 FROM thread_members
      WHERE thread_members.thread_id = thread_messages.thread_id
      AND thread_members.user_id = auth.uid()
    )
  );

-- Members can post to threads they belong to
CREATE POLICY "thread_messages_insert_member"
  ON thread_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM thread_members
      WHERE thread_members.thread_id = thread_messages.thread_id
      AND thread_members.user_id = auth.uid()
    )
  );

-- ─── Reports (abuse / moderation queue) ──────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_kind   text NOT NULL CHECK (target_kind IN ('user', 'message', 'profile')),
  target_id     uuid NOT NULL,
  reason        text NOT NULL,
  notes         text,
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- A user can file a report and read their own reports
CREATE POLICY "reports_insert_own"
  ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_own"
  ON reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- ─── Updated_at triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at_now()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grower_profiles_updated_at ON grower_profiles;
CREATE TRIGGER trg_grower_profiles_updated_at
  BEFORE UPDATE ON grower_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();

DROP TRIGGER IF EXISTS trg_dispensary_profiles_updated_at ON dispensary_profiles;
CREATE TRIGGER trg_dispensary_profiles_updated_at
  BEFORE UPDATE ON dispensary_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();

DROP TRIGGER IF EXISTS trg_threads_updated_at ON threads;
CREATE TRIGGER trg_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();

-- ─── Strain submissions (crowdsourced catalog growth) ──────────────
-- Lets paid subscribers propose a new strain entry by submitting a
-- photo of a dispensary jar / seed packet / label with the bud in the
-- same frame. The submission lives in 'pending' status until at least
-- 3 INDEPENDENT subscribers (different submitters) submit matching
-- evidence for the same name; then it moves to 'reviewing' for
-- human approval. Live strains feed into lib/data/strains.json (or a
-- live table once the static JSON is migrated).
--
-- This table is the trust layer. The actual canonical strain record
-- (name, lineage, type) lives in 'strains' and only an admin can
-- write to it. Submissions are evidence; admins promote them.

CREATE TABLE IF NOT EXISTS strain_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The strain name as the submitter (or the label OCR) believes it to be.
  proposed_name   text NOT NULL,
  -- A normalized form for matching: lowercase, punctuation stripped,
  -- so "Wedding Cake", "wedding-cake", "WEDDING CAKE!" all match.
  normalized_name text NOT NULL,

  -- Required: photo URL showing the label AND the bud in the same shot.
  -- The bucket policy on the storage bucket should refuse uploads
  -- without explicit user_id matching auth.uid().
  evidence_image_url text NOT NULL,

  -- The OCR text we extracted from the photo. Must include the
  -- proposed_name (or a near-match) for the submission to be valid.
  ocr_text        text,
  ocr_matched     boolean NOT NULL DEFAULT false,

  -- Optional source attribution.
  source_dispensary_id uuid REFERENCES dispensary_profiles(id) ON DELETE SET NULL,
  source_seed_vendor   text,    -- free text for now (no seed_vendors table yet)

  -- Submitter-provided metadata (suggestion only — admins decide what
  -- ends up in the canonical record).
  proposed_type   text CHECK (proposed_type IN ('Sativa','Indica','Hybrid','unknown')),
  proposed_lineage text,
  proposed_notes  text,

  -- Trust-weight score. 1.0 = anonymous paid subscriber.
  --                    1.5 = claimed grower profile.
  --                    2.0 = claimed dispensary owner.
  --                    Calculated at insert time by the API, NOT trusted from the client.
  trust_weight    numeric(3,2) NOT NULL DEFAULT 1.0,

  -- Status workflow:
  --   'pending'    — accepted into queue
  --   'reviewing'  — threshold met (>= 3.0 trust weight from distinct submitters
  --                  for the same normalized_name) — admin attention needed
  --   'approved'   — admin promoted to canonical strains
  --   'rejected'   — admin rejected
  --   'flagged'    — community reports auto-flagged this; admin attention needed
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','reviewing','approved','rejected','flagged')),

  -- Foreign key to canonical strain id, set when admin promotes.
  approved_strain_id text,
  approved_at     timestamptz,
  rejected_reason text,
  rejected_at     timestamptz,

  -- Counts for the submitter; updated by triggers from reports table.
  report_count    integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strain_subs_status         ON strain_submissions(status);
CREATE INDEX IF NOT EXISTS idx_strain_subs_normalized     ON strain_submissions(normalized_name);
CREATE INDEX IF NOT EXISTS idx_strain_subs_submitter      ON strain_submissions(submitter_id);
-- A submitter cannot submit the same name twice (prevents one user
-- counting toward their own threshold multiple times).
CREATE UNIQUE INDEX IF NOT EXISTS idx_strain_subs_unique_per_submitter
  ON strain_submissions(submitter_id, normalized_name);

ALTER TABLE strain_submissions ENABLE ROW LEVEL SECURITY;

-- Submitters can read their own submissions
CREATE POLICY "strain_subs_select_own"
  ON strain_submissions FOR SELECT TO authenticated
  USING (auth.uid() = submitter_id);

-- Submitters can create their own submissions (server-side API does the
-- subscription gate, OCR matching, trust_weight calculation, etc).
CREATE POLICY "strain_subs_insert_own"
  ON strain_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitter_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_strain_submissions_updated_at ON strain_submissions;
CREATE TRIGGER trg_strain_submissions_updated_at
  BEFORE UPDATE ON strain_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();
