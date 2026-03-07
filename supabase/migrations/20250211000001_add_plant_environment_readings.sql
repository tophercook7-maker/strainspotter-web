CREATE TABLE IF NOT EXISTS plant_environment_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  garden_id uuid NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  user_id uuid NULL,
  temp_f numeric NOT NULL,
  rh numeric NOT NULL,
  vpd numeric NULL,
  note text NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_env_readings_plant_occurred
  ON plant_environment_readings (plant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_env_readings_garden_occurred
  ON plant_environment_readings (garden_id, occurred_at DESC);
