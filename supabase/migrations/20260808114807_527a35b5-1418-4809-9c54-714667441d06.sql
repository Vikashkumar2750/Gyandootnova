select cron.unschedule(jobname) from cron.job where jobname in ('seo-editorial-agent-am','seo-editorial-agent-pm');

select cron.schedule('seo-editorial-agent-am','30 1 * * *', $$
SELECT net.http_post(
  url:='https://vrzngahawxtbpwrgxtmb.supabase.co/functions/v1/seo-editorial-agent',
  headers:='{"Content-Type":"application/json","x-cron-secret":"bcac0820840ebd2423d76d5eb358e2cb14c0353aadbecf48"}'::jsonb,
  body:='{"publish":true,"source":"cron-am"}'::jsonb);
$$);

select cron.schedule('seo-editorial-agent-pm','30 13 * * *', $$
SELECT net.http_post(
  url:='https://vrzngahawxtbpwrgxtmb.supabase.co/functions/v1/seo-editorial-agent',
  headers:='{"Content-Type":"application/json","x-cron-secret":"bcac0820840ebd2423d76d5eb358e2cb14c0353aadbecf48"}'::jsonb,
  body:='{"publish":true,"source":"cron-pm"}'::jsonb);
$$);