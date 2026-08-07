
DROP POLICY "Authenticated can insert referrals" ON public.referrals;

CREATE POLICY "Service and auth can insert referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referrer_user_id OR has_role(auth.uid(), 'admin'::app_role));
