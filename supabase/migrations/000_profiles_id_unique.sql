-- Ensure profiles.id has a unique constraint for FK references (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype IN ('u', 'p')
      AND conname = 'profiles_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_key UNIQUE (id);
  END IF;
END$$;

