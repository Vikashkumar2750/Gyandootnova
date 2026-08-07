
-- Fix the overly permissive donations insert policy
-- Allow both authenticated users (with user_id) and anonymous donations (without user_id)
DROP POLICY "Anyone can insert donations" ON public.donations;
CREATE POLICY "Authenticated users can insert donations" ON public.donations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anonymous donations allowed" ON public.donations FOR INSERT TO anon WITH CHECK (user_id IS NULL);
