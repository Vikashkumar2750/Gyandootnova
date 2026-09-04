// Find unclosed blocks using acorn tokenizer with proper location tracking
const acorn = require('acorn');
const fs = require('fs');

const code = fs.readFileSync('api/functions/seo-blog-agent.js', 'utf8');

// Use acorn tokenizer with location info enabled
const opts = {ecmaVersion:2022, sourceType:'module', locations:true};
const tokenGen = acorn.tokenizer(code, opts);

let depth = 0;
let lastOpen = null;
let firstUnderflow = null;
const stack = [];

try {
  for (const tok of tokenGen) {
    if (tok.type.label === '{') {
      depth++;
      stack.push({line: tok.loc?.start?.line, col: tok.loc?.start?.column});
    }
    if (tok.type.label === '}') {
      depth--;
      if (depth < 0 && !firstUnderflow) {
        firstUnderflow = {line: tok.loc?.start?.line, col: tok.loc?.start?.column};
      }
      if (stack.length > 0) stack.pop();
    }
  }
} catch(e) {
  console.log('Tokenizer stopped at:', e.message.slice(0,80));
}

console.log('Final depth:', depth);
if (firstUnderflow) {
  console.log('First underflow at line:', firstUnderflow.line);
}
if (depth > 0) {
  console.log('Unclosed braces. Stack top (last unclosed {):', JSON.stringify(stack.slice(-3)));
}

// Also run without location (simpler) to see final depth
let d2 = 0;
for (const ch of code) {
  if (ch === '{') d2++;
  if (ch === '}') d2--;
}
console.log('Raw char depth (incl strings/templates):', d2);
