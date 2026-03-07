-- =============================================================================
-- STRAINSPOTTER DB DIAGNOSTIC: what tables exist / are missing?
-- Paste into Supabase Dashboard → SQL Editor → Run (block 1/2)
-- =============================================================================

-- 1) Quick table presence check (core garden + plants stack + console)
WITH expected AS (
  SELECT unnest(ARRAY[
    'gardens',
    'garden_sensor_readings',
    'plants',
    'plant_logs',
    'plant_tasks',
    'plant_environment_readings',
    'plant_inputs',
    'plant_harvests'
  ]) AS table_name
),
present AS (
  SELECT tablename AS table_name
  FROM pg_tables
  WHERE schemaname = 'public'
)
SELECT
  e.table_name,
  CASE WHEN p.table_name IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM expected e
LEFT JOIN present p USING (table_name)
ORDER BY status DESC, table_name;

-- 2) Show actual existing tables that start with plant_/garden_
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'plant_%' OR tablename LIKE 'garden_%' OR tablename IN ('plants', 'gardens'))
ORDER BY tablename;

-- 3) Show plants columns so we know which schema you have (garden_id vs user_id)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'plants'
ORDER BY ordinal_position;
