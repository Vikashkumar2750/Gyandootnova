#!/usr/bin/env node
/**
 * Regression guard for the prerendered dist/ output.
 *
 * Fails the build if:
 *  - The urgency countdown (HH:MM:SS) leaks into any prerendered HTML.
 *    The banner must render only after client mount to avoid the illusion
 *    of stale CDN content on raw `curl` fetches.
 *  - Any Swedish / SEK strings (kr, SEK, Köp, Lägg, lager, tillgång, svenska,
 *    krona, googtrans) appear anywhere in the raw prerendered HTML — the
 *    site is Hindi/INR only.
 *  - Absolute localhost / 127.0.0.1 URLs leak from the vite preview server.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && p.endsWith(".html")) yield p;
  }
}

const banned = [
  { name: "urgency countdown text", re: /खत्म होने में/ },
  { name: "urgency countdown HH:MM:SS span", re: /tabular-nums["'][^>]*>\s*\d{2}:\d{2}:\d{2}/ },
  { name: "Swedish 'kr' currency", re: /(^|[\s>(])kr(\s|[<),.]|$)/ },
  { name: "SEK currency code", re: /\bSEK\b/ },
  { name: "Swedish 'Köp'", re: /Köp/ },
  { name: "Swedish 'Lägg'", re: /Lägg/ },
  { name: "Swedish 'lager'", re: /\blager\b/ },
  { name: "Swedish 'tillgång'", re: /tillgång/ },
  { name: "Swedish 'krona'", re: /\bkrona\b/i },
  { name: "Google Translate cookie", re: /googtrans/ },
  { name: "localhost URL leak", re: /https?:\/\/localhost:\d+/ },
  { name: "127.0.0.1 URL leak", re: /https?:\/\/127\.0\.0\.1:\d+/ },
];

async function main() {
  try {
    await stat(DIST);
  } catch {
    console.error("[verify-prerender-clean] dist/ missing — run `vite build` first.");
    process.exit(1);
  }

  const failures = [];
  let scanned = 0;
  for await (const file of walk(DIST)) {
    const html = await readFile(file, "utf8");
    scanned++;
    for (const { name, re } of banned) {
      const m = html.match(re);
      if (m) {
        failures.push({
          file: relative(DIST, file),
          rule: name,
          snippet: html.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 80).replace(/\s+/g, " "),
        });
      }
    }
  }

  console.log(`[verify-prerender-clean] scanned ${scanned} HTML file(s)`);
  if (failures.length) {
    console.error(`\n[verify-prerender-clean] FAIL — ${failures.length} violation(s):\n`);
    for (const f of failures.slice(0, 40)) {
      console.error(`  ✗ ${f.file}\n      rule: ${f.rule}\n      near: …${f.snippet}…\n`);
    }
    if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
    process.exit(1);
  }
  console.log("[verify-prerender-clean] OK — no forbidden strings in prerendered HTML");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
