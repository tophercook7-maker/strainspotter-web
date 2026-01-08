-- Optional label for logbook entries

ALTER TABLE IF EXISTS public.garden_logbook_entries
  ADD COLUMN IF NOT EXISTS label text;

CREATE INDEX IF NOT EXISTS idx_garden_logbook_entries_label ON public.garden_logbook_entries(label);

