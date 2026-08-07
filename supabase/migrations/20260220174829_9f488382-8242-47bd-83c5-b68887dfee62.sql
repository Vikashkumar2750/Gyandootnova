
-- 1. Make book-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'book-files';

-- 2. Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public read book files" ON storage.objects;

-- 3. Restore secure purchase-based access policy:
--    Allows: admins, free book owners, and users who have completed purchase
CREATE POLICY "Secure book file access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'book-files'
  AND (
    -- Admins can always access
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR
    -- Access allowed if book is free (match by path prefix = book slug/id)
    EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.file_url LIKE '%' || name
        AND b.is_free = true
    )
    OR
    -- Access allowed if user has a completed purchase for the book
    EXISTS (
      SELECT 1
      FROM public.purchases p
      JOIN public.books b ON b.id = p.book_id
      WHERE p.user_id = auth.uid()
        AND p.status = 'completed'
        AND b.file_url LIKE '%' || name
    )
  )
);

-- 4. Admins can upload/update/delete book files
DROP POLICY IF EXISTS "Admins can upload book files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update book files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete book files" ON storage.objects;

CREATE POLICY "Admins can upload book files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-files'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update book files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-files'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete book files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book-files'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
