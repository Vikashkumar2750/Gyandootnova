
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS rewrite_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_rewritten_at timestamptz;
