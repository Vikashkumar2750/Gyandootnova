-- Restore admin write access to book_chapters (INSERT/UPDATE/DELETE); RLS policies already restrict to admins.
GRANT INSERT, UPDATE, DELETE ON public.book_chapters TO authenticated;

-- Allow anonymous visitors to see chapter metadata (title, number) on public book pages.
-- Content column stays protected by column-level grants + get_chapter_content() RPC.
GRANT SELECT (id, book_id, title, slug, chapter_number, is_preview, created_at, updated_at)
  ON public.book_chapters TO anon;

DROP POLICY IF EXISTS "Anon can list chapter metadata" ON public.book_chapters;
CREATE POLICY "Anon can list chapter metadata"
  ON public.book_chapters
  FOR SELECT
  TO anon
  USING (true);
