-- Run this ONCE in Supabase Dashboard → SQL Editor (against your REMOTE DB)
-- to remove migration version rows that cause "duplicate key" when using
-- supabase db push --include-all. Then run: supabase db push --include-all --yes

-- 1) Optional: see how versions are stored
-- SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;

-- 2) Delete all versions that the CLI tries to re-apply (stored as '006', '007', etc.)
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN (
  '006', '007', '008', '009', '010', '011', '012',
  '014', '015', '016', '017', '018',
  '20250131000000_add_plants_cover_image_url',
  '20250131000000_plant_harvests',
  '20250211000001_add_plant_environment_readings',
  '20250211000002_add_plant_tasks',
  '20250211000003_add_plant_inputs',
  '20250211000004_garden_sensor_readings_columns',
  '20250211000005_console_rls',
  '20250211000005_internal_schema_lockdown',
  '20250211000006_internal_views_auth_users',
  '20250213000000_create_gardens',
  '20250213000001_finalize_garden_sensor_readings',
  '20250213000002_align_scans_table',
  '20250217000001_add_feedback_threads_messages'
);
