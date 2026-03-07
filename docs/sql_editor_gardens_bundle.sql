-- =============================================================================
-- public.gardens: create if missing, ensure columns, indexes, single Public Garden
-- Paste into Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- 1) Create table if missing
CREATE TABLE IF NOT EXISTS public.gardens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Ensure columns exist (idempotent for existing tables)
ALTER TABLE public.gardens ADD COLUMN IF NOT EXISTS user_id uuid NULL;
ALTER TABLE public.gardens ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE public.gardens ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_gardens_user_id
  ON public.gardens (user_id);

CREATE INDEX IF NOT EXISTS idx_gardens_created_at_desc
  ON public.gardens (created_at DESC);

-- 4) Only one public garden: at most one row where user_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_gardens_one_public
  ON public.gardens ((true))
  WHERE user_id IS NULL;

-- =============================================================================
-- VERIFICATION (run after the above)
-- =============================================================================

-- Count public gardens (expect 0 or 1)
SELECT count(*) AS public_garden_count
FROM public.gardens
WHERE user_id IS NULL;

-- Insert public garden (succeeds once)
INSERT INTO public.gardens (user_id, name)
VALUES (NULL, 'Public Garden')
RETURNING id, user_id, name, created_at;

-- Insert second public garden (should fail: duplicate key / unique constraint)
-- INSERT INTO public.gardens (user_id, name) VALUES (NULL, 'Second Public');
