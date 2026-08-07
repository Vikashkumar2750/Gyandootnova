
CREATE TABLE public.seo_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fn text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempt int NOT NULL DEFAULT 1,
  max_attempts int NOT NULL DEFAULT 3,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int,
  error text,
  http_status int,
  payload jsonb DEFAULT '{}'::jsonb,
  result jsonb,
  dispatched_by uuid,
  run_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_job_runs_started ON public.seo_job_runs (started_at DESC);
CREATE INDEX idx_seo_job_runs_fn_status ON public.seo_job_runs (fn, status);
CREATE INDEX idx_seo_job_runs_date ON public.seo_job_runs (run_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_job_runs TO authenticated;
GRANT ALL ON public.seo_job_runs TO service_role;
ALTER TABLE public.seo_job_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read seo_job_runs" ON public.seo_job_runs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage seo_job_runs" ON public.seo_job_runs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.seo_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  level text NOT NULL DEFAULT 'info',
  fn text,
  job_run_id uuid REFERENCES public.seo_job_runs(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_notifications_created ON public.seo_notifications (created_at DESC);
CREATE INDEX idx_seo_notifications_unread ON public.seo_notifications (read_at) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_notifications TO authenticated;
GRANT ALL ON public.seo_notifications TO service_role;
ALTER TABLE public.seo_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read seo_notifications" ON public.seo_notifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage seo_notifications" ON public.seo_notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
