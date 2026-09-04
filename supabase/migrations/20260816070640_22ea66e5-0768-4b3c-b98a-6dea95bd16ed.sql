-- 1. Unpublish broken / off-topic thin articles
UPDATE public.posts
SET is_published = false, publish_status = 'draft', updated_at = now()
WHERE slug IN ('mind-pain-relief-while-negative-energy', 'Vashikaranmantra');

-- 2. Backfill missing meta_description from excerpt or content
UPDATE public.posts
SET meta_description = left(
      regexp_replace(
        regexp_replace(coalesce(nullif(excerpt, ''), content), '<[^>]*>', ' ', 'g'),
        '\s+', ' ', 'g'
      ), 155),
    updated_at = now()
WHERE (meta_description IS NULL OR meta_description = '')
  AND coalesce(nullif(excerpt, ''), content) IS NOT NULL;

-- 3. Backfill missing meta_title from title
UPDATE public.posts
SET meta_title = left(title, 60), updated_at = now()
WHERE (meta_title IS NULL OR meta_title = '') AND title IS NOT NULL;