CREATE TABLE IF NOT EXISTS public.editorial_agent_runs (
  id uuid primary key default gen_random_uuid(),
  topic text,
  keyword text,
  post_id uuid,
  status text not null default 'ok',
  quality_score numeric,
  originality_score numeric,
  revisions integer default 0,
  error text,
  details jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.editorial_agent_runs TO authenticated;
GRANT ALL ON public.editorial_agent_runs TO service_role;
ALTER TABLE public.editorial_agent_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view editorial agent runs" ON public.editorial_agent_runs;
CREATE POLICY "Admins can view editorial agent runs" ON public.editorial_agent_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS editorial_agent_runs_created_idx ON public.editorial_agent_runs (created_at DESC);