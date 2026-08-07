
-- Text highlights table
CREATE TABLE public.text_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.book_chapters(id) ON DELETE CASCADE,
  selected_text TEXT NOT NULL,
  start_offset INTEGER NOT NULL DEFAULT 0,
  end_offset INTEGER NOT NULL DEFAULT 0,
  paragraph_index INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.text_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own highlights" ON public.text_highlights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own highlights" ON public.text_highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own highlights" ON public.text_highlights FOR DELETE USING (auth.uid() = user_id);

-- Chapter notes table
CREATE TABLE public.chapter_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.book_chapters(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chapter_notes ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX chapter_notes_user_chapter_unique ON public.chapter_notes (user_id, chapter_id);

CREATE POLICY "Users can view own notes" ON public.chapter_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.chapter_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.chapter_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.chapter_notes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_chapter_notes_updated_at BEFORE UPDATE ON public.chapter_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bookmarks table
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.book_chapters(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL DEFAULT 1,
  chapter_title TEXT NOT NULL DEFAULT '',
  book_title TEXT NOT NULL DEFAULT '',
  book_slug TEXT NOT NULL DEFAULT '',
  chapter_slug TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX bookmarks_user_chapter_unique ON public.bookmarks (user_id, chapter_id);

CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);
