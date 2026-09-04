#!/usr/bin/env node
/**
 * v3 — Clean converter using proper tokenization strategy.
 * Only removes TS syntax that is UNAMBIGUOUSLY TypeScript, not ternary operators.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "supabase", "functions");
const DEST = join(ROOT, "api", "functions");

mkdirSync(DEST, { recursive: true });

const IMPORT_REWRITES = [
  [/import\s*\{([^}]+)\}\s*from\s*["']https:\/\/esm\.sh\/@supabase\/supabase-js@[^"']+["'];?/g,
   'import {$1} from "@supabase/supabase-js";'],
  [/import\s*\{\s*serve\s*\}\s*from\s*["']https:\/\/deno\.land\/std@[^"']+\/http\/server\.ts["'];?/g,
   '// serve removed (handler exported instead)'],
  [/import\s*\{([^}]+)\}\s*from\s*["']npm:([^@"']+)@[^"']+["'];?/g,
   'import {$1} from "$2";'],
  [/import\s+(\w+)\s+from\s*["']npm:([^@"']+)@[^"']+["'];?/g,
   'import $1 from "$2";'],
  [/from\s*["']\.\.\/\_shared\/currency\.ts["']/g, 'from "../lib/currency.js"'],
  [/from\s*["']\.\.\/\_shared\/paypal\.ts["']/g, 'from "../lib/paypal.js"'],
  [/from\s*["']\.\.\/\_shared\/crypto\.ts["']/g, 'from "../lib/crypto.js"'],
  [/from\s*["']\.\.\/\_shared\/ai-crypto\.ts["']/g, 'from "../lib/ai-crypto.js"'],
  [/from\s*["']\.\.\/\_shared\/ai-key-resolver\.ts["']/g, 'from "../lib/ai-key-resolver.js"'],
  [/from\s*["']\.\.\/\_shared\/llm-multi\.ts["']/g, 'from "../lib/llm-multi.js"'],
  [/from\s*["']\.\.\/\_shared\/seo-auth\.ts["']/g, 'from "../lib/seo-auth.js"'],
  [/from\s*["']\.\.\/\_shared\/seo-alerts\.ts["']/g, 'from "../lib/seo-alerts.js"'],
  [/from\s*["']\.\.\/\_shared\/url-guard\.ts["']/g, 'from "../lib/url-guard.js"'],
  [/from\s*["']\.\.\/\_shared\/simple-pdf\.ts["']/g, 'from "../lib/simple-pdf.js"'],
  [/from\s*["']\.\.\/\_shared\/([^"']+)\.ts["']/g, 'from "../lib/$1.js"'],
  [/import\s*\{[^}]*corsHeaders[^}]*\}\s*from\s*["']npm:@supabase\/supabase-js@[^"']+\/cors["'];?/g,
   'const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };'],
];

function findMatchingBrace(code, start) {
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function stripTS(code) {
  // 1. Deno.env.get → process.env
  code = code.replace(/Deno\.env\.get\(\s*["']([A-Z_][A-Z0-9_]*)["']\s*\)/g, 'process.env.$1');
  code = code.replace(/Deno\.env\.get\(\s*([^"'][^)]+)\s*\)/g, 'process.env[$1]');

  // 2. Remove TS non-null assertions after process.env.X!
  code = code.replace(/process\.env\.([A-Z_][A-Z0-9_]*)!/g, 'process.env.$1');

  // 3. Remove import type statements
  code = code.replace(/^import\s+type\s+.*$/gm, '');

  // 4. Remove export type / type / interface declarations (entire lines)
  code = code.replace(/^export\s+type\s+\w+\s*=[^;]*;\s*$/gm, '');
  code = code.replace(/^type\s+\w+\s*=[^;]*;\s*$/gm, '');

  // 5. Remove multi-line type declarations (export type Foo = { ... };)
  code = code.replace(/^export\s+type\s+\w+\s*=\s*\{[^}]*\};\s*$/gm, '');
  code = code.replace(/^type\s+\w+\s*=\s*\{[^}]*\};\s*$/gm, '');

  // 6. Remove const/let/var TYPE annotations ONLY (not ternary values)
  // Pattern: "const FOO: SomeType =" → "const FOO ="
  // We match ": TypeExpr" where TypeExpr is a type, followed by "="
  code = code.replace(/((?:const|let|var)\s+\w+)\s*:\s*(?:[A-Z]\w*(?:<[^>]+>)?(?:\[\])?)\s*=/g, '$1 =');
  // Also handle lowercase types: ": string[]", ": number", etc before "="
  code = code.replace(/((?:const|let|var)\s+\w+)\s*:\s*(?:string|number|boolean|any|unknown)(?:\[\])?\s*=/g, '$1 =');
  // Handle tuple types: ": [number, number][]" before "="
  code = code.replace(/((?:const|let|var)\s+\w+)\s*:\s*\[[^\]]+\](?:\[\])?\s*=/g, '$1 =');

  // 7. Remove function RETURN TYPE annotations (before opening brace)
  // ): ReturnType { → ) {
  code = code.replace(/\)\s*:\s*Promise\s*\{/g, ') {');
  code = code.replace(/\)\s*:\s*(?:string|number|boolean|void|any|Response|Set|Map|CryptoKey)(?:\[\])?\s*\{/g, ') {');

  // 8. Remove function PARAMETER type annotations
  // We need to be careful here — only match in function signatures
  // Pattern: word followed by ?: or : Type in param context
  // Handle optional params: param?: Type → param
  code = code.replace(/(\w)\?\s*:\s*(?:string|number|boolean|any|void|null|undefined|unknown)\s*(?=[,)])/g, '$1');
  // Handle required params: param: Type → param
  // Only match when followed by comma or close-paren (not in objects!)
  code = code.replace(/(\w)\s*:\s*(?:string|number|boolean|any|void|null|undefined|unknown|Record|SupabaseClient)\s*(?=[,)])/g, '$1');

  // 9. Remove "as any" casts
  code = code.replace(/\s+as\s+any\b/g, '');

  // 10. Remove (l: any) patterns in callbacks
  code = code.replace(/\((\w+):\s*any\)/g, '($1)');

  // 11. Remove generic function type params: function<T>( → function(
  code = code.replace(/function\s+(\w+)\s*<[^>]+>\s*\(/g, 'function $1(');

  // 12. Clean up let x: string | null = null → let x = null
  code = code.replace(/((?:let|var)\s+\w+)\s*:\s*(?:string|number|boolean|any)\s*\|\s*(?:null|undefined)\s*=/g, '$1 =');

  // 13. Multiple blank lines
  code = code.replace(/\n{3,}/g, '\n\n');

  return code;
}

function convertFunction(name, source) {
  let code = source;

  // Apply import rewrites
  for (const [pattern, replacement] of IMPORT_REWRITES) {
    code = code.replace(pattern, replacement);
  }

  // Strip TypeScript
  code = stripTS(code);

  // Extract handler from Deno.serve() or serve() using brace matching
  const denoServeMatch = code.match(/(?:Deno\.serve|^serve)\s*\(\s*(async\s+)?\(\s*(\w*)\s*\)\s*=>\s*\{/m);
  if (denoServeMatch) {
    const matchStart = code.indexOf(denoServeMatch[0]);
    const braceStart = code.indexOf('{', matchStart);
    const braceEnd = findMatchingBrace(code, braceStart);
    if (braceEnd !== -1) {
      const isAsync = denoServeMatch[1] || '';
      const paramName = denoServeMatch[2] || 'req';
      const before = code.substring(0, matchStart).trim();
      const handlerBody = code.substring(braceStart + 1, braceEnd);
      let afterStart = braceEnd + 1;
      while (afterStart < code.length && /[\s;)]/.test(code[afterStart])) afterStart++;
      const after = code.substring(afterStart).trim();
      code = `${before}\n\nconst handler = ${isAsync}(${paramName}) => {${handlerBody}};\n\n${after}\n\nexport default handler;\n`;
    }
  }

  return code;
}

const entries = readdirSync(SRC, { withFileTypes: true });
let converted = 0;

for (const entry of entries) {
  if (!entry.isDirectory() || entry.name === "_shared") continue;
  const indexPath = join(SRC, entry.name, "index.ts");
  if (!existsSync(indexPath)) continue;
  const source = readFileSync(indexPath, "utf8");
  const converted_code = convertFunction(entry.name, source);
  const destPath = join(DEST, `${entry.name}.js`);
  writeFileSync(destPath, converted_code, "utf8");
  console.log(`  ✓ ${entry.name}`);
  converted++;
}

console.log(`\nConverted ${converted} functions.`);
