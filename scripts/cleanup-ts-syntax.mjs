#!/usr/bin/env node
/**
 * Post-conversion cleanup — line-by-line TS stripping.
 * Handles all remaining edge cases the regex converter missed.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, "..", "api", "functions");

const files = readdirSync(DIR).filter(f => f.endsWith(".js"));

for (const file of files) {
  const path = join(DIR, file);
  let code = readFileSync(path, "utf8");
  const orig = code;

  // ── Generic type params on constructors: new Map<...>() → new Map() ──
  code = code.replace(/new\s+(Map|Set|WeakMap|WeakSet|Array|Promise)<[^>]+>\(/g, 'new $1(');

  // ── Generic type params on functions: fn<Type>(...) → fn(...) ──
  code = code.replace(/(\w)\s*<(?:[A-Z]\w*(?:\s*,\s*[A-Z]\w*)*)>\s*\(/g, '$1(');

  // ── import { ..., type Foo } → import { ... } ──
  code = code.replace(/,\s*type\s+\w+/g, '');
  code = code.replace(/\{\s*type\s+\w+\s*,/g, '{');

  // ── Variable declarations with types: let x: Type → let x ──
  // let/var x: string | null = ... → let/var x = ...
  code = code.replace(/((?:let|var)\s+\w+)\s*:\s*[^=;]+=/g, (match, prefix) => {
    // Don't touch destructuring
    if (prefix.includes('{') || prefix.includes('[')) return match;
    return prefix + ' =';
  });

  // ── Standalone variable type declarations: let body: any; → let body; ──
  code = code.replace(/((?:let|var)\s+\w+)\s*:\s*(?:any|string|number|boolean|unknown|null|undefined)(?:\s*\|\s*(?:any|string|number|boolean|unknown|null|undefined))*\s*;/g, '$1;');

  // ── Function parameter types: (param: Type) → (param) ──
  // Handle all forms including Record<...>, Promise<...>, Set<...>, etc.
  // Process function signatures line by line
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Remove function return type annotations: ): ReturnType {
    line = line.replace(/\)\s*:\s*(?:Promise<[^>]+>|Set<[^>]+>|Map<[^>]+>|Record<[^>]+>|Response|CryptoKey|string|number|boolean|void|any)\s*\{/g, ') {');
    // Handle multi-generic: ): Promise<Record<string, unknown>> {
    line = line.replace(/\)\s*:\s*Promise<[^{]+>\s*\{/g, ') {');
    // ): { key: type; ... } { — object return types
    line = line.replace(/\)\s*:\s*\{[^}]+\}\s*\{/g, ') {');

    // Remove param type annotations in function/arrow signatures
    // Match ": TypeExpr" patterns in parameter lists
    // (\w)?: Type → just the word (optional ? stripped)
    line = line.replace(/(\w)\?\s*:\s*(?:string|number|boolean|any|void|null|undefined|unknown|Record<[^>]+>|Set<[^>]+>|Map<[^>]+>|Promise<[^>]+>|SupabaseClient|[A-Z]\w*(?:\[\])?)\s*(?=[,)])/g, '$1');
    // (\w): Type → just the word
    line = line.replace(/(\w)\s*:\s*(?:Record<[^>]+>|Set<[^>]+>|Map<[^>]+>|Promise<[^>]+>|SupabaseClient)\s*(?=[,)])/g, '$1');

    // Arrow function param types: (d: Date) => ... → (d) => ...
    line = line.replace(/\((\w+)\s*:\s*(?:Date|Event|Error|[A-Z]\w*)\)/g, '($1)');
    // (v: unknown) → (v), (e: Error) → (e)
    line = line.replace(/\((\w+)\s*:\s*(?:unknown)\)/g, '($1)');
    // Generic single params: (r: { key: string; value: string | null }) → (r)
    line = line.replace(/\((\w+)\s*:\s*\{[^}]+\}\)/g, '($1)');

    // Remove "as Error" and similar casts in expressions
    line = line.replace(/\((\w+)\s+as\s+Error\)/g, '$1');
    line = line.replace(/\bas\s+(?:Error|string|number|boolean|any|unknown|const)\b/g, '');

    // Remove type parameter annotations from function decl: function foo<T>(
    line = line.replace(/function\s+(\w+)\s*<[^>]+>\s*\(/g, 'function $1(');

    // Remove standalone param type in function decl: function foo(x: Type, y: Type)
    // Be careful: only in function signatures (contains 'function' or '=>')
    if (line.includes('function ') || line.includes('async function')) {
      line = line.replace(/(\w)\s*:\s*(?:string|number|boolean|any|void|null|undefined|unknown|Date|Error|[A-Z]\w*)(?:\[\])?\s*(?=[,)])/g, '$1');
      // Handle: chapters: any[] → chapters
      line = line.replace(/(\w)\s*:\s*any\[\]\s*(?=[,)])/g, '$1');
    }

    // Remove interface blocks: interface Foo { ... }
    if (/^\s*interface\s+\w+\s*\{/.test(line)) {
      // Find the closing brace (possibly multi-line)
      let depth = 0;
      let j = i;
      while (j < lines.length) {
        for (const ch of lines[j]) {
          if (ch === '{') depth++;
          if (ch === '}') depth--;
        }
        lines[j] = '';
        if (depth <= 0) break;
        j++;
      }
      line = '';
    }

    // Remove type-only parameter annotations in multi-line function signatures
    // Like: level: "success" | "error" | "info",
    // This is a union type as param type — remove it
    // Pattern: word: "literal" | "literal" | ...
    line = line.replace(/(\w)\s*:\s*"[^"]+"\s*(?:\|\s*"[^"]+"\s*)+(?=[,)])/g, '$1');

    lines[i] = line;
  }
  code = lines.join('\n');

  // ── Clean up multi-blank-lines ──
  code = code.replace(/\n{3,}/g, '\n\n');

  if (code !== orig) {
    writeFileSync(path, code, "utf8");
    console.log(`  ✓ ${file}`);
  }
}

console.log('\nDone.');
