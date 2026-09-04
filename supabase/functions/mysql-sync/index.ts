import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import mysql from 'npm:mysql2@3.11.0/promise';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Col = {
  table_name: string;
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  character_maximum_length: number | null;
  is_primary_key: boolean;
};

function mysqlType(c: Col): string {
  const t = c.data_type;
  switch (t) {
    case 'uuid':
      return 'CHAR(36)';
    case 'text':
    case 'ARRAY':
    case 'USER-DEFINED':
    case 'json':
    case 'jsonb':
      return 'LONGTEXT';
    case 'character varying':
      return c.character_maximum_length ? `VARCHAR(${c.character_maximum_length})` : 'VARCHAR(255)';
    case 'boolean':
      return 'TINYINT(1)';
    case 'integer':
      return 'INT';
    case 'smallint':
      return 'SMALLINT';
    case 'bigint':
      return 'BIGINT';
    case 'numeric':
      return 'DECIMAL(18,4)';
    case 'double precision':
    case 'real':
      return 'DOUBLE';
    case 'timestamp with time zone':
    case 'timestamp without time zone':
      return 'DATETIME(3)';
    case 'date':
      return 'DATE';
    case 'time without time zone':
      return 'TIME';
    default:
      return 'LONGTEXT';
  }
}

function toMysqlValue(v: unknown, c: Col) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (c.data_type.startsWith('timestamp') && typeof v === 'string') {
    return v.replace('T', ' ').replace('Z', '').slice(0, 23);
  }
  return v;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Access denied' }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? 'test';
    const host: string = (body.host ?? '').toString().trim();
    const port: number = Number(body.port ?? 3306);
    if (!host) return json({ error: 'MySQL host required' }, 400);

    const conn = await mysql.createConnection({
      host,
      port,
      user: Deno.env.get('MYSQL_USER')!,
      password: Deno.env.get('MYSQL_PASSWORD')!,
      database: Deno.env.get('MYSQL_DATABASE')!,
      connectTimeout: 15000,
      multipleStatements: false,
    });

    try {
      if (action === 'test') {
        const [rows] = await conn.query('SELECT VERSION() AS version, DATABASE() AS db');
        return json({ ok: true, info: (rows as any[])[0] });
      }

      // action === 'sync'
      const { data: cols, error: colErr } = await admin.rpc('admin_export_columns');
      if (colErr) throw new Error(colErr.message);

      const byTable = new Map<string, Col[]>();
      for (const c of (cols as Col[]) ?? []) {
        if (!byTable.has(c.table_name)) byTable.set(c.table_name, []);
        byTable.get(c.table_name)!.push(c);
      }

      const report: Record<string, number> = {};
      await conn.query('SET FOREIGN_KEY_CHECKS=0');

      for (const [table, columns] of byTable) {
        columns.sort((a, b) => a.ordinal_position - b.ordinal_position);
        const defs = columns.map(
          (c) => `\`${c.column_name}\` ${mysqlType(c)}${c.is_nullable === 'NO' ? ' NOT NULL' : ' NULL'}`,
        );
        const pk = columns.filter((c) => c.is_primary_key).map((c) => `\`${c.column_name}\``);
        if (pk.length) defs.push(`PRIMARY KEY (${pk.join(', ')})`);
        await conn.query(
          `CREATE TABLE IF NOT EXISTS \`${table}\` (${defs.join(', ')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        );

        // pull rows in pages
        let from = 0;
        const page = 500;
        let total = 0;
        while (true) {
          const { data: rows, error } = await admin
            .from(table)
            .select('*')
            .range(from, from + page - 1);
          if (error) throw new Error(`${table}: ${error.message}`);
          if (!rows || rows.length === 0) break;

          const colNames = columns.map((c) => c.column_name);
          const placeholders = `(${colNames.map(() => '?').join(', ')})`;
          const values: unknown[] = [];
          for (const r of rows as Record<string, unknown>[]) {
            for (const c of columns) values.push(toMysqlValue(r[c.column_name], c));
          }
          const sql = `REPLACE INTO \`${table}\` (${colNames
            .map((n) => `\`${n}\``)
            .join(', ')}) VALUES ${rows.map(() => placeholders).join(', ')}`;
          await conn.query(sql, values);

          total += rows.length;
          if (rows.length < page) break;
          from += page;
        }
        report[table] = total;
      }

      await conn.query('SET FOREIGN_KEY_CHECKS=1');
      return json({ ok: true, tables: Object.keys(report).length, rows: report });
    } finally {
      await conn.end().catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('mysql-sync failed:', msg);
    return json({ error: msg }, 500);
  }
});
