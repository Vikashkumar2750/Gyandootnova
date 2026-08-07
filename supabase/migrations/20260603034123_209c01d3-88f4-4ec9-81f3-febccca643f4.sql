
-- 1. Provider config table
CREATE TABLE public.otp_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('sms','whatsapp','email')),
  provider_name text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX otp_providers_one_active_per_channel
  ON public.otp_providers(channel) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.otp_providers TO authenticated;
GRANT ALL ON public.otp_providers TO service_role;

ALTER TABLE public.otp_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage otp_providers" ON public.otp_providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER otp_providers_updated_at
  BEFORE UPDATE ON public.otp_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Phone OTPs table
CREATE TABLE public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms','whatsapp','email')),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX phone_otps_phone_idx ON public.phone_otps(phone, used, created_at DESC);

GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
-- No policies: only service-role (edge functions) reads/writes.

-- 3. Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles(phone) WHERE phone IS NOT NULL;
