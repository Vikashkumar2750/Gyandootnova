-- Add upload policy for book-covers bucket (authenticated users)
CREATE POLICY "Authenticated users can upload covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'book-covers' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'book-covers' AND auth.role() = 'authenticated');