DO $$
DECLARE
  base text := 'https://vrzngahawxtbpwrgxtmb.supabase.co/functions/v1/';
  hdr text := format('{"Content-Type":"application/json","x-cron-secret":"%s"}', 'bcac0820840ebd2423d76d5eb358e2cb14c0353aadbecf48');
BEGIN
  PERFORM cron.unschedule('seo-rank-optimizer-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
DECLARE
  base text := 'https://vrzngahawxtbpwrgxtmb.supabase.co/functions/v1/';
  hdr text := format('{"Content-Type":"application/json","x-cron-secret":"%s"}', 'bcac0820840ebd2423d76d5eb358e2cb14c0353aadbecf48');
BEGIN
  PERFORM cron.schedule(
    'seo-rank-optimizer-daily',
    '0 1 * * *',
    format($f$SELECT net.http_post(url:='%sseo-rank-optimizer', headers:='%s'::jsonb, body:='{"source":"cron","limit":5}'::jsonb);$f$, base, hdr)
  );
END $$;