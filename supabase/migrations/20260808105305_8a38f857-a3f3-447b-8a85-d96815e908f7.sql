DO $$
DECLARE
  tok text := 'bcac0820840ebd2423d76d5eb358e2cb14c0353aadbecf48';
  base text := 'https://vrzngahawxtbpwrgxtmb.supabase.co/functions/v1/';
  hdr text := format('{"Content-Type":"application/json","x-cron-secret":"%s"}', 'bcac0820840ebd2423d76d5eb358e2cb14c0353aadbecf48');
BEGIN
  PERFORM cron.schedule('seo-blog-agent-daily', '30 3 * * *', format($f$SELECT net.http_post(url:='%sseo-blog-agent', headers:='%s'::jsonb, body:='{"scheduled":true,"publish_status":"scheduled"}'::jsonb);$f$, base, hdr));
  PERFORM cron.schedule('seo-agent-health-report-daily', '30 2 * * *', format($f$SELECT net.http_post(url:='%sseo-agent-health-report', headers:='%s'::jsonb, body:='{"source":"cron"}'::jsonb);$f$, base, hdr));
  PERFORM cron.schedule('seo-daily-publisher-9am', '30 3 * * *', format($f$SELECT net.http_post(url:='%sseo-daily-publisher', headers:='%s'::jsonb, body:='{"source":"cron"}'::jsonb);$f$, base, hdr));
  PERFORM cron.schedule('seo-queue-topup-6h', '0 */6 * * *', format($f$SELECT net.http_post(url:='%sseo-queue-topup', headers:='%s'::jsonb, body:='{"source":"cron"}'::jsonb);$f$, base, hdr));
  PERFORM cron.schedule('seo-book-kb-weekly', '30 21 * * 6', format($f$SELECT net.http_post(url:='%sseo-book-kb-refresh', headers:='%s'::jsonb, body:='{"source":"cron"}'::jsonb);$f$, base, hdr));
  PERFORM cron.schedule('seo-auto-rewrite-hourly', '15 * * * *', format($f$SELECT net.http_post(url:='%sseo-auto-rewrite', headers:='%s'::jsonb, body:='{"sweep":true,"threshold":92,"max_attempts":2}'::jsonb);$f$, base, hdr));
END $$;