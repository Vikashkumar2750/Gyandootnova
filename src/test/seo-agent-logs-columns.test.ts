// Regression test: guard against querying non-existent columns on
// `seo_agent_logs`. The actual timestamp column is `run_at`; a past bug
// used `created_at` and broke Admin SEO Command + daily health report.
//
// We now also allow `created_at` because a generated-column alias was
// added to the table for backward-compat. Any *other* unknown column
// on this table in code should trip this test.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const SEARCH_DIRS = ["src", "supabase/functions"];
const EXTS = [".ts", ".tsx"];

// Known columns on public.seo_agent_logs (see migration
// 20260706090700_*.sql) plus `created_at` alias (generated column).
const ALLOWED_COLUMNS = new Set([
  "id",
  "run_at",
  "created_at", // generated alias of run_at
  "topic",
  "focus_keyword",
  "action",
  "status",
  "post_id",
  "slug",
  "similarity_score",
  "matched_slug",
  "sources",
  "internal_links",
  "external_links",
  "word_count",
  "reading_time_min",
  "error",
  "meta",
  "content_score",
  "seo_score",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, out);
    } else if (EXTS.some((e) => full.endsWith(e))) {
      // skip this test file itself and generated supabase types
      if (full.includes("seo-agent-logs-columns.test.")) continue;
      if (full.endsWith("supabase/types.ts")) continue;
      out.push(full);
    }
  }
  return out;
}

/** Find each `.from("seo_agent_logs")` call and inspect the chained
 * PostgREST methods that follow, up to the next `.from(` or `;`. */
function extractColumnRefs(src: string): string[] {
  const cols: string[] = [];
  const fromRe = /\.from\(\s*["'`]seo_agent_logs["'`]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = fromRe.exec(src)) !== null) {
    const start = m.index + m[0].length;
    // stop at next `.from(` or `;`, whichever comes first
    const rest = src.slice(start);
    const nextFrom = rest.search(/\.from\(/);
    const nextSemi = rest.search(/;/);
    const stops = [nextFrom, nextSemi].filter((n) => n >= 0);
    const end = stops.length ? Math.min(...stops) : rest.length;
    const chunk = rest.slice(0, end);

    for (const s of chunk.matchAll(/\.select\(\s*["'`]([^"'`]+)["'`]/g)) {
      for (const c of s[1].split(",")) {
        const name = c.trim().split(/\s|\(/)[0];
        if (name && name !== "*") cols.push(name);
      }
    }
    for (const s of chunk.matchAll(
      /\.(?:order|gte|lte|gt|lt|eq|neq|filter|is|in)\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g,
    )) {
      cols.push(s[1]);
    }
  }
  return cols;
}

describe("seo_agent_logs column references", () => {
  it("only uses known columns", () => {
    const bad: { file: string; column: string }[] = [];
    for (const dir of SEARCH_DIRS) {
      const abs = join(ROOT, dir);
      try {
        statSync(abs);
      } catch {
        continue;
      }
      for (const file of walk(abs)) {
        const src = readFileSync(file, "utf8");
        if (!src.includes("seo_agent_logs")) continue;
        for (const col of extractColumnRefs(src)) {
          if (!ALLOWED_COLUMNS.has(col)) {
            bad.push({ file: file.replace(ROOT + "/", ""), column: col });
          }
        }
      }
    }
    expect(bad, `Unknown seo_agent_logs columns: ${JSON.stringify(bad, null, 2)}`).toEqual([]);
  });
});
