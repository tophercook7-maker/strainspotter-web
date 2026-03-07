-- =============================================================================
-- RLS FIX: Plants policy that adapts to schema (garden_id vs no garden_id)
-- Also applies Public Garden read/insert policies to the other garden_id tables.
-- Paste into Supabase Dashboard → SQL Editor → Run
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Ensure internal schema exists (optional; safe)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS internal;

-- -----------------------------------------------------------------------------
-- 1) public.plants (ADAPTIVE)
--    If plants.garden_id exists: use Public Garden constraint
--    Else: fall back to "public plants" = user_id IS NULL
-- -----------------------------------------------------------------------------
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Drop the old policies you showed
DROP POLICY IF EXISTS "Plants: select own" ON public.plants;
DROP POLICY IF EXISTS "Plants: insert own" ON public.plants;
DROP POLICY IF EXISTS "Plants: update own" ON public.plants;
DROP POLICY IF EXISTS "Plants: delete own" ON public.plants;

-- Drop any earlier attempts
DROP POLICY IF EXISTS "plants_select_public" ON public.plants;
DROP POLICY IF EXISTS "plants_insert_public" ON public.plants;

DO $$
DECLARE
  has_garden_id boolean := false;
  has_user_id boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='plants' AND column_name='garden_id'
  ) INTO has_garden_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='plants' AND column_name='user_id'
  ) INTO has_user_id;

  IF has_garden_id THEN
    EXECUTE $p$
      CREATE POLICY "plants_select_public"
      ON public.plants
      FOR SELECT
      TO anon, authenticated
      USING (
        garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL)
      )
    $p$;

    EXECUTE $p$
      CREATE POLICY "plants_insert_public"
      ON public.plants
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL)
      )
    $p$;

  ELSIF has_user_id THEN
    -- Older schema: public plants are unowned
    EXECUTE $p$
      CREATE POLICY "plants_select_public"
      ON public.plants
      FOR SELECT
      TO anon, authenticated
      USING (user_id IS NULL)
    $p$;

    EXECUTE $p$
      CREATE POLICY "plants_insert_public"
      ON public.plants
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (user_id IS NULL)
    $p$;

  ELSE
    RAISE EXCEPTION 'public.plants has neither garden_id nor user_id; cannot define public policy safely';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Helper macro for garden_id tables: enable RLS + select/insert for Public Garden
-- -----------------------------------------------------------------------------
-- plant_tasks
ALTER TABLE public.plant_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_public_plant_tasks" ON public.plant_tasks;
DROP POLICY IF EXISTS "insert_public_plant_tasks" ON public.plant_tasks;

CREATE POLICY "select_public_plant_tasks"
  ON public.plant_tasks FOR SELECT
  TO anon, authenticated
  USING (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

CREATE POLICY "insert_public_plant_tasks"
  ON public.plant_tasks FOR INSERT
  TO anon, authenticated
  WITH CHECK (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

-- plant_environment_readings
ALTER TABLE public.plant_environment_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_public_plant_env_readings" ON public.plant_environment_readings;
DROP POLICY IF EXISTS "insert_public_plant_env_readings" ON public.plant_environment_readings;

CREATE POLICY "select_public_plant_env_readings"
  ON public.plant_environment_readings FOR SELECT
  TO anon, authenticated
  USING (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

CREATE POLICY "insert_public_plant_env_readings"
  ON public.plant_environment_readings FOR INSERT
  TO anon, authenticated
  WITH CHECK (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

-- plant_inputs
ALTER TABLE public.plant_inputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_public_plant_inputs" ON public.plant_inputs;
DROP POLICY IF EXISTS "insert_public_plant_inputs" ON public.plant_inputs;

CREATE POLICY "select_public_plant_inputs"
  ON public.plant_inputs FOR SELECT
  TO anon, authenticated
  USING (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

CREATE POLICY "insert_public_plant_inputs"
  ON public.plant_inputs FOR INSERT
  TO anon, authenticated
  WITH CHECK (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

-- plant_harvests
ALTER TABLE public.plant_harvests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_public_plant_harvests" ON public.plant_harvests;
DROP POLICY IF EXISTS "insert_public_plant_harvests" ON public.plant_harvests;

CREATE POLICY "select_public_plant_harvests"
  ON public.plant_harvests FOR SELECT
  TO anon, authenticated
  USING (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

CREATE POLICY "insert_public_plant_harvests"
  ON public.plant_harvests FOR INSERT
  TO anon, authenticated
  WITH CHECK (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

-- garden_sensor_readings
ALTER TABLE public.garden_sensor_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_public_garden_readings" ON public.garden_sensor_readings;
DROP POLICY IF EXISTS "insert_public_garden_readings" ON public.garden_sensor_readings;

CREATE POLICY "read_public_garden_readings"
  ON public.garden_sensor_readings FOR SELECT
  TO anon, authenticated
  USING (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

CREATE POLICY "insert_public_garden_readings"
  ON public.garden_sensor_readings FOR INSERT
  TO anon, authenticated
  WITH CHECK (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

-- plant_logs only if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='plant_logs') THEN
    ALTER TABLE public.plant_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "select_public_plant_logs" ON public.plant_logs;
    DROP POLICY IF EXISTS "insert_public_plant_logs" ON public.plant_logs;

    CREATE POLICY "select_public_plant_logs"
      ON public.plant_logs FOR SELECT
      TO anon, authenticated
      USING (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));

    CREATE POLICY "insert_public_plant_logs"
      ON public.plant_logs FOR INSERT
      TO anon, authenticated
      WITH CHECK (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Verification
-- -----------------------------------------------------------------------------

-- Show plants columns so we know which branch we used
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='plants'
  AND column_name IN ('garden_id', 'user_id')
ORDER BY column_name;

-- Policies on plants (should now be only select+insert public)
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname='public' AND tablename='plants'
ORDER BY policyname, cmd;

COMMIT;
