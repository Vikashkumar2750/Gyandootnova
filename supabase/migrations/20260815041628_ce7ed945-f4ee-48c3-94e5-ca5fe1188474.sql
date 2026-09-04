DROP POLICY IF EXISTS "auth read book_knowledge" ON public.book_knowledge;
CREATE POLICY "staff read book_knowledge"
ON public.book_knowledge FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'books_manager')
  OR public.has_role(auth.uid(), 'seo_manager')
);