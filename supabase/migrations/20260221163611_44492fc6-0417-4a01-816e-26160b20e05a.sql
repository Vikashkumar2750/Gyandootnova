
-- Add preview_chapters column to books (admin controls how many chapters are free preview)
ALTER TABLE public.books ADD COLUMN preview_chapters integer NOT NULL DEFAULT 0;

-- Update the RLS policy on book_chapters to also allow access based on preview_chapters count
DROP POLICY IF EXISTS "Public can read preview and free chapters" ON public.book_chapters;

CREATE POLICY "Public can read preview and free chapters"
ON public.book_chapters
FOR SELECT
USING (
  (is_preview = true)
  OR (chapter_number <= (SELECT b.preview_chapters FROM books b WHERE b.id = book_chapters.book_id))
  OR (EXISTS (SELECT 1 FROM books b WHERE b.id = book_chapters.book_id AND b.is_free = true))
  OR (EXISTS (SELECT 1 FROM purchases p WHERE p.book_id = book_chapters.book_id AND p.user_id = auth.uid() AND p.status = 'completed'))
  OR has_role(auth.uid(), 'admin'::app_role)
);
