DO $$
DECLARE cmd text;
BEGIN
  SELECT command INTO cmd FROM cron.job WHERE jobid = 23;
  cmd := replace(cmd, '{}', '{"force": true}');
  EXECUTE cmd;
END $$;