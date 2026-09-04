// Count backticks outside of comments and single/double quoted strings
const fs = require('fs');
const code = fs.readFileSync('api/functions/seo-blog-agent.js', 'utf8');

let count = 0;
let inSingle = false, inDouble = false, inLineComment = false, inBlockComment = false, escape = false;
const lines = code.split('\n');
let lineNum = 1;
const backtickLines = [];

for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  if (ch === '\n') { lineNum++; inLineComment = false; continue; }
  if (escape) { escape = false; continue; }
  if (ch === '\\') { escape = true; continue; }
  if (inBlockComment) { if (ch === '*' && code[i+1] === '/') { inBlockComment = false; i++; } continue; }
  if (inLineComment) continue;
  if (inSingle) { if (ch === "'") inSingle = false; continue; }
  if (inDouble) { if (ch === '"') inDouble = false; continue; }
  // code context
  if (ch === '/' && code[i+1] === '/') { inLineComment = true; continue; }
  if (ch === '/' && code[i+1] === '*') { inBlockComment = true; continue; }
  if (ch === "'") { inSingle = true; continue; }
  if (ch === '"') { inDouble = true; continue; }
  if (ch === '`') { count++; backtickLines.push(lineNum); }
}

console.log('Backtick count:', count, count % 2 === 0 ? '(EVEN - balanced)' : '(ODD - UNBALANCED!)');
if (count % 2 !== 0) {
  console.log('Lines with backticks:', backtickLines);
}
