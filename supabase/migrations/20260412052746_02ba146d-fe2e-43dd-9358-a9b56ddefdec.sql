
-- Add referral commission percent to books
ALTER TABLE public.books ADD COLUMN referral_commission_percent numeric NOT NULL DEFAULT 0;

-- Create referrals table
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id uuid NOT NULL,
  buyer_user_id uuid,
  book_id uuid NOT NULL,
  purchase_id uuid,
  commission_percent numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view own referrals
CREATE POLICY "Users can view own referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update referrals (approve/reject)
CREATE POLICY "Admins can update referrals"
ON public.referrals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts referrals (from edge function), allow authenticated insert too
CREATE POLICY "Authenticated can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
