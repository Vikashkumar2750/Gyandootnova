
-- 1. Replace SELECT policy: everyone can list chapter metadata
DROP POLICY IF EXISTS "Public can read preview and free chapters" ON public.book_chapters;

CREATE POLICY "Anyone can list chapter metadata"
  ON public.book_chapters FOR SELECT
  USING (true);

-- 2. Lock down the content column at column level
REVOKE SELECT ON public.book_chapters FROM anon, authenticated;
GRANT SELECT (id, book_id, title, slug, chapter_number, is_preview, created_at, updated_at)
  ON public.book_chapters TO anon, authenticated;
GRANT ALL ON public.book_chapters TO service_role;

-- 3. Secure function to fetch content with access enforcement
CREATE OR REPLACE FUNCTION public.get_chapter_content(_chapter_id uuid)
RETURNS TABLE(content text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
     OR bk.is_free
     OR ch.chapter_number <= COALESCE(bk.preview_chapters, 0)
     OR public.has_role(auth.uid(), 'admin'::app_role)
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
$$;

GRANT EXECUTE ON FUNCTION public.get_chapter_content(uuid) TO anon, authenticated;
