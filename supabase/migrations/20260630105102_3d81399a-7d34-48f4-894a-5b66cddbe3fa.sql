
-- 1) Admin-only table for book file paths
CREATE TABLE IF NOT EXISTS public.book_files (
  book_id uuid PRIMARY KEY REFERENCES public.books(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.book_files TO service_role;
-- No grants to anon/authenticated; access for admins goes through SECURITY DEFINER RPCs.

ALTER TABLE public.book_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage book_files" ON public.book_files;
CREATE POLICY "Admins manage book_files" ON public.book_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Migrate data
INSERT INTO public.book_files (book_id, file_url)
SELECT id, file_url
FROM public.books
WHERE file_url IS NOT NULL AND file_url <> ''
ON CONFLICT (book_id) DO UPDATE SET file_url = EXCLUDED.file_url;

-- 3) Rewrite storage policies to use book_files instead of books.file_url
DROP POLICY IF EXISTS "Purchasers and admins can read book files" ON storage.objects;
DROP POLICY IF EXISTS "Secure book file access" ON storage.objects;

CREATE POLICY "Secure book file access" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'book-files'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.book_files bf
        JOIN public.books b ON b.id = bf.book_id
        WHERE bf.file_url = storage.objects.name
          AND b.is_free = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.book_files bf
        JOIN public.purchases p ON p.book_id = bf.book_id
        WHERE bf.file_url = storage.objects.name
          AND p.user_id = auth.uid()
          AND p.status = 'completed'
      )
    )
  );

-- 4) Updated read RPC
CREATE OR REPLACE FUNCTION public.admin_get_book_file_url(_book_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  url text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT file_url INTO url FROM public.book_files WHERE book_id = _book_id;
  RETURN url;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_book_file_url(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_book_file_url(uuid) TO authenticated;

-- 5) New write RPC for admin UI
CREATE OR REPLACE FUNCTION public.admin_set_book_file_url(_book_id uuid, _file_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _file_url IS NULL OR _file_url = '' THEN
    DELETE FROM public.book_files WHERE book_id = _book_id;
  ELSE
    INSERT INTO public.book_files (book_id, file_url)
    VALUES (_book_id, _file_url)
    ON CONFLICT (book_id) DO UPDATE
      SET file_url = EXCLUDED.file_url, updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_book_file_url(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_book_file_url(uuid, text) TO authenticated;

-- 6) Drop file_url from books — no longer referenced anywhere
ALTER TABLE public.books DROP COLUMN IF EXISTS file_url;

-- 7) Lock down ai_cache
DROP POLICY IF EXISTS "Anyone can read ai_cache" ON public.ai_cache;
DROP POLICY IF EXISTS "Authenticated can read ai_cache" ON public.ai_cache;
CREATE POLICY "Authenticated can read ai_cache" ON public.ai_cache
  FOR SELECT TO authenticated
  USING (true);

REVOKE SELECT ON public.ai_cache FROM anon;
GRANT SELECT ON public.ai_cache TO authenticated;
