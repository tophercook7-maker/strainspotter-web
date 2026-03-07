-- =============================================================================
-- public.garden_sensor_readings: exact contract for console + ingest
-- Paste into Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- 1) Create table if missing
CREATE TABLE IF NOT EXISTS public.garden_sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  user_id uuid NULL,
  temp_f numeric NULL,
  rh numeric NULL,
  vpd numeric NULL,
  ph numeric NULL,
  nitrogen_ppm numeric NULL,
  phosphorus_ppm numeric NULL,
  potassium_ppm numeric NULL,
  source text NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Add missing columns (idempotent; garden_id nullable here so existing rows don't fail)
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS garden_id uuid NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS user_id uuid NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS temp_f numeric NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS rh numeric NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS vpd numeric NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS ph numeric NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS nitrogen_ppm numeric NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS phosphorus_ppm numeric NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS potassium_ppm numeric NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS source text NULL;
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.garden_sensor_readings ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 3) Index
CREATE INDEX IF NOT EXISTS idx_garden_sensor_readings_garden_recorded
  ON public.garden_sensor_readings (garden_id, recorded_at DESC);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT count(*) AS row_count FROM public.garden_sensor_readings;

SELECT * FROM public.garden_sensor_readings
ORDER BY recorded_at DESC
LIMIT 1;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'garden_sensor_readings'
ORDER BY ordinal_position;
