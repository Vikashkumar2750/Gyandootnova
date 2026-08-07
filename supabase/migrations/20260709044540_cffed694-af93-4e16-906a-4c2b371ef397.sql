
-- Remove the overly-permissive anon SELECT policy that exposed paid chapter content
DROP POLICY IF EXISTS "Anon can list chapter metadata" ON public.book_chapters;

-- Anonymous users can only read preview chapters directly.
-- Paid chapter content is served via the existing security-definer RPC public.get_chapter_content
-- which checks preview/purchase/free-book/admin gating.
CREATE POLICY "Anon can read preview chapters only"
ON public.book_chapters
FOR SELECT
TO anon
USING (
  is_preview = true
  OR chapter_number <= COALESCE(
    (SELECT preview_chapters FROM public.books WHERE id = book_chapters.book_id),
    0
  )
);
