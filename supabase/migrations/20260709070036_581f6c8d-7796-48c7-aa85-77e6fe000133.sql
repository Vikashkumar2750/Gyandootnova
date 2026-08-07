
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';

DROP FUNCTION IF EXISTS public.get_user_purchases(uuid);

CREATE OR REPLACE FUNCTION public.get_user_purchases(_user_id uuid)
RETURNS TABLE (
  id uuid,
  book_id uuid,
  status text,
  created_at timestamptz,
  amount numeric,
  currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, book_id, status, created_at, amount, currency
  FROM public.purchases
  WHERE user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_purchases(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_purchases(uuid) TO authenticated, service_role;
