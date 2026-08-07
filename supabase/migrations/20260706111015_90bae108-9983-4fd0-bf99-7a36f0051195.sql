CREATE OR REPLACE FUNCTION public.get_seo_chapter_prerender_rows()
RETURNS TABLE (
  book_id uuid,
  book_title text,
  book_slug text,
  author text,
  cover_url text,
  book_description text,
  is_free boolean,
  preview_chapters integer,
  chapter_id uuid,
  chapter_title text,
  chapter_slug text,
  chapter_number integer,
  is_preview boolean,
  updated_at timestamp with time zone,
  content_html text,
  is_excerpt boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id AS book_id,
    b.title AS book_title,
    b.slug AS book_slug,
    b.author,
    b.cover_url,
    b.description AS book_description,
    b.is_free,
    COALESCE(b.preview_chapters, 0) AS preview_chapters,
    c.id AS chapter_id,
    c.title AS chapter_title,
    c.slug AS chapter_slug,
    c.chapter_number,
    c.is_preview,
    COALESCE(c.updated_at, b.updated_at, b.created_at) AS updated_at,
    CASE
      WHEN b.is_free OR c.is_preview OR c.chapter_number <= COALESCE(b.preview_chapters, 0)
        THEN COALESCE(c.content, '')
      ELSE LEFT(COALESCE(c.content, ''), 8000)
    END AS content_html,
    NOT (b.is_free OR c.is_preview OR c.chapter_number <= COALESCE(b.preview_chapters, 0)) AS is_excerpt
  FROM public.books b
  JOIN public.book_chapters c ON c.book_id = b.id
  WHERE b.slug IS NOT NULL
    AND b.slug <> ''
    AND c.slug IS NOT NULL
    AND c.slug <> ''
  ORDER BY b.created_at DESC, c.chapter_number ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_seo_chapter_prerender_rows() TO anon;
GRANT EXECUTE ON FUNCTION public.get_seo_chapter_prerender_rows() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seo_chapter_prerender_rows() TO service_role;