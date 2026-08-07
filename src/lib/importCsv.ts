import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Minimal RFC-4180 CSV parser (handles quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  // strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.length > 1 || cur[0] !== "") rows.push(cur);
        cur = [];
      } else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, idx) => { o[h] = r[idx] ?? ""; });
    return o;
  });
}

/** Coerce stringy values from CSV into proper JS types for Supabase. */
function coerce(v: string): unknown {
  if (v === "" || v === "null" || v === "NULL") return null;
  // JSON (object/array)
  if ((v.startsWith("{") && v.endsWith("}")) || (v.startsWith("[") && v.endsWith("]"))) {
    try { return JSON.parse(v); } catch { /* fallthrough */ }
  }
  if (v === "true") return true;
  if (v === "false") return false;
  // numbers (avoid converting ids that look numeric-but-are-uuid; uuids contain '-')
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d+\.\d+$/.test(v)) return Number(v);
  return v;
}

type ImportOptions = {
  table: string;
  /** Columns to drop before upsert (computed/read-only). */
  dropColumns?: string[];
  /** Conflict target for upsert. Default: "id". */
  onConflict?: string;
};

export async function importCsvIntoTable(file: File, opts: ImportOptions) {
  const tid = toast.loading("Uploading & importing…");
  try {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) { toast.error("CSV खाली है", { id: tid }); return; }

    const drop = new Set(opts.dropColumns ?? []);
    const cleaned = rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(r)) {
        if (drop.has(k)) continue;
        out[k] = coerce(r[k]);
      }
      // empty id → let DB generate
      if (out.id === null || out.id === "") delete out.id;
      return out;
    });

    const onConflict = opts.onConflict ?? "id";
    const chunk = 500;
    let done = 0;
    for (let i = 0; i < cleaned.length; i += chunk) {
      const batch = cleaned.slice(i, i + chunk);
      const withId = batch.filter((r) => "id" in r);
      const withoutId = batch.filter((r) => !("id" in r));
      if (withId.length) {
        const { error } = await supabase.from(opts.table as any).upsert(withId as any, { onConflict });
        if (error) throw error;
      }
      if (withoutId.length) {
        const { error } = await supabase.from(opts.table as any).insert(withoutId as any);
        if (error) throw error;
      }
      done += batch.length;
    }
    toast.success(`Imported ${done} rows`, { id: tid });
  } catch (e: any) {
    toast.error(e?.message ?? "Import failed", { id: tid });
  }
}
