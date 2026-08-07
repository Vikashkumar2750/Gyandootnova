
REVOKE ALL ON FUNCTION public.submit_post_for_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_chapter_for_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_post(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_chapter(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enforce_post_publish_approval() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.track_content_edit() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_post_for_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_chapter_for_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_post(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_chapter(uuid, text, text) TO authenticated;
