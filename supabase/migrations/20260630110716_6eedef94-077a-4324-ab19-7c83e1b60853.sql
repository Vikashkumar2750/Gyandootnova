
-- Fix 1: Tighten book_chapters SELECT policy — require authentication for preview/free content
DROP POLICY IF EXISTS "Chapters accessible to entitled users" ON public.book_chapters;

CREATE POLICY "Chapters accessible to entitled users"
ON public.book_chapters
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_preview = true
  OR EXISTS (
    SELECT 1 FROM public.books b
    WHERE b.id = book_chapters.book_id
      AND book_chapters.chapter_number <= COALESCE(b.preview_chapters, 0)
  )
  OR EXISTS (
    SELECT 1 FROM public.books b
    WHERE b.id = book_chapters.book_id AND b.is_free = true
  )
  OR EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.book_id = book_chapters.book_id
      AND p.user_id = auth.uid()
      AND p.status = 'completed'
  )
);

REVOKE SELECT ON public.book_chapters FROM anon;

-- Fix 2: Add INSERT policy for contact_enquiries — public form submissions allowed,
-- but users cannot set privileged fields (status forced to 'new', admin_notes must be null)
GRANT INSERT ON public.contact_enquiries TO anon, authenticated;

CREATE POLICY "Anyone can submit contact enquiries"
ON public.contact_enquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'new'
  AND admin_notes IS NULL
);
