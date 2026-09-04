import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

const MYSQL_USER = "AMRENDRA_gyandootnova";
const MYSQL_PASSWORD = "Amrendra_98746";
const MYSQL_DB = "gyandootnova";

/** Postgres literal */
function qPg(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (Array.isArray(v)) {
    const inner = v
      .map((x) => (x === null ? "NULL" : `"${String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`))
      .join(",");
    return `'{${inner.replace(/'/g, "''")}}'`;
  }
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** MySQL literal */
function qMy(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
}


function mysqlType(c) {
  const t = c.data_type;
  if (t === "ARRAY") return "JSON";
  if (t === "USER-DEFINED") return "VARCHAR(64)";
  if (t === "uuid") return "CHAR(36)";
  if (t === "text") return "LONGTEXT";
  if (t === "character varying") return c.character_maximum_length ? `VARCHAR(${c.character_maximum_length})` : "VARCHAR(255)";
  if (t === "character") return `CHAR(${c.character_maximum_length ?? 1})`;
  if (t === "integer") return "INT";
  if (t === "smallint") return "SMALLINT";
  if (t === "bigint") return "BIGINT";
  if (t === "numeric") return "DECIMAL(18,4)";
  if (t === "double precision" || t === "real") return "DOUBLE";
  if (t === "boolean") return "TINYINT(1)";
  if (t === "json" || t === "jsonb") return "JSON";
  if (t.startsWith("timestamp")) return "DATETIME(3)";
  if (t === "date") return "DATE";
  if (t.startsWith("time")) return "TIME";
  return "LONGTEXT";
}

function mysqlValue(v, c) {
  if (v === null || v === undefined) return "NULL";
  if (c.data_type === "ARRAY" || c.data_type === "json" || c.data_type === "jsonb") {
    return qMy(JSON.stringify(v));
  }
  if (c.data_type.startsWith("timestamp") && typeof v === "string") {
    return qMy(v.replace("T", " ").replace("Z", "").slice(0, 23));
  }
  return qMy(v);
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let dialect = (url.searchParams.get("dialect") || "").toLowerCase();
    if (!dialect && req.method === "POST") {
      try {
        const body = await req.json();
        dialect = String(body?.dialect || "").toLowerCase();
      } catch {
        // no body
      }
    }
    const isMySQL = dialect === "mysql";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers,
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers,
      });
    }

    const { data: schemaInfo, error: schemaErr } = await userClient.rpc("admin_export_schema");
    if (schemaErr) {
      return new Response(JSON.stringify({ error: "Access denied", details: schemaErr.message }), {
        status: 403,
        headers,
      });
    }

    const tables = (schemaInfo)?.tables ?? [];
    const ddl = (schemaInfo)?.ddl ?? "";

    let colsByTable = {};
    if (isMySQL) {
      const { data: colData, error: colErr } = await userClient.rpc("admin_export_columns");
      if (colErr) {
        return new Response(JSON.stringify({ error: "Access denied", details: colErr.message }), {
          status: 403,
          headers,
        });
      }
      for (const c of (colData) ?? []) {
        (colsByTable[c.table_name] ||= []).push(c);
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const stamp = new Date().toISOString();

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const push = (s) => controller.enqueue(enc.encode(s));

        if (isMySQL) {
          push(
            `-- Gyandoot Nova — full data export (MySQL 8+)\n-- Generated: ${stamp}\n` +
              `-- Restore: mysql -u '${MYSQL_USER}' -p < gyandoot-full-export-mysql.sql\n\n` +
              `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\nSET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n` +
              `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n` +
              `CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';\n` +
              `GRANT ALL PRIVILEGES ON \`${MYSQL_DB}\`.* TO '${MYSQL_USER}'@'%';\nFLUSH PRIVILEGES;\n` +
              `USE \`${MYSQL_DB}\`;\n\n-- =====================\n-- 1) TABLE STRUCTURE\n-- =====================\n\n`,
          );
          for (const table of tables) {
            const cols = colsByTable[table] ?? [];
            if (!cols.length) continue;
            const defs = cols.map(
              (c) => `  \`${c.column_name}\` ${mysqlType(c)}${c.is_nullable === "NO" ? " NOT NULL" : " NULL"}`,
            );
            const pk = cols.filter((c) => c.is_primary_key).map((c) => `\`${c.column_name}\``);
            if (pk.length) defs.push(`  PRIMARY KEY (${pk.join(", ")})`);
            push(`DROP TABLE IF EXISTS \`${table}\`;\n`);
            push(
              `CREATE TABLE \`${table}\` (\n${defs.join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`,
            );
          }
        } else {
          push(
            `-- Gyandoot Nova — full data export (PostgreSQL)\n-- Generated: ${stamp}\n` +
              `-- Portable SQL: run this file on any PostgreSQL-compatible database.\n\n` +
              `BEGIN;\n\n-- =====================\n-- 1) TABLE STRUCTURE\n-- =====================\n\n`,
          );
          push(ddl + "\n");
        }

        push(`-- =====================\n-- 2) DATA\n-- =====================\n\n`);

        for (const table of tables) {
          const meta = colsByTable[table];
          if (isMySQL && (!meta || !meta.length)) continue;
          push(`\n-- Table: ${table}\n`);
          let from = 0;
          const size = 500;
          let total = 0;
          for (;;) {
            const { data, error } = await admin.from(table).select("*").range(from, from + size - 1);
            if (error) {
              push(`-- ERROR reading ${table}: ${error.message}\n`);
              break;
            }
            if (!data || data.length === 0) break;
            for (const row of data) {
              if (isMySQL) {
                const cols = meta;
                const names = cols.map((c) => `\`${c.column_name}\``).join(", ");
                const vals = cols.map((c) => mysqlValue((row)[c.column_name], c)).join(", ");
                push(`INSERT INTO \`${table}\` (${names}) VALUES (${vals});\n`);
              } else {
                const cols = Object.keys(row);
                const vals = cols.map((c) => qPg((row)[c]));
                push(
                  `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")});\n`,
                );
              }
            }
            total += data.length;
            if (data.length < size) break;
            from += size;
          }
          push(`-- ${total} row(s) exported from ${table}\n`);
        }

        push(isMySQL ? `\nSET FOREIGN_KEY_CHECKS = 1;\n` : `\nCOMMIT;\n`);
        controller.close();
      },
    });

    const fname = isMySQL
      ? `gyandoot-full-export-mysql-${stamp.slice(0, 10)}.sql`
      : `gyandoot-full-export-${stamp.slice(0, 10)}.sql`;

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fname}"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers,
    });
  }
};

export default handler;
