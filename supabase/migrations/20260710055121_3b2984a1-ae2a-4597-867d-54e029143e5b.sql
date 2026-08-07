
CREATE TABLE public.visitor_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  timezone TEXT,
  isp TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  landing_path TEXT,
  language TEXT,
  screen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.visitor_logs TO anon;
GRANT SELECT, INSERT ON public.visitor_logs TO authenticated;
GRANT ALL ON public.visitor_logs TO service_role;

ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visitor log"
  ON public.visitor_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view visitor logs"
  ON public.visitor_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_visitor_logs_created_at ON public.visitor_logs (created_at DESC);
CREATE INDEX idx_visitor_logs_country ON public.visitor_logs (country);
