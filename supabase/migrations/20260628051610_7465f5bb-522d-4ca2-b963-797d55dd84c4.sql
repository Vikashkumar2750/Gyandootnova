
-- Normalize books.file_url: strip any absolute storage URL down to the object path only.
-- This removes accidental public URLs from being stored in a public-readable column historically.
UPDATE public.books
SET file_url = regexp_replace(file_url, '^https?://[^/]+/storage/v1/object/(?:public|sign)/book-files/', '')
WHERE file_url ~ '^https?://';

-- Strip query strings (signed url tokens) if any leaked in
UPDATE public.books
SET file_url = split_part(file_url, '?', 1)
WHERE file_url LIKE '%?%';

-- Reaffirm: anon/authenticated have NO column-level access to file_url; only service_role + admin RPC.
REVOKE SELECT (file_url) ON public.books FROM anon, authenticated, PUBLIC;
