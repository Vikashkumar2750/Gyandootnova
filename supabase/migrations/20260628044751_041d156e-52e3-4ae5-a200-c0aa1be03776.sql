
-- 1) Hide books.file_url from anon/authenticated. Admins use admin_get_book_file_url RPC.
REVOKE SELECT (file_url) ON public.books FROM anon, authenticated, PUBLIC;

-- Ensure remaining columns remain readable (re-grant explicit per-column SELECT excluding file_url)
GRANT SELECT (
  id, title, slug, author, description, cover_url, price, is_free,
  file_type, is_featured, purchase_count, created_at, updated_at,
  preview_chapters, category, referral_commission_percent
) ON public.books TO anon, authenticated;

-- 2) Tighten book_chapters SELECT: free-book bypass now requires authenticated user.
DROP POLICY IF EXISTS "Chapters accessible to entitled users" ON public.book_chapters;
CREATE POLICY "Chapters accessible to entitled users"
ON public.book_chapters
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR is_preview = true
  OR EXISTS (
    SELECT 1 FROM public.books b
    WHERE b.id = book_chapters.book_id
      AND book_chapters.chapter_number <= COALESCE(b.preview_chapters, 0)
  )
  OR (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = book_chapters.book_id AND b.is_free = true
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.book_id = book_chapters.book_id
      AND p.user_id = auth.uid()
      AND p.status = 'completed'
  )
);

-- 3) Mirror the same auth requirement in get_chapter_content RPC.
CREATE OR REPLACE FUNCTION public.get_chapter_content(_chapter_id uuid)
RETURNS TABLE(content text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
     )
  THEN
    RETURN QUERY SELECT ch.content;
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;
END;
$function$;

-- 4) Lock down SECURITY DEFINER functions that should never be called by clients.
REVOKE ALL ON FUNCTION public.increment_coupon_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_purchase_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin_otp_verified(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_book_file_url(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_purchases(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_donations(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_purchased_book(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_coupon(text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_coupon(text, numeric, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_chapter_content(uuid) FROM PUBLIC, anon;

-- Ensure intended callers retain access.
GRANT EXECUTE ON FUNCTION public.admin_get_book_file_url(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_purchases(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_donations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_purchased_book(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_coupon(text, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chapter_content(uuid) TO authenticated;
-- has_role stays callable by anon+authenticated because RLS policies evaluate it as the querying role.
