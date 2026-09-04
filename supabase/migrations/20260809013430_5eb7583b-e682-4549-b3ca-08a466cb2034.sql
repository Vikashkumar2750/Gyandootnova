CREATE OR REPLACE FUNCTION public.admin_export_columns()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'table_name', (x->>'ordinal_position')::int), '[]'::jsonb)
    INTO v
  FROM (
    SELECT jsonb_build_object(
      'table_name', c.table_name,
      'column_name', c.column_name,
      'ordinal_position', c.ordinal_position,
      'data_type', c.data_type,
      'udt_name', c.udt_name,
      'is_nullable', c.is_nullable,
      'character_maximum_length', c.character_maximum_length,
      'is_primary_key', EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN LATERAL unnest(con.conkey) AS k(attnum) ON true
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
        WHERE con.contype = 'p'
          AND con.conrelid = format('public.%I', c.table_name)::regclass
          AND a.attname = c.column_name
      )
    ) AS x
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
  ) s;

  RETURN v;
END;
$$;