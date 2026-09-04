#!/usr/bin/env node
/**
 * Global aggressive TypeScript → JavaScript stripper.
 * Processes ALL files in api/functions/ and removes ALL remaining TS patterns.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, "..", "api", "functions");

const files = readdirSync(DIR).filter(f => f.endsWith(".js"));

for (const file of files) {
  const filePath = join(DIR, file);
  let code = readFileSync(filePath, "utf8");
  const orig = code;

  // ── Step 1: Remove TypeScript non-null assertions: expr! → expr ──
  // foo.email! → foo.email
  // Be careful not to remove != or !important etc
  code = code.replace(/(\w)\!/g, "$1");

  // ── Step 2: Remove "as SomeType" casts (all forms) ──
  // (expr) as Record<string, unknown> → (expr)
  // expr as string → expr
  // Handle nested generics: as Map<string, Record<string,any>>
  // We use a greedy match for the type, stopping at , ) ; \n
  code = code.replace(/\s+as\s+(?:Record<[^>]+(?:<[^>]+>)?(?:[^>]*)?>|Map<[^>]+>|Set<[^>]+>|Array<[^>]+>|[A-Za-z_]\w*(?:<[^;,){\n]+>)?(?:\[\])?)\s*(?=[,);{\n])/g, "");

  // ── Step 3: Remove return type annotations on functions ──
  // function foo(a, b): ReturnType { → function foo(a, b) {
  // function foo(a, b): SomeType[] { → function foo(a, b) {
  // const foo = (a, b): ReturnType => { → const foo = (a, b) => {
  // (a): ReturnType => → (a) =>
  
  // Arrow function return types: ): Type =>
  code = code.replace(/\)\s*:\s*(?:[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?)*\s*(?:\[\])?)\s*=>/g, ") =>");
  
  // Named function return types: ): Type {
  code = code.replace(/\)\s*:\s*(?:[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*(?:[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?|null|undefined))*)\s*\{/g, ") {");

  // ── Step 4: Remove type annotations from function parameters ──
  // Only in lines containing 'function' keyword
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Lines with function declarations OR arrow function definitions
    if (line.includes("function ") || line.includes("async function")) {
      // Remove: paramName: TypeAnnotation in parameter lists
      // Handle: param: string | null, param: SomeType[], param: SomeType<X>
      // Replace \w+: <type> where <type> ends at , or )
      line = line.replace(/(\w)\s*:\s*(?:[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*(?:[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?|null|undefined))*)\s*(?=[,)])/g, "$1");
    }
    
    // Arrow function param type: (v, n): string | null =>
    // Already handled in step 3, but catch inline versions too
    if (line.includes("=>")) {
      line = line.replace(/\(\s*(\w+(?:\s*,\s*\w+)*)\s*\)\s*:\s*(?:[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*(?:null|undefined|[A-Za-z_]\w*))*)\s*=>/g, "($1) =>");
    }
    
    lines[i] = line;
  }
  code = lines.join("\n");

  // ── Step 5: Remove inline object type annotations on const/let ──
  // const foo: { key: string; val: number } = ...
  // let payload: { fn?: string; body?: unknown; force?: boolean } = {}
  code = code.replace(/\b(const|let|var)\s+(\w+)\s*:\s*\{[^={}]*\}\s*(?:\[\])?\s*=/g, "$1 $2 =");

  // ── Step 6: Remove simple const/let type annotations ──
  // const foo: string | undefined = ...
  // let bar: number = ...
  code = code.replace(/\b(const|let|var)\s+(\w+)\s*:\s*(?:[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*(?:null|undefined|[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?))*)\s*=/g, "$1 $2 =");

  // ── Step 7: Remove function parameter inline object type annotations ──
  // audit(sb, entry: { action: string; ... }) → audit(sb, entry)
  code = code.replace(/(\w)\s*:\s*\{[^{}()]*\}\s*(?=[,)])/g, "$1");

  // ── Step 8: Remove remaining stray interface/type artifact lines ──
  // Lines that look like:   propertyName: type;  (leftover from stripped interfaces)
  // These appear at the start of a function scope - they're standalone type lines
  // Pattern: lines that ONLY contain "  word: type;" with no = assignment
  code = code.replace(/^([ \t]+)(\w+)\s*:\s*(?:[A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*(?:null|undefined|[A-Za-z_]\w*(?:<[^>]*>)?))*)\s*;\s*$/gm, "");

  // ── Step 9: Fix corrupted array indexing from type cast removal ──
  // (rows[])[0] → rows[0]  (caused by "as Type[]" being partially removed)
  code = code.replace(/\((\w+)\[\]\)\[(\d+)\]/g, "$1[$2]");
  // Also: rows[] → rows  if standalone
  code = code.replace(/(\w+)\[\](?=\[)/g, "$1");

  // ── Step 10: Remove multi-line function param type annotations ──
  // async function audit(sb, entry: {\n  action: string;\n}) → async function audit(sb, entry)
  code = code.replace(/(\w)\s*:\s*\{[^{}]*\}/g, "$1");

  // ── Step 11: Clean up extra blank lines ──
  code = code.replace(/\n{3,}/g, "\n\n");

  if (code !== orig) {
    writeFileSync(filePath, code, "utf8");
    console.log(`  ✓ ${file}`);
  }
}

console.log("\nDone.");
