-- Prevent readers from self-approving book reviews.
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "Users can update their own unapproved reviews" ON public.book_reviews;

CREATE POLICY "Users can insert their own reviews"
ON public.book_reviews
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND is_approved = false);

CREATE POLICY "Users can update their own unapproved reviews"
ON public.book_reviews
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND is_approved = false)
WITH CHECK (user_id = auth.uid() AND is_approved = false);