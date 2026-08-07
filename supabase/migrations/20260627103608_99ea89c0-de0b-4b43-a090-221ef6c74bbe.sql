
-- ====== SECURITY HARDENING ======

-- 1) Coupon-readability policy: restrict admin policy to authenticated only
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage coupon_books" ON public.coupon_books;
CREATE POLICY "Admins can manage coupon_books" ON public.coupon_books
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) books.file_url: revoke column SELECT from anon/authenticated
REVOKE SELECT (file_url) ON public.books FROM anon, authenticated;

-- 3) donations: revoke donor_email/donor_name column SELECT from public roles
REVOKE SELECT (donor_email, donor_name) ON public.donations FROM anon, authenticated;
-- Self-service donation listing is via the SECURITY DEFINER get_user_donations RPC

-- 4) user_roles: require admin-OTP-verified admin to mutate roles (anti-escalation)
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "OTP-verified admins can insert roles" ON public.user_roles
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_admin_otp_verified(auth.uid())
  );

CREATE POLICY "OTP-verified admins can update roles" ON public.user_roles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_admin_otp_verified(auth.uid())
  );

CREATE POLICY "OTP-verified admins can delete roles" ON public.user_roles
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_admin_otp_verified(auth.uid())
  );

-- 5) Tighten SECURITY DEFINER function execute grants
REVOKE EXECUTE ON FUNCTION public.get_chapter_content(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, numeric, uuid) FROM anon;

-- Convert helper functions that don't actually need elevated privileges
-- to SECURITY INVOKER so they respect the caller's RLS instead of bypassing it.
ALTER FUNCTION public.get_user_purchases(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_user_donations(uuid)  SECURITY INVOKER;
ALTER FUNCTION public.has_purchased_book(uuid, uuid) SECURITY INVOKER;

-- 6) Add coupon_id column to purchases for idempotent post-payment redemption
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id);

-- 7) Optional: index for fast coupon increment check
CREATE INDEX IF NOT EXISTS idx_purchases_order_status ON public.purchases (razorpay_order_id, status);
