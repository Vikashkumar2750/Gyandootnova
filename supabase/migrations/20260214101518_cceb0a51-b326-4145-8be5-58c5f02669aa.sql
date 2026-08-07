
-- FIX 1: Book chapters - restrict content access to purchased/free/preview only
DROP POLICY IF EXISTS "Chapters are publicly readable" ON public.book_chapters;

-- Allow reading chapter metadata (without content) for all users
-- Allow full content only for free books, preview chapters, purchased books, or admins
CREATE POLICY "Public can read preview and free chapters"
  ON public.book_chapters FOR SELECT
  USING (
    is_preview = true
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
    OR public.has_role(auth.uid(), 'admin')
  );

-- FIX 2: Book files storage - restrict to purchasers, free book owners, or admins
DROP POLICY IF EXISTS "Authenticated users can read book files" ON storage.objects;

CREATE POLICY "Purchasers and admins can read book files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'book-files' AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.books b
        JOIN public.purchases p ON b.id = p.book_id
        WHERE b.file_url = name
        AND p.user_id = auth.uid()
        AND p.status = 'completed'
      )
      OR EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.file_url = name AND b.is_free = true
      )
    )
  );

-- FIX 3: Payment credential exposure - restrict sensitive fields
-- Replace donations SELECT policy to hide payment fields for non-admins
DROP POLICY IF EXISTS "Users can view own donations" ON public.donations;

-- Create a function to check column access (workaround for column-level security)
-- Instead, we'll use a secure view approach with RPC
CREATE OR REPLACE FUNCTION public.get_user_donations(_user_id uuid)
RETURNS TABLE (
  id uuid,
  amount numeric,
  donor_name text,
  donor_email text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, amount, donor_name, donor_email, status, created_at
  FROM public.donations
  WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_purchases(_user_id uuid)
RETURNS TABLE (
  id uuid,
  book_id uuid,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, book_id, status, created_at
  FROM public.purchases
  WHERE user_id = _user_id;
$$;

-- Re-create donations SELECT: admins see all, users see own (but payment fields still visible at DB level)
-- To truly hide columns, we restrict regular user SELECT and use RPCs instead
CREATE POLICY "Only admins can select donations directly"
  ON public.donations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Replace purchases SELECT policy similarly
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;

CREATE POLICY "Only admins can select purchases directly"
  ON public.purchases FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Keep the purchase check query working for book access validation
-- by allowing users to check their own purchase existence via a function
CREATE OR REPLACE FUNCTION public.has_purchased_book(_user_id uuid, _book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.purchases
    WHERE user_id = _user_id AND book_id = _book_id AND status = 'completed'
  );
$$;
