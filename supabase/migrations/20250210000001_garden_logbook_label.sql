-- Optional label for logbook entries

ALTER TABLE IF EXISTS public.garden_logbook_entries
  ADD COLUMN IF NOT EXISTS label text;

-- Only create index if table exists (table may not exist in all setups)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'garden_logbook_entries') THEN
    CREATE INDEX IF NOT EXISTS idx_garden_logbook_entries_label ON public.garden_logbook_entries(label);
  END IF;
END $$;

