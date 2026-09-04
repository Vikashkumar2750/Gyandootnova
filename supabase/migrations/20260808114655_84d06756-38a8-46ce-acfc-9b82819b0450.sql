select cron.unschedule(jobname) from cron.job where jobname in ('seo-editorial-agent-am','seo-editorial-agent-pm');

select cron.schedule('seo-editorial-agent-am','30 2 * * *', $$
select net.http_post(
  url := 'https://vrzngahawxtbpwrgxtmb.supabase.co/functions/v1/seo-editorial-agent',
  headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', current_setting('app.seo_cron_token', true)),
  body := '{"publish":true}'::jsonb
);
$$);

select cron.schedule('seo-editorial-agent-pm','30 12 * * *', $$
select net.http_post(
  url := 'https://vrzngahawxtbpwrgxtmb.supabase.co/functions/v1/seo-editorial-agent',
  headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', current_setting('app.seo_cron_token', true)),
  body := '{"publish":true}'::jsonb
);
$$);