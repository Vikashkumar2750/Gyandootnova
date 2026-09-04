CREATE TABLE IF NOT EXISTS public.seo_report_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date date NOT NULL,
  kind text NOT NULL DEFAULT 'daily-seo',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_date, kind)
);

GRANT ALL ON public.seo_report_runs TO service_role;
ALTER TABLE public.seo_report_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view seo report runs" ON public.seo_report_runs;
CREATE POLICY "Admins can view seo report runs"
ON public.seo_report_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.seo_report_runs TO authenticated;

DO $$
DECLARE
  base text := 'https://vrzngahawxtbpwrgxtmb.supabase.co/functions/v1/';
  hdr text := format('{"Content-Type":"application/json","x-cron-secret":"%s"}', 'bcac0820840ebd2423d76d5eb358e2cb14c0353aadbecf48');
BEGIN
  -- only ONE SEO report email per day: retire the old 08:00 IST health report mail
  PERFORM cron.unschedule('seo-agent-health-report-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
DECLARE
  base text := 'https://vrzngahawxtbpwrgxtmb.supabase.co/functions/v1/';
  hdr text := format('{"Content-Type":"application/json","x-cron-secret":"%s"}', 'bcac0820840ebd2423d76d5eb358e2cb14c0353aadbecf48');
BEGIN
  BEGIN PERFORM cron.unschedule('seo-daily-report-5pm-ist'); EXCEPTION WHEN OTHERS THEN NULL; END;
  -- 11:30 UTC = 17:00 IST
  PERFORM cron.schedule('seo-daily-report-5pm-ist', '30 11 * * *',
    format($f$SELECT net.http_post(url:='%sseo-daily-report', headers:='%s'::jsonb, body:='{"source":"cron"}'::jsonb);$f$, base, hdr));
END $$;