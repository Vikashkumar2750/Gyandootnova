
-- Sanitize existing bad slugs: strip ? # & and other unsafe punctuation, collapse whitespace to '-', lowercase ASCII
UPDATE public.posts
SET slug = regexp_replace(
             regexp_replace(
               regexp_replace(lower(slug), '[?#&!()."''`,:;]+', '', 'g'),
               '\s+', '-', 'g'
             ),
             '-+', '-', 'g'
           )
WHERE slug ~ '[ ?#&!()."''`,:;]';

-- Trim trailing/leading dashes
UPDATE public.posts SET slug = trim(both '-' from slug) WHERE slug LIKE '-%' OR slug LIKE '%-';
