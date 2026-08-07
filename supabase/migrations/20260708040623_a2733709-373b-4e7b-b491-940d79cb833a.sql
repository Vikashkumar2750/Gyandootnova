
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS reading_time_min integer,
  ADD COLUMN IF NOT EXISTS word_count integer,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS primary_keyword text,
  ADD COLUMN IF NOT EXISTS secondary_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS featured_image_title text,
  ADD COLUMN IF NOT EXISTS featured_image_alt text,
  ADD COLUMN IF NOT EXISTS featured_image_caption text,
  ADD COLUMN IF NOT EXISTS social_caption text,
  ADD COLUMN IF NOT EXISTS social_excerpt text,
  ADD COLUMN IF NOT EXISTS internal_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS external_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS schema_type text NOT NULL DEFAULT 'BlogPosting';

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_publish_status_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_publish_status_check
  CHECK (publish_status IN ('draft','scheduled','published'));

UPDATE public.posts
SET publish_status = CASE WHEN is_published THEN 'published' ELSE 'draft' END
WHERE publish_status = 'draft' AND is_published = true;

CREATE INDEX IF NOT EXISTS posts_scheduled_at_idx
  ON public.posts (scheduled_at)
  WHERE publish_status = 'scheduled';

CREATE OR REPLACE FUNCTION public.sync_post_publish_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.publish_status IS DISTINCT FROM OLD.publish_status THEN
    NEW.is_published := (NEW.publish_status = 'published');
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.publish_status = 'published' THEN
      NEW.is_published := true;
    ELSIF NEW.is_published = true AND NEW.publish_status = 'draft' THEN
      NEW.publish_status := 'published';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_sync_publish_status ON public.posts;
CREATE TRIGGER posts_sync_publish_status
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.sync_post_publish_status();
