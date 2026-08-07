GRANT SELECT ON public.book_chapters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_chapters TO authenticated;
GRANT ALL ON public.book_chapters TO service_role;

GRANT EXECUTE ON FUNCTION public.get_chapter_content(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_chapter_full(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_chapter_full(_chapter_id uuid)
RETURNS TABLE(id uuid, book_id uuid, title text, slug text, chapter_number integer, is_preview boolean, content text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'books_manager'::app_role)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
    SELECT c.id, c.book_id, c.title, c.slug, c.chapter_number, c.is_preview, c.content, c.created_at, c.updated_at
    FROM public.book_chapters c
    WHERE c.id = _chapter_id;
END;
$function$;