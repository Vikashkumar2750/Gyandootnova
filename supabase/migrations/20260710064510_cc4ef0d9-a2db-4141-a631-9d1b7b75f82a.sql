
-- Extend posts with SEO automation fields
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS social_captions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS search_intent text,
  ADD COLUMN IF NOT EXISTS keyword_difficulty numeric,
  ADD COLUMN IF NOT EXISTS content_score numeric,
  ADD COLUMN IF NOT EXISTS indexing_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS gsc_impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gsc_clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gsc_ctr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gsc_position numeric;

-- Keyword queue for the market-research engine
CREATE TABLE IF NOT EXISTS public.seo_keyword_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  secondary_keywords text[] NOT NULL DEFAULT '{}',
  search_intent text,
  estimated_volume integer,
  keyword_difficulty numeric,
  competition_score numeric,
  trend_score numeric,
  opportunity_score numeric,
  source text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','used','rejected','failed')),
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  reject_reason text,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS seo_keyword_queue_kw_uidx ON public.seo_keyword_queue (lower(keyword));
CREATE INDEX IF NOT EXISTS seo_keyword_queue_status_idx ON public.seo_keyword_queue (status, opportunity_score DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_keyword_queue TO authenticated;
GRANT ALL ON public.seo_keyword_queue TO service_role;

ALTER TABLE public.seo_keyword_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage keyword queue"
  ON public.seo_keyword_queue FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
