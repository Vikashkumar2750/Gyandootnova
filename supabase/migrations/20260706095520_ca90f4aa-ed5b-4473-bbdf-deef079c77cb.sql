
CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
  provider text primary key,
  enabled boolean not null default true,
  priority int not null default 100,
  encrypted_key text,
  key_last4 text,
  connection_status text,
  last_tested_at timestamptz,
  last_error text,
  remaining_credits text,
  health_status text default 'unknown',
  updated_at timestamptz not null default now(),
  updated_by uuid
);
GRANT SELECT ON public.ai_provider_settings TO authenticated;
GRANT ALL ON public.ai_provider_settings TO service_role;
ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view ai_provider_settings" ON public.ai_provider_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.ai_provider_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text,
  action text not null,
  admin_user_id uuid,
  admin_email text,
  ip_address text,
  user_agent text,
  status text,
  details jsonb
);
GRANT SELECT ON public.ai_provider_audit_logs TO authenticated;
GRANT ALL ON public.ai_provider_audit_logs TO service_role;
ALTER TABLE public.ai_provider_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view ai_provider_audit_logs" ON public.ai_provider_audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ai_provider_audit_logs_created ON public.ai_provider_audit_logs(created_at DESC);

INSERT INTO public.ai_provider_settings (provider, enabled, priority) VALUES
  ('anthropic', true, 10),
  ('openai',    true, 20),
  ('tavily',    true, 30),
  ('exa',       true, 40),
  ('firecrawl', true, 50),
  ('serpapi',   true, 60)
ON CONFLICT (provider) DO NOTHING;
