
-- Allow guest checkout on purchases
ALTER TABLE public.purchases 
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS claim_token TEXT UNIQUE;

-- Replace unique constraint with partial indexes so guests can repurchase
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_user_id_book_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_book_unique 
  ON public.purchases (user_id, book_id) WHERE user_id IS NOT NULL;

-- Validation trigger: one of user_id / guest_email must be present
CREATE OR REPLACE FUNCTION public.validate_purchase_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND (NEW.guest_email IS NULL OR NEW.guest_email = '') THEN
    RAISE EXCEPTION 'Purchase must have either user_id or guest_email';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_purchase_identity ON public.purchases;
CREATE TRIGGER trg_validate_purchase_identity
  BEFORE INSERT OR UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.validate_purchase_identity();

-- Guest access RPC: allow the buyer to look up their purchase by claim_token
CREATE OR REPLACE FUNCTION public.get_guest_purchase_by_token(_token TEXT)
RETURNS TABLE (
  id uuid, book_id uuid, status text, amount numeric,
  guest_email text, guest_name text, created_at timestamptz,
  book_title text, book_slug text, book_cover text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.book_id, p.status, p.amount,
         p.guest_email, p.guest_name, p.created_at,
         b.title, b.slug, b.cover_url
  FROM public.purchases p
  JOIN public.books b ON b.id = p.book_id
  WHERE p.claim_token = _token AND p.status = 'completed';
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_purchase_by_token(text) TO anon, authenticated;

-- Guest download RPC: returns signed file URL for a completed guest purchase via claim_token
CREATE OR REPLACE FUNCTION public.get_guest_book_file_url(_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_book_id uuid;
  v_url text;
BEGIN
  SELECT book_id INTO v_book_id
  FROM public.purchases
  WHERE claim_token = _token AND status = 'completed';
  IF v_book_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or unclaimed token';
  END IF;
  SELECT file_url INTO v_url FROM public.book_files WHERE book_id = v_book_id;
  RETURN v_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_book_file_url(text) TO anon, authenticated;
