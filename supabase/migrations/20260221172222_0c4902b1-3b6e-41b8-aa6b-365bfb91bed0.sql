-- Add category column to books table
ALTER TABLE public.books ADD COLUMN category text DEFAULT NULL;

-- Add index for category filtering
CREATE INDEX idx_books_category ON public.books(category);

-- Add full-text search index on title
CREATE INDEX idx_books_title_search ON public.books USING gin(to_tsvector('simple', title));