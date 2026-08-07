-- Block anon LIST on public image buckets. Public URLs (/storage/v1/object/public/...)
-- bypass RLS, so <img src> in the site keeps working — only the enumerate-all-files
-- API endpoint stops responding to anonymous callers.
DROP POLICY IF EXISTS "Book covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;