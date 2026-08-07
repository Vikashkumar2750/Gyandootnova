
-- =========================================================
-- 1. New enums
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.approval_status_t AS ENUM
    ('draft','pending_review','flagged','approved','rejected','needs_rewrite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.source_type_t AS ENUM
    ('original','translation','public_domain','licensed','quoted_excerpt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2. Extend posts
-- =========================================================
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS source_type public.source_type_t DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS source_citation text,
  ADD COLUMN IF NOT EXISTS permission_notes text,
  ADD COLUMN IF NOT EXISTS originality_score numeric,
  ADD COLUMN IF NOT EXISTS originality_report jsonb,
  ADD COLUMN IF NOT EXISTS originality_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status_t NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;

-- Backfill: existing published posts are treated as approved (grandfathered)
UPDATE public.posts
   SET approval_status = 'approved'
 WHERE is_published = true
   AND approval_status = 'draft';

-- =========================================================
-- 3. Extend book_chapters
-- =========================================================
ALTER TABLE public.book_chapters
  ADD COLUMN IF NOT EXISTS source_type public.source_type_t DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS source_citation text,
  ADD COLUMN IF NOT EXISTS permission_notes text,
  ADD COLUMN IF NOT EXISTS originality_score numeric,
  ADD COLUMN IF NOT EXISTS originality_report jsonb,
  ADD COLUMN IF NOT EXISTS originality_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status_t NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;

-- =========================================================
-- 4. Publish gate trigger for posts
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_post_publish_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when transitioning to published
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    IF NEW.approval_status <> 'approved' THEN
      RAISE EXCEPTION 'Cannot publish: content is not approved (current status: %)', NEW.approval_status;
    END IF;
  END IF;

  IF NEW.publish_status = 'published' AND (OLD IS NULL OR OLD.publish_status <> 'published') THEN
    IF NEW.approval_status <> 'approved' THEN
      RAISE EXCEPTION 'Cannot publish: content is not approved (current status: %)', NEW.approval_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_post_publish_approval_trg ON public.posts;
CREATE TRIGGER enforce_post_publish_approval_trg
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_post_publish_approval();

-- =========================================================
-- 5. Content audit log table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.content_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('post','chapter','book')),
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  actor_email text,
  notes text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_audit_log_entity
  ON public.content_audit_log (entity_type, entity_id, created_at DESC);

GRANT SELECT, INSERT ON public.content_audit_log TO authenticated;
GRANT ALL ON public.content_audit_log TO service_role;

ALTER TABLE public.content_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all audit rows" ON public.content_audit_log;
CREATE POLICY "Admins can view all audit rows"
  ON public.content_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authors see their own audit rows" ON public.content_audit_log;
CREATE POLICY "Authors see their own audit rows"
  ON public.content_audit_log
  FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert audit rows" ON public.content_audit_log;
CREATE POLICY "Authenticated users can insert audit rows"
  ON public.content_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 6. Helper RPCs used by the app / edge function
-- =========================================================

-- Submit a post for review (author or admin)
CREATE OR REPLACE FUNCTION public.submit_post_for_review(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.posts
     SET approval_status = 'pending_review',
         last_edited_by  = auth.uid(),
         last_edited_at  = now()
   WHERE id = _post_id;

  INSERT INTO public.content_audit_log (entity_type, entity_id, action, actor_id, notes)
  VALUES ('post', _post_id, 'submitted', auth.uid(), 'Submitted for review');
END;
$$;

-- Admin decision on a post
CREATE OR REPLACE FUNCTION public.review_post(
  _post_id uuid,
  _decision text,     -- 'approved' | 'rejected' | 'needs_rewrite'
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status public.approval_status_t;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _decision NOT IN ('approved','rejected','needs_rewrite') THEN
    RAISE EXCEPTION 'Invalid decision: %', _decision;
  END IF;

  new_status := _decision::public.approval_status_t;

  UPDATE public.posts
     SET approval_status = new_status,
         approval_notes  = _notes,
         reviewed_by     = auth.uid(),
         reviewed_at     = now()
   WHERE id = _post_id;

  INSERT INTO public.content_audit_log (entity_type, entity_id, action, actor_id, notes)
  VALUES ('post', _post_id, _decision, auth.uid(), _notes);
END;
$$;

-- Same pair for book chapters
CREATE OR REPLACE FUNCTION public.submit_chapter_for_review(_chapter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.book_chapters
     SET approval_status = 'pending_review',
         last_edited_by  = auth.uid(),
         last_edited_at  = now()
   WHERE id = _chapter_id;

  INSERT INTO public.content_audit_log (entity_type, entity_id, action, actor_id, notes)
  VALUES ('chapter', _chapter_id, 'submitted', auth.uid(), 'Submitted for review');
END;
$$;

CREATE OR REPLACE FUNCTION public.review_chapter(
  _chapter_id uuid,
  _decision text,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status public.approval_status_t;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _decision NOT IN ('approved','rejected','needs_rewrite') THEN
    RAISE EXCEPTION 'Invalid decision: %', _decision;
  END IF;

  new_status := _decision::public.approval_status_t;

  UPDATE public.book_chapters
     SET approval_status = new_status,
         approval_notes  = _notes,
         reviewed_by     = auth.uid(),
         reviewed_at     = now()
   WHERE id = _chapter_id;

  INSERT INTO public.content_audit_log (entity_type, entity_id, action, actor_id, notes)
  VALUES ('chapter', _chapter_id, _decision, auth.uid(), _notes);
END;
$$;

-- =========================================================
-- 7. Track last-edited on any update
-- =========================================================
CREATE OR REPLACE FUNCTION public.track_content_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
       NEW.content IS DISTINCT FROM OLD.content
    OR NEW.title   IS DISTINCT FROM OLD.title
  ) THEN
    NEW.last_edited_by := COALESCE(auth.uid(), NEW.last_edited_by);
    NEW.last_edited_at := now();
    -- Any edit after approval sends it back for review
    IF OLD.approval_status = 'approved' THEN
      NEW.approval_status := 'draft';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_post_edit_trg ON public.posts;
CREATE TRIGGER track_post_edit_trg
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.track_content_edit();

DROP TRIGGER IF EXISTS track_chapter_edit_trg ON public.book_chapters;
CREATE TRIGGER track_chapter_edit_trg
BEFORE UPDATE ON public.book_chapters
FOR EACH ROW EXECUTE FUNCTION public.track_content_edit();
