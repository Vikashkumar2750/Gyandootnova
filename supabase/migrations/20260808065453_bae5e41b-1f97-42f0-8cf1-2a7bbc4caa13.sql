UPDATE public.books SET cover_url = NULL WHERE cover_url IS NOT NULL AND (btrim(cover_url) = '' OR lower(cover_url) ~ '\.(docx?|pdf|txt|xlsx?)$');

UPDATE public.posts
SET approval_status = 'approved',
    is_published = true,
    scheduled_at = NULL
WHERE is_published = false AND approval_status IN ('draft','pending_review');