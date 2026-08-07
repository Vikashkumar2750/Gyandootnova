-- 1. Add validity column to books (null = lifetime)
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS access_validity_days integer;

COMMENT ON COLUMN public.books.access_validity_days IS
  'Days from purchase date after which access expires. NULL = lifetime access.';

-- 2. Update has_purchased_book to honor validity
CREATE OR REPLACE FUNCTION public.has_purchased_book(_user_id uuid, _book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchases p
    JOIN public.books b ON b.id = p.book_id
    WHERE p.user_id = _user_id
      AND p.book_id = _book_id
      AND p.status = 'completed'
      AND (
        b.access_validity_days IS NULL
        OR p.created_at + (b.access_validity_days || ' days')::interval > now()
      )
  );
$$;

-- 3. Update get_user_purchases to return validity/expires_at
DROP FUNCTION IF EXISTS public.get_user_purchases(uuid);

CREATE OR REPLACE FUNCTION public.get_user_purchases(_user_id uuid)
RETURNS TABLE(
  id uuid,
  book_id uuid,
  status text,
  created_at timestamp with time zone,
  amount numeric,
  currency text,
  access_validity_days integer,
  expires_at timestamp with time zone,
  is_expired boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id, p.book_id, p.status, p.created_at, p.amount, p.currency,
    b.access_validity_days,
    CASE
      WHEN b.access_validity_days IS NULL THEN NULL
      ELSE p.created_at + (b.access_validity_days || ' days')::interval
    END AS expires_at,
    CASE
      WHEN b.access_validity_days IS NULL THEN false
      ELSE p.created_at + (b.access_validity_days || ' days')::interval <= now()
    END AS is_expired
  FROM public.purchases p
  JOIN public.books b ON b.id = p.book_id
  WHERE p.user_id = _user_id;
$$;

-- 4. Update get_chapter_content to enforce validity for paid books
CREATE OR REPLACE FUNCTION public.get_chapter_content(_chapter_id uuid)
RETURNS TABLE(content text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ch public.book_chapters;
  bk public.books;
BEGIN
  SELECT * INTO ch FROM public.book_chapters WHERE id = _chapter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chapter not found';
  END IF;

  SELECT * INTO bk FROM public.books WHERE id = ch.book_id;

  IF ch.is_preview
     OR ch.chapter_number <= COALESCE(bk.preview_chapters, 0)
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR (auth.uid() IS NOT NULL AND bk.is_free)
     OR EXISTS (
       SELECT 1 FROM public.purchases p
       WHERE p.book_id = ch.book_id
         AND p.user_id = auth.uid()
         AND p.status = 'completed'
         AND (
           bk.access_validity_days IS NULL
           OR p.created_at + (bk.access_validity_days || ' days')::interval > now()
         )
     )
  THEN
    RETURN QUERY SELECT ch.content;
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;
END;
$$;