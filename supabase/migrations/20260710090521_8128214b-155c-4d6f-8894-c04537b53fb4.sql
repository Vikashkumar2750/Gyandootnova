
CREATE OR REPLACE FUNCTION public.admin_db_storage_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_size bigint;
  v_tables jsonb;
  v_buckets jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT pg_database_size(current_database()) INTO v_db_size;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'size_bytes')::bigint DESC), '[]'::jsonb)
    INTO v_tables
  FROM (
    SELECT jsonb_build_object(
      'table', c.relname,
      'size_bytes', pg_total_relation_size(c.oid),
      'row_estimate', c.reltuples::bigint
    ) AS t
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) x;

  SELECT COALESCE(jsonb_agg(b ORDER BY (b->>'size_bytes')::bigint DESC NULLS LAST), '[]'::jsonb)
    INTO v_buckets
  FROM (
    SELECT jsonb_build_object(
      'bucket', bucket_id,
      'objects', count(*),
      'size_bytes', COALESCE(sum((metadata->>'size')::bigint), 0)
    ) AS b
    FROM storage.objects
    GROUP BY bucket_id
  ) y;

  RETURN jsonb_build_object(
    'database_size_bytes', v_db_size,
    'tables', v_tables,
    'buckets', v_buckets,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_db_storage_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_db_storage_stats() TO authenticated, service_role;
