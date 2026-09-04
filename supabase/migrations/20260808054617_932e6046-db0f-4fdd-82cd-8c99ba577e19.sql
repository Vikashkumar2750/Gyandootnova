ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS payment_gateway text NOT NULL DEFAULT 'razorpay';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_gateway text NOT NULL DEFAULT 'razorpay';
UPDATE public.purchases SET payment_gateway = 'razorpay' WHERE payment_gateway IS NULL;
UPDATE public.purchases SET currency = 'INR' WHERE currency IS NULL;