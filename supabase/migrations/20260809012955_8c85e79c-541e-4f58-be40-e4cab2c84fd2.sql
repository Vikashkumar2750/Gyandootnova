CREATE OR REPLACE FUNCTION public.admin_export_schema()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tables jsonb;
  v_ddl text := '';
  r record;
  c record;
  cols text;
  pk text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(jsonb_agg(t.table_name ORDER BY t.table_name), '[]'::jsonb)
    INTO v_tables
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE';

  FOR r IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    cols := '';
    FOR c IN
      SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.table_name
      ORDER BY ordinal_position
    LOOP
      cols := cols || format(
        E'  %I %s%s%s,\n',
        c.column_name,
        CASE
          WHEN c.data_type = 'USER-DEFINED' THEN 'text'
          WHEN c.data_type = 'ARRAY' THEN 'text[]'
          WHEN c.data_type = 'character varying' AND c.character_maximum_length IS NOT NULL
            THEN format('varchar(%s)', c.character_maximum_length)
          ELSE c.data_type
        END,
        CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        CASE
          WHEN c.column_default IS NULL THEN ''
          WHEN c.column_default LIKE 'nextval%' THEN ''
          WHEN c.column_default LIKE 'gen_random_uuid%' THEN ''
          WHEN c.column_default LIKE '%::%' THEN ''
          WHEN c.column_default IN ('now()', 'true', 'false') THEN ' DEFAULT ' || c.column_default
          ELSE ''
        END
      );
    END LOOP;

    SELECT string_agg(format('%I', a.attname), ', ' ORDER BY x.ord)
      INTO pk
    FROM pg_constraint con
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS x(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = x.attnum
    WHERE con.contype = 'p'
      AND con.conrelid = format('public.%I', r.table_name)::regclass;

    v_ddl := v_ddl
      || format(E'CREATE TABLE IF NOT EXISTS %I (\n', r.table_name)
      || cols
      || COALESCE(format(E'  PRIMARY KEY (%s)\n', pk), E'  PRIMARY KEY_PLACEHOLDER\n')
      || E');\n\n';
  END LOOP;

  v_ddl := replace(v_ddl, E'  PRIMARY KEY_PLACEHOLDER\n', '');
  v_ddl := regexp_replace(v_ddl, E',\\n\\);', E'\n);', 'g');

  RETURN jsonb_build_object('tables', v_tables, 'ddl', v_ddl);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_export_schema() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_export_schema() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_export_schema() TO service_role;