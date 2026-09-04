
CREATE TABLE IF NOT EXISTS public.app_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  message text NOT NULL,
  stack text,
  source text NOT NULL DEFAULT 'client',
  route text,
  user_agent text,
  user_id uuid,
  severity text NOT NULL DEFAULT 'error',
  occurrences integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open',
  auto_fix text,
  ai_diagnosis text,
  needs_ai boolean NOT NULL DEFAULT false,
  emailed_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_errors_fingerprint_key ON public.app_errors (fingerprint);

GRANT ALL ON public.app_errors TO service_role;
GRANT SELECT, UPDATE ON public.app_errors TO authenticated;

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view app errors" ON public.app_errors;
CREATE POLICY "Admins can view app errors"
  ON public.app_errors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update app errors" ON public.app_errors;
CREATE POLICY "Admins can update app errors"
  ON public.app_errors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
