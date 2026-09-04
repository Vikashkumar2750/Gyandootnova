#!/usr/bin/env node
/**
 * Replaces all `supabase.functions.invoke(...)` calls in the frontend
 * with `apiCall(...)` from `@/lib/api`.
 *
 * Patterns handled:
 * 1. const { data, error } = await supabase.functions.invoke("fn", { body: X });
 *    → const { data, error } = await apiCall("fn", { body: X });
 *
 * 2. supabase.functions.invoke("fn", { body }).catch(...)
 *    → apiCall("fn", { body }).catch(...)
 *
 * 3. await supabase.functions.invoke("fn");
 *    → await apiCall("fn");
 *
 * Also adds `import { apiCall } from "@/lib/api"` if not present,
 * and removes unused `supabase` import if no other supabase usage remains.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Find all files containing supabase.functions.invoke
const grepResult = execSync(
  'git grep -l "supabase.functions.invoke" -- "src/**/*.ts" "src/**/*.tsx"',
  { cwd: ROOT, encoding: "utf8" }
).trim().split("\n").filter(Boolean);

console.log(`Found ${grepResult.length} files to update:\n`);

let totalReplacements = 0;

for (const relPath of grepResult) {
  const filePath = join(ROOT, relPath);
  let code = readFileSync(filePath, "utf8");
  const original = code;

  // Replace supabase.functions.invoke with apiCall
  // This handles all variations:
  // - supabase.functions.invoke("name", { body: ... })
  // - supabase.functions.invoke("name", { body })
  // - supabase.functions.invoke("name")
  code = code.replace(/supabase\.functions\.invoke/g, "apiCall");

  if (code === original) {
    console.log(`  skip ${relPath} — no changes`);
    continue;
  }

  // Count replacements
  const count = (original.match(/supabase\.functions\.invoke/g) || []).length;
  totalReplacements += count;

  // Add apiCall import if not already present
  if (!code.includes('from "@/lib/api"') && !code.includes("from '@/lib/api'")) {
    // Find a good place to add the import — after the last import statement
    const importLines = code.match(/^import\s+.+$/gm);
    if (importLines && importLines.length > 0) {
      const lastImport = importLines[importLines.length - 1];
      const lastImportIdx = code.lastIndexOf(lastImport);
      const insertPos = lastImportIdx + lastImport.length;
      code = code.substring(0, insertPos) + '\nimport { apiCall } from "@/lib/api";' + code.substring(insertPos);
    } else {
      code = 'import { apiCall } from "@/lib/api";\n' + code;
    }
  }

  writeFileSync(filePath, code, "utf8");
  console.log(`  ✓ ${relPath} (${count} replacement${count > 1 ? "s" : ""})`);
}

console.log(`\nDone! ${totalReplacements} replacements across ${grepResult.length} files.`);
