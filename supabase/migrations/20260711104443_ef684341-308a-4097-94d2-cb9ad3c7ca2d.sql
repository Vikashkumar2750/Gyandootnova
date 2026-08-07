
-- =========================================
-- sales_events: funnel analytics
-- =========================================
CREATE TABLE public.sales_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  path TEXT,
  referrer TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_events_event_created ON public.sales_events (event, created_at DESC);
CREATE INDEX idx_sales_events_created ON public.sales_events (created_at DESC);
CREATE INDEX idx_sales_events_utm_source ON public.sales_events (utm_source) WHERE utm_source IS NOT NULL;

GRANT SELECT ON public.sales_events TO authenticated;
GRANT ALL ON public.sales_events TO service_role;

ALTER TABLE public.sales_events ENABLE ROW LEVEL SECURITY;

-- Only admins may read
CREATE POLICY "Admins can read sales events"
  ON public.sales_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Inserts happen only via the service-role edge function (`track-event`).
-- No INSERT policy for authenticated/anon; service_role bypasses RLS.

-- =========================================
-- book_reviews: reader reviews
-- =========================================
CREATE TABLE public.book_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  title TEXT,
  review TEXT NOT NULL,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT book_reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT book_reviews_unique_per_user_book UNIQUE (book_id, user_id)
);

CREATE INDEX idx_book_reviews_book_approved ON public.book_reviews (book_id, is_approved, created_at DESC);

GRANT SELECT ON public.book_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reviews TO authenticated;
GRANT ALL ON public.book_reviews TO service_role;

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved reviews"
  ON public.book_reviews FOR SELECT
  USING (is_approved = true OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own reviews"
  ON public.book_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own unapproved reviews"
  ON public.book_reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_approved = false)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON public.book_reviews FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can moderate all reviews"
  ON public.book_reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-set verified-purchase flag on insert
CREATE OR REPLACE FUNCTION public.set_review_verified_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_verified_purchase := EXISTS (
    SELECT 1 FROM public.purchases
    WHERE user_id = NEW.user_id
      AND book_id = NEW.book_id
      AND status = 'completed'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_book_reviews_verified
  BEFORE INSERT ON public.book_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_review_verified_purchase();

CREATE TRIGGER trg_book_reviews_updated_at
  BEFORE UPDATE ON public.book_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the first-time-buyer coupon if it doesn't already exist.
INSERT INTO public.coupons (code, description, discount_type, discount_value, is_active, min_order_amount, max_uses, used_count)
SELECT 'WELCOME10', 'First-time buyer 10% off', 'percent', 10, true, 0, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM public.coupons WHERE code = 'WELCOME10');
