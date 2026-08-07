
CREATE TABLE IF NOT EXISTS public.seo_agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  topic text,
  focus_keyword text,
  action text,
  status text NOT NULL DEFAULT 'ok',
  post_id uuid,
  slug text,
  similarity_score numeric,
  matched_slug text,
  sources jsonb DEFAULT '[]'::jsonb,
  internal_links jsonb DEFAULT '[]'::jsonb,
  external_links jsonb DEFAULT '[]'::jsonb,
  word_count integer,
  reading_time_min integer,
  error text,
  meta jsonb DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.seo_agent_logs TO authenticated;
GRANT ALL ON public.seo_agent_logs TO service_role;
ALTER TABLE public.seo_agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view seo agent logs" ON public.seo_agent_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  title text,
  content text,
  excerpt text,
  meta_title text,
  meta_description text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.post_revisions TO authenticated;
GRANT ALL ON public.post_revisions TO service_role;
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view post revisions" ON public.post_revisions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS manually_edited boolean NOT NULL DEFAULT false;
