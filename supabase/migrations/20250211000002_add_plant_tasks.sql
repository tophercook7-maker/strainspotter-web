CREATE TABLE IF NOT EXISTS plant_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  garden_id uuid NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  user_id uuid NULL,
  kind text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  notes text NULL,
  due_at timestamptz NOT NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plant_tasks_plant_due
  ON plant_tasks (plant_id, completed_at, due_at);

CREATE INDEX IF NOT EXISTS idx_plant_tasks_garden_due
  ON plant_tasks (garden_id, completed_at, due_at);

CREATE INDEX IF NOT EXISTS idx_plant_tasks_due
  ON plant_tasks (due_at);
