BEGIN;

CREATE TABLE IF NOT EXISTS public.feedback_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.feedback_threads(id) ON DELETE CASCADE,
  user_id uuid NULL,
  role text NOT NULL CHECK (role IN ('user','admin')),
  message text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_threads_user_id_created
  ON public.feedback_threads(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_messages_thread_created
  ON public.feedback_messages(thread_id, created_at ASC);

COMMIT;
