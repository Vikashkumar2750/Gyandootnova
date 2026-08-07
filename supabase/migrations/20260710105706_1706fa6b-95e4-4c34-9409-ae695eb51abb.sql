CREATE OR REPLACE FUNCTION public.get_book_chapter_index(_book_id uuid)
RETURNS TABLE(
  id uuid,
  book_id uuid,
  title text,
  slug text,
  chapter_number integer,
  is_preview boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.id, c.book_id, c.title, c.slug, c.chapter_number, c.is_preview, c.created_at, c.updated_at
  FROM public.book_chapters c
  JOIN public.books b ON b.id = c.book_id
  WHERE c.book_id = _book_id
  ORDER BY c.chapter_number;
$function$;

GRANT EXECUTE ON FUNCTION public.get_book_chapter_index(uuid) TO anon, authenticated, service_role;