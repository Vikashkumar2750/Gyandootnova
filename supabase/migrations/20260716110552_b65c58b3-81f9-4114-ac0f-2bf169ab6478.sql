-- Re-approve any posts that were auto-rewritten but silently pushed back to draft
-- by the track_content_edit trigger. These are the ones with rewrite_count > 0
-- that are still marked as published but no longer visible on the site.
UPDATE public.posts
   SET approval_status = 'approved',
       reviewed_at     = COALESCE(reviewed_at, now()),
       publish_status  = 'published',
       is_published    = true
 WHERE rewrite_count > 0
   AND approval_status <> 'approved';