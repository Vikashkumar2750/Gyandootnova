
-- Create coupons table
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_uses integer, -- NULL = unlimited
  used_count integer NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active coupons (needed for validation on frontend)
CREATE POLICY "Public can validate active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()) AND (max_uses IS NULL OR used_count < max_uses));

-- Trigger to update updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to apply coupon (SECURITY DEFINER so it can increment used_count)
CREATE OR REPLACE FUNCTION public.apply_coupon(_code text, _order_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coupon public.coupons;
  discount numeric;
  final_amount numeric;
BEGIN
  SELECT * INTO coupon FROM public.coupons
  WHERE code = upper(_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR used_count < max_uses);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired coupon code');
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
$$;

-- Function to increment coupon used_count after successful payment
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(_coupon_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = _coupon_id;
$$;

-- Also create the missing increment_purchase_count function (fixes security warning)
CREATE OR REPLACE FUNCTION public.increment_purchase_count(_book_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.books SET purchase_count = purchase_count + 1 WHERE id = _book_id;
$$;
