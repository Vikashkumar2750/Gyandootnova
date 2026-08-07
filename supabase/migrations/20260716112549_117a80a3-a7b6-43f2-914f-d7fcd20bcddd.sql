
CREATE OR REPLACE FUNCTION public.force_review_unapproved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may set any value; everyone else is forced to is_approved = false
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.is_approved := false;
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_review_unapproved_ins ON public.book_reviews;
DROP TRIGGER IF EXISTS trg_force_review_unapproved_upd ON public.book_reviews;

CREATE TRIGGER trg_force_review_unapproved_ins
  BEFORE INSERT ON public.book_reviews
  FOR EACH ROW EXECUTE FUNCTION public.force_review_unapproved();

CREATE TRIGGER trg_force_review_unapproved_upd
  BEFORE UPDATE ON public.book_reviews
  FOR EACH ROW EXECUTE FUNCTION public.force_review_unapproved();
