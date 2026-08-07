-- 1. Readiness scores table
CREATE TABLE IF NOT EXISTS public.ai_readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ai_visibility INT NOT NULL,
  agent_readiness INT NOT NULL,
  ai_maturity INT NOT NULL,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_readiness_scores TO authenticated;
GRANT ALL ON public.ai_readiness_scores TO service_role;

ALTER TABLE public.ai_readiness_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read readiness scores"
  ON public.ai_readiness_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS ai_readiness_scores_scored_at_idx
  ON public.ai_readiness_scores (scored_at DESC);

-- 2. Tighten publish gate: originality < 92 defers 6h and marks for rewrite
CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Defer weak-originality posts by 6h, so the auto-rewrite sweep can lift them
  UPDATE public.posts
     SET scheduled_at = now() + interval '6 hours'
   WHERE publish_status = 'scheduled'
     AND scheduled_at IS NOT NULL
     AND scheduled_at <= now()
     AND COALESCE(originality_score, 0) < 92
     AND COALESCE(originality_score, 0) > 0;

  -- Publish everything else that is due
  UPDATE public.posts
     SET approval_status = 'approved',
         reviewed_at     = COALESCE(reviewed_at, now()),
         publish_status  = 'published',
         is_published    = true
   WHERE publish_status = 'scheduled'
     AND scheduled_at IS NOT NULL
     AND scheduled_at <= now()
     AND (originality_score IS NULL OR originality_score >= 92);
END;
$$;

-- 3. Persist the target threshold in site settings for visibility
INSERT INTO public.settings (key, value)
VALUES ('originality_threshold', to_jsonb(92))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;