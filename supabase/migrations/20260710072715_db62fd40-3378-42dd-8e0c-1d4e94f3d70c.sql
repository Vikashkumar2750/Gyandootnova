
-- 1. Book knowledge base
CREATE TABLE IF NOT EXISTS public.book_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE UNIQUE,
  title text,
  author text,
  summary text,
  topics text[] DEFAULT '{}',
  entities text[] DEFAULT '{}',
  concepts text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  faqs jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.book_knowledge TO authenticated;
GRANT ALL ON public.book_knowledge TO service_role;
ALTER TABLE public.book_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage book_knowledge" ON public.book_knowledge FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth read book_knowledge" ON public.book_knowledge FOR SELECT
  TO authenticated USING (true);
CREATE TRIGGER trg_book_knowledge_updated
  BEFORE UPDATE ON public.book_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Daily run log
CREATE TABLE IF NOT EXISTS public.daily_run_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running', -- running | success | failed | skipped
  keyword text,
  keyword_score numeric,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  seo_score numeric,
  readability_score numeric,
  originality_score numeric,
  self_check jsonb DEFAULT '{}'::jsonb,
  error text,
  steps jsonb DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_daily_run_log_date ON public.daily_run_log(run_date DESC);
GRANT SELECT ON public.daily_run_log TO authenticated;
GRANT ALL ON public.daily_run_log TO service_role;
ALTER TABLE public.daily_run_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read daily_run_log" ON public.daily_run_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage daily_run_log" ON public.daily_run_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. posts extra quality columns
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS readability_score numeric,
  ADD COLUMN IF NOT EXISTS originality_score numeric,
  ADD COLUMN IF NOT EXISTS self_check jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_passed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_book_ids uuid[] DEFAULT '{}';

-- 4. keyword queue extras
ALTER TABLE public.seo_keyword_queue
  ADD COLUMN IF NOT EXISTS relevance_score numeric,
  ADD COLUMN IF NOT EXISTS opportunity_score numeric,
  ADD COLUMN IF NOT EXISTS sources jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS matched_book_ids uuid[] DEFAULT '{}';
