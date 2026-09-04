const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from '@supabase/supabase-js';
import mysql from "mysql2";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function mysqlType(c) {
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

function toMysqlValue(v, c) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (c.data_type.startsWith('timestamp') && typeof v === 'string') {
    return v.replace('T', ' ').replace('Z', '').slice(0, 23);
  }
  return v;
}

const handler = async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers,
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
    const action = body.action ?? 'test';
    const host = (body.host ?? '').toString().trim();
    const port = Number(body.port ?? 3306);
    if (!host) return json({ error: 'MySQL host required' }, 400);

    const conn = await mysql.createConnection({
      host,
      port,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectTimeout: 15000,
      multipleStatements: false,
    });

    try {
      if (action === 'test') {
        const [rows] = await conn.query('SELECT VERSION() AS version, DATABASE() AS db');
        return json({ ok: true, info: rows[0] });
      }

      // action === 'sync'
      const { data: cols, error: colErr } = await admin.rpc('admin_export_columns');
      if (colErr) throw new Error(colErr.message);

      const byTable = new Map();
      for (const c of (cols) ?? []) {
        if (!byTable.has(c.table_name)) byTable.set(c.table_name, []);
        byTable.get(c.table_name).push(c);
      }

      const report = {};
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
          const values = [];
          for (const r of rows) {
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
};

export default handler;
