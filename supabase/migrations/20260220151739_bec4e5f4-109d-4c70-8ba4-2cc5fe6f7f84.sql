-- Make book-files bucket public so covers and book files are accessible
UPDATE storage.buckets SET public = true WHERE id = 'book-files';

-- Add storage policies for book-files bucket
CREATE POLICY "Public read book files"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-files');

CREATE POLICY "Admin upload book files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'book-files' AND auth.role() = 'authenticated');

CREATE POLICY "Admin update book files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'book-files' AND auth.role() = 'authenticated');

CREATE POLICY "Admin delete book files"
ON storage.objects FOR DELETE
USING (bucket_id = 'book-files' AND auth.role() = 'authenticated');