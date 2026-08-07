
-- 1. Fix donations: Allow users to view their own donations directly
CREATE POLICY "Users can view own donations"
ON public.donations
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Fix purchases: Allow users to view their own purchases directly
CREATE POLICY "Users can view own purchases"
ON public.purchases
FOR SELECT
USING (auth.uid() = user_id);

-- 3. Fix user_roles: Add explicit deny policies for INSERT/UPDATE/DELETE (only admins)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix books: Remove file_url from public SELECT by restricting it
-- We'll create a view approach: update the books RLS to hide file_url for non-purchasers
-- Actually, the better approach is to null out file_url in the query at application level
-- Since we can't conditionally hide columns via RLS, we handle this in code

-- 5. Fix coupons: Remove public SELECT policy and rely on RPC only
DROP POLICY IF EXISTS "Public can validate active coupons" ON public.coupons;
