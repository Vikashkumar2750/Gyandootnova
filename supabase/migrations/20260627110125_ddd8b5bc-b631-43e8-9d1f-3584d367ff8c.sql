
-- 1) books.file_url: revoke column SELECT from anon and authenticated; add admin-only RPC
REVOKE SELECT (file_url) ON public.books FROM anon;
REVOKE SELECT (file_url) ON public.books FROM authenticated;
REVOKE SELECT (file_url) ON public.books FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.admin_get_book_file_url(_book_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  url text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT file_url INTO url FROM public.books WHERE id = _book_id;
  RETURN url;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_book_file_url(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_book_file_url(uuid) TO authenticated;

-- 2) coupons: replace ALL policy with admin-scoped per-command policies (no SELECT for non-admin users)
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;

CREATE POLICY "Admins can view coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert coupons"
  ON public.coupons FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update coupons"
  ON public.coupons FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete coupons"
  ON public.coupons FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Harden remaining authenticated-callable SECURITY DEFINER functions: require signed-in user
CREATE OR REPLACE FUNCTION public.apply_coupon(_code text, _order_amount numeric, _book_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  coupon public.coupons;
  discount numeric;
  final_amount numeric;
  book_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO coupon FROM public.coupons
  WHERE code = upper(_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR used_count < max_uses);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired coupon code');
  END IF;

  SELECT COUNT(*) INTO book_count FROM public.coupon_books WHERE coupon_id = coupon.id;
  IF book_count > 0 THEN
    IF _book_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.coupon_books
      WHERE coupon_id = coupon.id AND book_id = _book_id
    ) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'This coupon is not valid for this book');
    END IF;
  END IF;

  IF _order_amount < COALESCE(coupon.min_order_amount, 0) THEN
    RETURN jsonb_build_object('valid', false, 'error', format('Minimum order amount is ₹%s', coupon.min_order_amount));
  END IF;

  IF coupon.discount_type = 'percent' THEN
    discount := ROUND((_order_amount * coupon.discount_value / 100)::numeric, 2);
  ELSE
    discount := LEAST(coupon.discount_value, _order_amount);
  END IF;

  final_amount := GREATEST(_order_amount - discount, 1);

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', coupon.id,
    'code', coupon.code,
    'description', coupon.description,
    'discount_type', coupon.discount_type,
    'discount_value', coupon.discount_value,
    'discount_amount', discount,
    'original_amount', _order_amount,
    'final_amount', final_amount
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_coupon(_code text, _order_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.apply_coupon(_code, _order_amount, NULL::uuid);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, numeric, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_coupon(text, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_coupon(text, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_chapter_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chapter_content(uuid) TO authenticated;
