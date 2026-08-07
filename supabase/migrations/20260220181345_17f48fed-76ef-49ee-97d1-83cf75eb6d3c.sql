
-- Create junction table for coupon ↔ book restrictions
CREATE TABLE public.coupon_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  UNIQUE(coupon_id, book_id)
);

ALTER TABLE public.coupon_books ENABLE ROW LEVEL SECURITY;

-- Admins can manage coupon_books
CREATE POLICY "Admins can manage coupon_books"
ON public.coupon_books
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can read (needed for apply_coupon validation on client side)
CREATE POLICY "Public can read coupon_books"
ON public.coupon_books
FOR SELECT
USING (true);

-- Update apply_coupon to enforce book restriction
CREATE OR REPLACE FUNCTION public.apply_coupon(_code text, _order_amount numeric, _book_id uuid DEFAULT NULL)
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
  SELECT * INTO coupon FROM public.coupons
  WHERE code = upper(_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR used_count < max_uses);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired coupon code');
  END IF;

  -- Check book restriction: if coupon has specific books, _book_id must be in the list
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
