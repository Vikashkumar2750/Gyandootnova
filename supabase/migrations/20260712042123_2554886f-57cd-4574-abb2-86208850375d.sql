-- Remove the wide-open anon insert policy on visitor_logs.
-- Inserts now go through the track-visit edge function using the service role.
DROP POLICY IF EXISTS "Anyone can insert visitor log" ON public.visitor_logs;