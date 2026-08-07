-- Prevent any user (including Super Admins) from modifying their own user_roles rows.
-- Another Super Admin can still change them.

DROP POLICY IF EXISTS "No self role modification insert" ON public.user_roles;
DROP POLICY IF EXISTS "No self role modification update" ON public.user_roles;
DROP POLICY IF EXISTS "No self role modification delete" ON public.user_roles;

CREATE POLICY "No self role modification insert"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id <> auth.uid());

CREATE POLICY "No self role modification update"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (user_id <> auth.uid())
WITH CHECK (user_id <> auth.uid());

CREATE POLICY "No self role modification delete"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (user_id <> auth.uid());