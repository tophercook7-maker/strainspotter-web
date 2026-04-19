-- Optional labeling for grows and scans

ALTER TABLE IF EXISTS public.grows
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE IF EXISTS public.scans
  ADD COLUMN IF NOT EXISTS label text;

