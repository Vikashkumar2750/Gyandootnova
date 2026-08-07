
-- =========================================================
-- SECURITY HARDENING MIGRATION
-- =========================================================

-- 1) BOOK CHAPTERS: restrict full row reads to admin/free/preview/purchased.
--    Listing of paid-chapter titles for non-purchasers is restricted; content
--    is still served through get_chapter_content() RPC for allowed users.
DROP POLICY IF EXISTS "Anyone can list chapter metadata" ON public.book_chapters;
CREATE POLICY "Chapters accessible to entitled users"
  ON public.book_chapters
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR is_preview = true
    OR EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = book_chapters.book_id
        AND (b.is_free = true OR book_chapters.chapter_number <= COALESCE(b.preview_chapters, 0))
    )
    OR EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.book_id = book_chapters.book_id
        AND p.user_id = auth.uid()
        AND p.status = 'completed'
    )
  );

-- 2) SETTINGS: add is_public flag; restrict SELECT to public rows or admins.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

UPDATE public.settings
SET is_public = true
WHERE key IN (
  'site_name','site_tagline','site_logo',
  'whatsapp_number','facebook_url','instagram_url',
  'linkedin_url','twitter_url','youtube_url'
);

DROP POLICY IF EXISTS "Settings are publicly readable" ON public.settings;
CREATE POLICY "Public can read flagged-public settings"
  ON public.settings
  FOR SELECT
  USING (is_public = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3) BOOKS.file_url: remove anon column-level access.
REVOKE SELECT (file_url) ON public.books FROM anon;

-- 4) COUPONS: remove public mapping leakage on coupon_books.
DROP POLICY IF EXISTS "Public can read coupon_books" ON public.coupon_books;
REVOKE SELECT ON public.coupon_books FROM anon, authenticated;
-- service_role (used by apply_coupon SECURITY DEFINER) retains full access.

-- 5) STORAGE book-files: remove overly permissive authenticated policies.
DROP POLICY IF EXISTS "Admin upload book files"  ON storage.objects;
DROP POLICY IF EXISTS "Admin update book files"  ON storage.objects;
DROP POLICY IF EXISTS "Admin delete book files"  ON storage.objects;
-- Admin-only policies ("Admins can update/delete book files" / "Admins can manage book files") remain in place.
-- Add admin INSERT policy if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Admins can upload book files'
  ) THEN
    CREATE POLICY "Admins can upload book files"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'book-files'
        AND public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END$$;

-- 6) USER ROLES: scope admin-only mutation policies to authenticated role
--    and require a non-null auth uid.
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

-- 7) SECURITY DEFINER functions: tighten EXECUTE grants.
-- Trigger-only / internal-only functions: revoke from all public roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_purchase_count(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid)        FROM PUBLIC, anon, authenticated;

-- User-context functions: revoke PUBLIC + anon; keep authenticated.
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, numeric)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, numeric, uuid)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_purchases(uuid)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_donations(uuid)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_chapter_content(uuid)           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_purchased_book(uuid, uuid)      FROM PUBLIC, anon;
-- has_role is called inside RLS evaluated as anon too; keep anon access.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)            FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role)            TO   anon, authenticated, service_role;

-- 8) Admin OTP server-side enforcement: track verified sessions.
CREATE TABLE IF NOT EXISTS public.admin_otp_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_otp_sessions TO service_role;
ALTER TABLE public.admin_otp_sessions ENABLE ROW LEVEL SECURITY;
-- No public policies: only service_role / SECURITY DEFINER reads.

CREATE INDEX IF NOT EXISTS idx_admin_otp_sessions_user_expires
  ON public.admin_otp_sessions (user_id, expires_at DESC);

-- Helper used by admin edge functions to gate sensitive admin actions.
CREATE OR REPLACE FUNCTION public.is_admin_otp_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_otp_sessions
    WHERE user_id = _user_id AND expires_at > now()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin_otp_verified(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin_otp_verified(uuid) TO service_role;
