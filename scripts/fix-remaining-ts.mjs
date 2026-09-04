#!/usr/bin/env node
/**
 * Surgical fixes for the 14 remaining TypeScript syntax issues.
 * Each fix is specific to the exact pattern found in the file.
 */
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "d:\\GyandootNov\\GyandootNov\\api\\functions\\";

function patch(file, ...fns) {
  const p = BASE + file;
  let code = readFileSync(p, "utf8");
  const orig = code;
  for (const fn of fns) code = fn(code);
  if (code !== orig) { writeFileSync(p, code, "utf8"); console.log("  ✓ " + file); }
  else console.log("  - " + file + " (no change)");
}

// ── 1. create-order.js ──────────────────────────────────────────────────────
// Line 215: guest_email: isGuest ? guest_email,
// This is a TS shorthand-property with conditional type assertion that got broken.
// The original was likely: guest_email: isGuest ? guest_email : null,
patch("create-order.js",
  c => c.replace(
    "guest_email: isGuest ? guest_email,",
    "guest_email: isGuest ? guest_email : null,"
  )
);

// ── 2. generate-invoice.js ───────────────────────────────────────────────────
// Line 150-164: destructured params with inline TypeScript type annotations
// }: {
//   purchase: any;
//   ...
// }) {
// Remove the inline type annotation block after the destructuring
patch("generate-invoice.js",
  c => c.replace(
    /\}: \{\s*\n(?:.*\n)*?.*\}\)\s*\{/,
    (m) => {
      // Replace }: { ... }) { with just ) {
      return "}) {";
    }
  )
);

// ── 3. mysql-sync.js ─────────────────────────────────────────────────────────
// Lines 7-15: leftover interface fields at top of file (interface body without header)
// These lines are stray type annotation lines from a stripped interface
patch("mysql-sync.js",
  c => c.replace(
    /\n  column_name: string;\n  ordinal_position: number;\n  data_type: string;\n  udt_name: string;\n  is_nullable: string;\n  character_maximum_length: number \| null;\n  is_primary_key: boolean;\n\};\n/,
    "\n"
  )
);

// ── 4. otp-providers-manage.js ───────────────────────────────────────────────
// Line 89: (row.config_json || {}) as Record<string, unknown>
patch("otp-providers-manage.js",
  c => c.replace(/\)\s*as\s+Record<string,\s*unknown>/g, ")")
);

// ── 5. phone-otp-send.js ─────────────────────────────────────────────────────
// Line 198: (prov.config_json || {}) as Record<string, unknown>
patch("phone-otp-send.js",
  c => c.replace(/\)\s*as\s+Record<string,\s*unknown>/g, ")")
);

// ── 6. seo-agent-health-report.js ───────────────────────────────────────────
// Line 16: async function probe(name, keyEnv, run: () => Promise<Response>)
patch("seo-agent-health-report.js",
  c => c.replace(
    "async function probe(name, keyEnv, run: () => Promise<Response>)",
    "async function probe(name, keyEnv, run)"
  )
);

// ── 7. seo-auto-rewrite.js ──────────────────────────────────────────────────
// Line 159: const postId: string | undefined = body.post_id;
patch("seo-auto-rewrite.js",
  c => c.replace(
    "const postId: string | undefined = body.post_id;",
    "const postId = body.post_id;"
  )
);

// ── 8. seo-blog-agent.js ────────────────────────────────────────────────────
// Line 71: async function retryOnce(fn: () => Promise<T>)
patch("seo-blog-agent.js",
  c => c.replace(
    /async function retryOnce\(fn: \(\) => Promise<[^>]*>\)/,
    "async function retryOnce(fn)"
  )
);

// ── 9. seo-daily-report.js ──────────────────────────────────────────────────
// Line 93: function trafficRow(label, t: Totals | null)
patch("seo-daily-report.js",
  c => c.replace(
    "function trafficRow(label, t: Totals | null)",
    "function trafficRow(label, t)"
  )
);

// ── 10. seo-dispatch.js ─────────────────────────────────────────────────────
// Line 65: let payload: { fn?: string; body?: unknown; force?: boolean } = {};
patch("seo-dispatch.js",
  c => c.replace(
    "let payload: { fn?: string; body?: unknown; force?: boolean } = {};",
    "let payload = {};"
  )
);

// ── 11. seo-editorial-agent.js ──────────────────────────────────────────────
// Line 96: const chain: [string, (q, k) => Promise<Source[]>][] = [
patch("seo-editorial-agent.js",
  c => c.replace(
    /const chain: \[string, \(q, k\) => Promise<Source\[\]>\]\[\] = \[/,
    "const chain = ["
  )
);

// ── 12. seo-rank-optimizer.js ───────────────────────────────────────────────
// Lines 33-38: leftover interface fields (query: string; position: number; ...)
patch("seo-rank-optimizer.js",
  c => c.replace(
    /\n  query: string;\n  position: number;\n  impressions: number;\n  clicks: number;\n\};\n/,
    "\n"
  )
);

// ── 13. track-visit.js ──────────────────────────────────────────────────────
// Line 9: const cap = (v, n): string | null => {
// Line 15: const num = (v): number | null => {
patch("track-visit.js",
  c => c.replace("const cap = (v, n): string | null => {", "const cap = (v, n) => {"),
  c => c.replace("const num = (v): number | null => {", "const num = (v) => {")
);

// ── 14. generate-invoice.js (second pass) ───────────────────────────────────
// If the regex didn't match, let's try a line-based approach
// Read after first patch
{
  const p = BASE + "generate-invoice.js";
  let code = readFileSync(p, "utf8");
  if (code.includes("}: {")) {
    // Find the destructured param inline type block and remove it
    // Pattern: }: {\n  ...\n}) {  → ) {
    code = code.replace(/\}: \{[\s\S]*?\}\) \{/, ") {");
    writeFileSync(p, code, "utf8");
    console.log("  ✓ generate-invoice.js (second pass)");
  }
}

console.log("\nDone. Run syntax check now.");
