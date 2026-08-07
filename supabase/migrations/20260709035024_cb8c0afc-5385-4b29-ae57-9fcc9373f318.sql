-- Revoke column-level access to sensitive columns from anon so the
-- "Anon can list chapter metadata" policy cannot leak paid chapter text.
-- Row-level policy stays (needed for listing chapter titles/numbers on
-- book detail pages); column privileges block reading the paid body.
REVOKE SELECT ON public.book_chapters FROM anon;
GRANT SELECT (
  id,
  book_id,
  chapter_number,
  title,
  slug,
  is_preview,
  created_at,
  updated_at
) ON public.book_chapters TO anon;