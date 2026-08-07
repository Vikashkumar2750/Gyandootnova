
CREATE OR REPLACE FUNCTION public.admin_get_chapter_full(_chapter_id uuid)
RETURNS TABLE(id uuid, book_id uuid, title text, slug text, chapter_number int, is_preview boolean, content text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT c.id, c.book_id, c.title, c.slug, c.chapter_number, c.is_preview, c.content, c.created_at, c.updated_at
    FROM public.book_chapters c
    WHERE c.id = _chapter_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_chapter_full(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts
     SET publish_status = 'published',
         is_published   = true
   WHERE publish_status = 'scheduled'
     AND scheduled_at IS NOT NULL
     AND scheduled_at <= now();
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-posts') THEN
    PERFORM cron.unschedule('publish-scheduled-posts');
  END IF;
  PERFORM cron.schedule(
    'publish-scheduled-posts',
    '*/5 * * * *',
    $cron$ SELECT public.publish_scheduled_posts(); $cron$
  );
END;
$$;
