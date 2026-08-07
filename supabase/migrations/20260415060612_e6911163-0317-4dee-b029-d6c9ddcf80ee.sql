
-- Drop overly permissive storage policies for book-covers bucket
DROP POLICY IF EXISTS "Authenticated users can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update covers" ON storage.objects;

-- Tighten ai_cache INSERT policy: only service role should insert (service role bypasses RLS anyway)
-- Replace the overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role inserts ai_cache" ON storage.objects;
DROP POLICY IF EXISTS "Service role inserts ai_cache" ON public.ai_cache;
CREATE POLICY "Only service role inserts ai_cache"
ON public.ai_cache FOR INSERT
TO authenticated
WITH CHECK (false);

-- Tighten ai_logs INSERT policy
DROP POLICY IF EXISTS "Service role inserts ai_logs" ON public.ai_logs;
CREATE POLICY "Only service role inserts ai_logs"
ON public.ai_logs FOR INSERT
TO authenticated
WITH CHECK (false);
