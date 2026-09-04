// String-aware brace depth tracker for seo-blog-agent.js
import { readFileSync } from 'node:fs';

const content = readFileSync('api/functions/seo-blog-agent.js', 'utf8');
const lines = content.split('\n');

let depth = 0;
let inSingleStr = false;
let inDoubleStr = false;
let inTemplate = 0;
let escape = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (inSingleStr) { if (ch === "'") inSingleStr = false; continue; }
    if (inDoubleStr) { if (ch === '"') inDoubleStr = false; continue; }
    if (inTemplate > 0) {
      if (ch === '`') inTemplate--;
      // Skip nested ${...} inside templates (simplified)
      continue;
    }
    if (ch === "'") { inSingleStr = true; continue; }
    if (ch === '"') { inDoubleStr = true; continue; }
    if (ch === '`') { inTemplate++; continue; }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth < 0) {
        console.log(`UNDERFLOW at line ${i+1}: ${line.slice(0,80)}`);
        process.exit(0);
      }
    }
  }
}
console.log('Final depth: ' + depth);
