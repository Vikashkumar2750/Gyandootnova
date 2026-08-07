CREATE OR REPLACE FUNCTION public.get_chapter_content(_chapter_id uuid)
 RETURNS TABLE(content text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ch public.book_chapters;
  bk public.books;
BEGIN
  SELECT * INTO ch FROM public.book_chapters WHERE id = _chapter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chapter not found';
  END IF;

  SELECT * INTO bk FROM public.books WHERE id = ch.book_id;

  IF ch.is_preview
     OR ch.chapter_number <= COALESCE(bk.preview_chapters, 0)
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR (auth.uid() IS NOT NULL AND bk.is_free)
     OR EXISTS (
       SELECT 1 FROM public.purchases p
       WHERE p.book_id = ch.book_id
         AND p.user_id = auth.uid()
         AND p.status = 'completed'
     )
  THEN
    RETURN QUERY SELECT ch.content;
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;
END;
$function$;