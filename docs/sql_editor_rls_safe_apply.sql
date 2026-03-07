-- =============================================================================
-- STRAINSPOTTER SAFE RLS APPLY (SKIPS MISSING TABLES)
-- Block 2/2: Applies RLS + minimal Public Garden policies only where the table exists.
-- Won't crash if plant_tasks (or others) don't exist yet.
-- Paste into Supabase Dashboard → SQL Editor → Run
-- =============================================================================

BEGIN;

-- Optional (safe)
CREATE SCHEMA IF NOT EXISTS internal;

-- =============================================================================
-- plants (adaptive: uses garden_id if present, else user_id IS NULL)
-- =============================================================================
DO $$
DECLARE
  has_plants boolean;
  has_garden_id boolean;
  has_user_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='plants'
  ) INTO has_plants;

  IF NOT has_plants THEN
    RAISE NOTICE 'SKIP: public.plants does not exist';
    RETURN;
  END IF;

  ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

  -- Drop legacy policies (ok if they don't exist)
  DROP POLICY IF EXISTS "Plants: select own" ON public.plants;
  DROP POLICY IF EXISTS "Plants: insert own" ON public.plants;
  DROP POLICY IF EXISTS "Plants: update own" ON public.plants;
  DROP POLICY IF EXISTS "Plants: delete own" ON public.plants;
  DROP POLICY IF EXISTS "plants_select_public" ON public.plants;
  DROP POLICY IF EXISTS "plants_insert_public" ON public.plants;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='plants' AND column_name='garden_id'
  ) INTO has_garden_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='plants' AND column_name='user_id'
  ) INTO has_user_id;

  IF has_garden_id THEN
    EXECUTE $p$
      CREATE POLICY "plants_select_public"
      ON public.plants FOR SELECT
      TO anon, authenticated
      USING (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL))
    $p$;

    EXECUTE $p$
      CREATE POLICY "plants_insert_public"
      ON public.plants FOR INSERT
      TO anon, authenticated
      WITH CHECK (garden_id IN (SELECT id FROM public.gardens WHERE user_id IS NULL))
    $p$;

    RAISE NOTICE 'OK: plants policies use garden_id -> Public Garden';

  ELSIF has_user_id THEN
    EXECUTE $p$
      CREATE POLICY "plants_select_public"
      ON public.plants FOR SELECT
      TO anon, authenticated
      USING (user_id IS NULL)
    $p$;

    EXECUTE $p$
      CREATE POLICY "plants_insert_public"
      ON public.plants FOR INSERT
      TO anon, authenticated
      WITH CHECK (user_id IS NULL)
    $p$;

    RAISE NOTICE 'OK: plants policies use user_id IS NULL (older schema)';

  ELSE
    RAISE EXCEPTION 'public.plants has neither garden_id nor user_id; cannot safely apply public policy';
  END IF;
END $$;

-- =============================================================================
-- Generic garden_id tables: SELECT/INSERT only for Public Garden
-- =============================================================================
DO $$
BEGIN
  -- plant_tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='plant_tasks') THEN
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
  ELSE
    RAISE NOTICE 'SKIP: public.plant_tasks does not exist';
  END IF;

  -- plant_environment_readings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='plant_environment_readings') THEN
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
  ELSE
    RAISE NOTICE 'SKIP: public.plant_environment_readings does not exist';
  END IF;

  -- plant_inputs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='plant_inputs') THEN
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
  ELSE
    RAISE NOTICE 'SKIP: public.plant_inputs does not exist';
  END IF;

  -- plant_harvests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='plant_harvests') THEN
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
  ELSE
    RAISE NOTICE 'SKIP: public.plant_harvests does not exist';
  END IF;

  -- plant_logs (if exists)
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
  ELSE
    RAISE NOTICE 'SKIP: public.plant_logs does not exist';
  END IF;

  -- garden_sensor_readings (console)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='garden_sensor_readings') THEN
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
  ELSE
    RAISE NOTICE 'SKIP: public.garden_sensor_readings does not exist';
  END IF;
END $$;

-- =============================================================================
-- Verification: show only policies that exist now
-- =============================================================================
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('plants','plant_tasks','plant_environment_readings','plant_inputs','plant_harvests','garden_sensor_readings','plant_logs')
ORDER BY tablename, policyname, cmd;

COMMIT;
