CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Never publish content whose originality is unknown or below 95:
  -- defer it so the hourly originality sweep can score / rewrite it first.
  UPDATE public.posts
     SET scheduled_at = now() + interval '2 hours'
   WHERE publish_status = 'scheduled'
     AND scheduled_at IS NOT NULL
     AND scheduled_at <= now()
     AND COALESCE(originality_score, 0) < 95;

  -- Publish only verified-original content
  UPDATE public.posts
     SET approval_status = 'approved',
         reviewed_at     = COALESCE(reviewed_at, now()),
         publish_status  = 'published',
         is_published    = true
   WHERE publish_status = 'scheduled'
     AND scheduled_at IS NOT NULL
     AND scheduled_at <= now()
     AND originality_score >= 95;
END;
$function$;