
-- Helper: does user have access to a specific admin area?
CREATE OR REPLACE FUNCTION public.has_admin_area(_user_id uuid, _area text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = 'admin'::public.app_role
        OR (_area = 'books'    AND role = 'books_manager'::public.app_role)
        OR (_area = 'seo'      AND role = 'seo_manager'::public.app_role)
        OR (_area = 'payments' AND role = 'payments_manager'::public.app_role)
        OR (_area = 'users'    AND role = 'users_manager'::public.app_role)
      )
  )
$$;

-- Helper: does user have ANY admin-level role (used for admin panel entry)?
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN (
        'admin'::public.app_role,
        'books_manager'::public.app_role,
        'seo_manager'::public.app_role,
        'payments_manager'::public.app_role,
        'users_manager'::public.app_role,
        'support'::public.app_role
      )
  )
$$;

-- =========================================================
-- BOOKS AREA (additive policies for books_manager)
-- =========================================================
DROP POLICY IF EXISTS "Books managers can manage books" ON public.books;
CREATE POLICY "Books managers can manage books" ON public.books
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'books_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'books_manager'));

DROP POLICY IF EXISTS "Books managers can manage chapters" ON public.book_chapters;
CREATE POLICY "Books managers can manage chapters" ON public.book_chapters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'books_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'books_manager'));

DROP POLICY IF EXISTS "Books managers can manage book files" ON public.book_files;
CREATE POLICY "Books managers can manage book files" ON public.book_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'books_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'books_manager'));

DROP POLICY IF EXISTS "Books managers can manage book knowledge" ON public.book_knowledge;
CREATE POLICY "Books managers can manage book knowledge" ON public.book_knowledge
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'books_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'books_manager'));

-- =========================================================
-- SEO / BLOG AREA (additive policies for seo_manager)
-- =========================================================
DROP POLICY IF EXISTS "SEO managers can manage posts" ON public.posts;
CREATE POLICY "SEO managers can manage posts" ON public.posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'seo_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'seo_manager'));

DROP POLICY IF EXISTS "SEO managers can manage lsi keywords" ON public.lsi_keywords;
CREATE POLICY "SEO managers can manage lsi keywords" ON public.lsi_keywords
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'seo_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'seo_manager'));

DROP POLICY IF EXISTS "SEO managers can manage post revisions" ON public.post_revisions;
CREATE POLICY "SEO managers can manage post revisions" ON public.post_revisions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'seo_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'seo_manager'));

DROP POLICY IF EXISTS "SEO managers can view seo logs" ON public.seo_agent_logs;
CREATE POLICY "SEO managers can view seo logs" ON public.seo_agent_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seo_manager'));

DROP POLICY IF EXISTS "SEO managers can view seo alerts" ON public.seo_agent_alerts;
CREATE POLICY "SEO managers can view seo alerts" ON public.seo_agent_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seo_manager'));

DROP POLICY IF EXISTS "SEO managers can view seo runs" ON public.seo_job_runs;
CREATE POLICY "SEO managers can view seo runs" ON public.seo_job_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seo_manager'));

DROP POLICY IF EXISTS "SEO managers can manage keyword queue" ON public.seo_keyword_queue;
CREATE POLICY "SEO managers can manage keyword queue" ON public.seo_keyword_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'seo_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'seo_manager'));

DROP POLICY IF EXISTS "SEO managers can view seo notifications" ON public.seo_notifications;
CREATE POLICY "SEO managers can view seo notifications" ON public.seo_notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seo_manager'));

-- =========================================================
-- PAYMENTS AREA (additive policies for payments_manager)
-- =========================================================
DROP POLICY IF EXISTS "Payments managers can view purchases" ON public.purchases;
CREATE POLICY "Payments managers can view purchases" ON public.purchases
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'payments_manager'));

DROP POLICY IF EXISTS "Payments managers can update purchases" ON public.purchases;
CREATE POLICY "Payments managers can update purchases" ON public.purchases
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'payments_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'payments_manager'));

DROP POLICY IF EXISTS "Payments managers can manage coupons" ON public.coupons;
CREATE POLICY "Payments managers can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'payments_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'payments_manager'));

DROP POLICY IF EXISTS "Payments managers can manage coupon books" ON public.coupon_books;
CREATE POLICY "Payments managers can manage coupon books" ON public.coupon_books
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'payments_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'payments_manager'));

DROP POLICY IF EXISTS "Payments managers can view donations" ON public.donations;
CREATE POLICY "Payments managers can view donations" ON public.donations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'payments_manager'));

DROP POLICY IF EXISTS "Payments managers can update donations" ON public.donations;
CREATE POLICY "Payments managers can update donations" ON public.donations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'payments_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'payments_manager'));

-- =========================================================
-- USERS AREA (additive policies for users_manager)
-- =========================================================
DROP POLICY IF EXISTS "Users managers can manage enquiries" ON public.contact_enquiries;
CREATE POLICY "Users managers can manage enquiries" ON public.contact_enquiries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'users_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'users_manager'));

DROP POLICY IF EXISTS "Users managers can manage team members" ON public.team_members;
CREATE POLICY "Users managers can manage team members" ON public.team_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'users_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'users_manager'));

DROP POLICY IF EXISTS "Users managers can manage team tasks" ON public.team_tasks;
CREATE POLICY "Users managers can manage team tasks" ON public.team_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'users_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'users_manager'));

-- Users managers can view all role assignments…
DROP POLICY IF EXISTS "Users managers can view roles" ON public.user_roles;
CREATE POLICY "Users managers can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'users_manager'));

-- …and assign / remove non-admin manager roles (never grant or revoke the super-admin role).
DROP POLICY IF EXISTS "Users managers can assign non-admin roles" ON public.user_roles;
CREATE POLICY "Users managers can assign non-admin roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'users_manager')
    AND role <> 'admin'::public.app_role
  );

DROP POLICY IF EXISTS "Users managers can remove non-admin roles" ON public.user_roles;
CREATE POLICY "Users managers can remove non-admin roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'users_manager')
    AND role <> 'admin'::public.app_role
  );
