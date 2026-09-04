// Properly find the syntax error by looking for where the parser depth becomes wrong
// when evaluating the FULL file up to that point (not truncated)
const acorn = require('acorn');
const fs = require('fs');

const code = fs.readFileSync('api/functions/seo-blog-agent.js', 'utf8');
const lines = code.split('\n');

// Strategy: find lines where adding them introduces a NEW error
// that persists beyond the next function close
// Actually the real question: parse the FULL file and get all errors

try {
  acorn.parse(code, {ecmaVersion:2022, sourceType:'module'});
  console.log('Full file: OK');
} catch(e) {
  console.log('Full file error at L' + e.loc?.line + ' C' + e.loc?.column + ': ' + e.message);
}

// The error is at line 820 "export may only appear at top level"
// This means something before line 820 opens a block that's never closed.
// To find it, let's count depth using acorn's tokens:
const tokens = [...acorn.tokenizer(code, {ecmaVersion:2022, sourceType:'module'})];
let depth = 0;
let maxLine = 0;
for (const tok of tokens) {
  if (tok.type.label === '{') { depth++; }
  if (tok.type.label === '}') { depth--; }
  if (tok.loc) maxLine = tok.loc.start.line;
  if (depth < 0) {
    console.log('Depth underflow at token:', tok.type.label, 'at L'+tok.loc?.start?.line);
    break;
  }
}
console.log('Final token depth:', depth, 'Max line:', maxLine);

// Find all top-level blocks that open but don't close
// by tracking depth at boundaries
let d = 0;
let lastOpen = null;
for (const tok of tokens) {
  if (tok.type.label === '{') {
    d++;
    if (d === 1) lastOpen = {line: tok.loc?.start?.line, tok};
  }
  if (tok.type.label === '}') {
    d--;
    if (d === 0) lastOpen = null;
  }
}
if (d > 0) {
  console.log('Unclosed top-level block opened at line:', lastOpen?.line);
}
if (d < 0) {
  console.log('Extra closing brace(s)! depth ended at:', d);
}
