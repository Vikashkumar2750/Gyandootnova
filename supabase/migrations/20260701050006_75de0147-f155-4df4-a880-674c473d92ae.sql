DROP POLICY IF EXISTS "Authenticated can read ai_cache" ON public.ai_cache;
DROP POLICY IF EXISTS "Anyone can read ai_cache" ON public.ai_cache;

REVOKE SELECT ON public.ai_cache FROM anon;
REVOKE SELECT ON public.ai_cache FROM authenticated;

CREATE POLICY "Admins can read ai_cache"
ON public.ai_cache FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.ai_cache TO authenticated;