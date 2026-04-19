-- PPM MVP schema reconciliation (idempotent, non-breaking)
-- Profiles: ensure tier, preferences, created_at; RLS + policies
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Backfill defaults for existing nulls to allow NOT NULL enforcement
UPDATE public.profiles SET tier = 'free' WHERE tier IS NULL;
UPDATE public.profiles SET preferences = '{}'::jsonb WHERE preferences IS NULL;
UPDATE public.profiles SET created_at = now() WHERE created_at IS NULL;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: user can select own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND polname = 'profiles_select_own'
  ) THEN
    CREATE POLICY profiles_select_own ON public.profiles
      FOR SELECT
      USING (auth.uid() = id);
  END IF;
END$$;

-- Policy: user can update own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND polname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END$$;

-- grows table
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.grows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    name text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END$$;

ALTER TABLE IF EXISTS public.grows
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grows_user_id_fkey'
  ) THEN
    ALTER TABLE public.grows
      ADD CONSTRAINT grows_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END$$;

ALTER TABLE public.grows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'grows' AND polname = 'grows_owner_access'
  ) THEN
    CREATE POLICY grows_owner_access ON public.grows
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- scans table
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.scans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    name text,
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END$$;

ALTER TABLE IF EXISTS public.scans
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scans_user_id_fkey'
  ) THEN
    ALTER TABLE public.scans
      ADD CONSTRAINT scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END$$;

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scans' AND polname = 'scans_owner_access'
  ) THEN
    CREATE POLICY scans_owner_access ON public.scans
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- logs table
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    grow_id uuid,
    entry text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END$$;

ALTER TABLE IF EXISTS public.logs
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS grow_id uuid,
  ADD COLUMN IF NOT EXISTS entry text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'logs_user_id_fkey'
  ) THEN
    ALTER TABLE public.logs
      ADD CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END$$;

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'logs' AND polname = 'logs_owner_access'
  ) THEN
    CREATE POLICY logs_owner_access ON public.logs
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- measurements table
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.measurements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    grow_id uuid,
    log_id uuid,
    measurement jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END$$;

ALTER TABLE IF EXISTS public.measurements
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS grow_id uuid,
  ADD COLUMN IF NOT EXISTS log_id uuid,
  ADD COLUMN IF NOT EXISTS measurement jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'measurements_user_id_fkey'
  ) THEN
    ALTER TABLE public.measurements
      ADD CONSTRAINT measurements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END$$;

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'measurements' AND polname = 'measurements_owner_access'
  ) THEN
    CREATE POLICY measurements_owner_access ON public.measurements
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;
