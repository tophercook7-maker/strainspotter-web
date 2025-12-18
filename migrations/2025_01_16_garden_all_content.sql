-- Garden All Content Tables
-- Full garden management: gardens, plants, tasks, environment, logbook

-- Gardens (one per user, can have multiple)
CREATE TABLE IF NOT EXISTS gardens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Garden Plants (plants within a garden)
CREATE TABLE IF NOT EXISTS garden_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id uuid NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  strain_name text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('seedling', 'veg', 'flower', 'dry', 'cure', 'harvested', 'archived')),
  started_at date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Garden Environment Logs
CREATE TABLE IF NOT EXISTS garden_environment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id uuid NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at timestamptz DEFAULT now(),
  temperature numeric,
  humidity numeric,
  vpd numeric,
  notes text
);

-- Garden Tasks
CREATE TABLE IF NOT EXISTS garden_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id uuid NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at timestamptz DEFAULT now()
);

-- Garden Logbook Entries
CREATE TABLE IF NOT EXISTS garden_logbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id uuid NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  entry_type text NOT NULL CHECK (entry_type IN ('feeding', 'watering', 'training', 'observation', 'other')),
  text text NOT NULL,
  related_plant_id uuid REFERENCES garden_plants(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gardens_user_id ON gardens(user_id);
CREATE INDEX IF NOT EXISTS idx_garden_plants_garden_id ON garden_plants(garden_id);
CREATE INDEX IF NOT EXISTS idx_garden_environment_logs_garden_id ON garden_environment_logs(garden_id);
CREATE INDEX IF NOT EXISTS idx_garden_environment_logs_user_id ON garden_environment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_garden_tasks_garden_id ON garden_tasks(garden_id);
CREATE INDEX IF NOT EXISTS idx_garden_tasks_user_id ON garden_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_garden_tasks_status ON garden_tasks(status);
CREATE INDEX IF NOT EXISTS idx_garden_logbook_entries_garden_id ON garden_logbook_entries(garden_id);
CREATE INDEX IF NOT EXISTS idx_garden_logbook_entries_user_id ON garden_logbook_entries(user_id);

-- Enable RLS
ALTER TABLE gardens ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_environment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_logbook_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users manage own gardens and all related content
CREATE POLICY "Users manage own gardens"
  ON gardens FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own garden plants"
  ON garden_plants FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM gardens WHERE id = garden_id));

CREATE POLICY "Users manage own garden environment logs"
  ON garden_environment_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own garden tasks"
  ON garden_tasks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own garden logbook entries"
  ON garden_logbook_entries FOR ALL
  USING (auth.uid() = user_id);
