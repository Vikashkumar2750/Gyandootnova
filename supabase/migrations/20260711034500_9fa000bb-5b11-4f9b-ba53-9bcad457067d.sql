ALTER TABLE public.seo_agent_logs
  ADD COLUMN IF NOT EXISTS content_score integer,
  ADD COLUMN IF NOT EXISTS seo_score integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz GENERATED ALWAYS AS (run_at) STORED;