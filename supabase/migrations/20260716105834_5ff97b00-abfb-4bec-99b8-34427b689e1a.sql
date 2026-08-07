
CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.posts
     SET approval_status = 'approved',
         reviewed_at     = COALESCE(reviewed_at, now()),
         publish_status  = 'published',
         is_published    = true
   WHERE publish_status = 'scheduled'
     AND scheduled_at IS NOT NULL
     AND scheduled_at <= now();
$function$;

SELECT public.publish_scheduled_posts();
