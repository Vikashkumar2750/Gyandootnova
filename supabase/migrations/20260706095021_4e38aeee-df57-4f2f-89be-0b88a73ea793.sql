
CREATE TABLE IF NOT EXISTS public.seo_agent_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  severity text not null default 'normal',
  error_type text not null,
  provider text,
  http_status int,
  message text,
  step text,
  retry_count int default 0,
  recovered boolean not null default false,
  subject text,
  emailed boolean not null default false,
  extra jsonb
);
GRANT SELECT ON public.seo_agent_alerts TO authenticated;
GRANT ALL ON public.seo_agent_alerts TO service_role;
ALTER TABLE public.seo_agent_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view alerts" ON public.seo_agent_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.seo_provider_health (
  provider text primary key,
  consecutive_failures int not null default 0,
  last_error text,
  last_http_status int,
  paused_until timestamptz,
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.seo_provider_health TO authenticated;
GRANT ALL ON public.seo_provider_health TO service_role;
ALTER TABLE public.seo_provider_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view provider health" ON public.seo_provider_health FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_seo_agent_alerts_created ON public.seo_agent_alerts(created_at DESC);
