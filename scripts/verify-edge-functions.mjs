#!/usr/bin/env node
/**
 * Predeploy guard for Supabase Edge Functions.
 *
 * Verifies that the supabase/functions tree matches the layout the deploy
 * pipeline expects, so a broken path fails locally instead of at deploy time.
 *
 * Checks:
 *  1. Every function directory has an index.ts entrypoint.
 *  2. Function names are deploy-safe slugs (lowercase, digits, dashes).
 *  3. Shared code lives in supabase/functions/_shared and is only .ts files.
 *  4. Relative imports resolve to a real file inside supabase/functions.
 *  5. No imports reach outside supabase/functions (e.g. ../../src/...).
 *  6. Any function referenced in supabase/config.toml exists on disk.
 *
 * Usage: node scripts/verify-edge-functions.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FUNCTIONS_DIR = path.join(ROOT, "supabase", "functions");
const SHARED_DIR = path.join(FUNCTIONS_DIR, "_shared");
const CONFIG_TOML = path.join(ROOT, "supabase", "config.toml");

const errors = [];
const warnings = [];

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

if (!fs.existsSync(FUNCTIONS_DIR)) {
  console.log("No supabase/functions directory found — nothing to verify.");
  process.exit(0);
}

const entries = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
const functionNames = [];

for (const entry of entries) {
  const full = path.join(FUNCTIONS_DIR, entry.name);
  const isDir = entry.isDirectory() || (entry.isSymbolicLink() && fs.statSync(full).isDirectory());

  if (!isDir) {
    // Only docs and config-ish files are allowed at the functions root.
    if (!/^(README(\.md)?|deno\.json|deno\.jsonc|import_map\.json|\.gitignore)$/i.test(entry.name)) {
      warnings.push(`Unexpected file at functions root: ${rel(full)} (deploys ignore loose files)`);
    }
    continue;
  }

  if (entry.name === "_shared") continue;

  if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.name)) {
    errors.push(`Invalid function name "${entry.name}" — use lowercase letters, digits and dashes only.`);
  }

  if (!fs.existsSync(path.join(full, "index.ts"))) {
    errors.push(`Missing entrypoint: ${rel(path.join(full, "index.ts"))}`);
  }

  functionNames.push(entry.name);
}

// _shared layout
if (fs.existsSync(SHARED_DIR)) {
  const walkShared = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walkShared(full);
      else if (!/\.(ts|tsx|json)$/.test(e.name)) {
        errors.push(`Unsupported file in _shared: ${rel(full)} (only .ts/.tsx/.json deploy with functions)`);
      }
    }
  };
  walkShared(SHARED_DIR);
}

// Import resolution
const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const collectSourceFiles = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectSourceFiles(full, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) acc.push(full);
  }
  return acc;
};

for (const file of collectSourceFiles(FUNCTIONS_DIR)) {
  const code = fs.readFileSync(file, "utf8");
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(code)) !== null) {
    const spec = m[1] ?? m[2];
    if (!spec || !spec.startsWith(".")) continue; // npm:/jsr:/https: are fine

    const resolvedRaw = path.resolve(path.dirname(file), spec);
    const insideFunctions =
      resolvedRaw === FUNCTIONS_DIR || resolvedRaw.startsWith(FUNCTIONS_DIR + path.sep);

    if (!insideFunctions) {
      errors.push(
        `${rel(file)} imports "${spec}" which resolves outside supabase/functions — that path is not uploaded on deploy.`
      );
      continue;
    }

    const candidates = [resolvedRaw, `${resolvedRaw}.ts`, `${resolvedRaw}.tsx`, path.join(resolvedRaw, "index.ts")];
    if (!candidates.some((c) => fs.existsSync(c) && fs.statSync(c).isFile())) {
      errors.push(`${rel(file)} imports "${spec}" but no such file exists (expected ${rel(resolvedRaw)}[.ts]).`);
    }
  }
}

// config.toml function references
if (fs.existsSync(CONFIG_TOML)) {
  const toml = fs.readFileSync(CONFIG_TOML, "utf8");
  for (const m of toml.matchAll(/^\s*\[functions\.([A-Za-z0-9_-]+)\]/gm)) {
    if (!functionNames.includes(m[1])) {
      errors.push(`supabase/config.toml configures [functions.${m[1]}] but supabase/functions/${m[1]} does not exist.`);
    }
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);

if (errors.length > 0) {
  console.error(`\nEdge function layout check failed (${errors.length} problem${errors.length === 1 ? "" : "s"}):`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nFix the paths above before deploying.\n");
  process.exit(1);
}

console.log(`Edge function layout OK — ${functionNames.length} functions verified.`);
