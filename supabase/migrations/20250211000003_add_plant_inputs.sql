CREATE TABLE IF NOT EXISTS plant_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  garden_id uuid NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  user_id uuid NULL,
  kind text NOT NULL DEFAULT 'other',
  name text NOT NULL,
  amount text NULL,
  cost_usd numeric NOT NULL,
  note text NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plant_inputs_plant_occurred
  ON plant_inputs (plant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_plant_inputs_garden_occurred
  ON plant_inputs (garden_id, occurred_at DESC);
