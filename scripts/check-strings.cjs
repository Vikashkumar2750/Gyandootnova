// Check for unterminated template literals or strings
const fs = require('fs');
const code = fs.readFileSync('api/functions/seo-blog-agent.js', 'utf8');

let state = 'code';
let templateStack = []; // tracks template depths
let escape = false;
let lineNum = 1;
let stringStart = null;

for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  
  if (ch === '\n') {
    lineNum++;
    if (state === 'comment-line') state = 'code';
    continue;
  }
  
  if (escape) { escape = false; continue; }
  
  if (state === 'comment-block') {
    if (ch === '*' && code[i+1] === '/') { state = 'code'; i++; }
    continue;
  }
  if (state === 'comment-line') continue;
  if (state === 'string-single') {
    if (ch === '\\') { escape = true; continue; }
    if (ch === "'") state = 'code';
    continue;
  }
  if (state === 'string-double') {
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') state = 'code';
    continue;
  }
  if (state === 'template') {
    if (ch === '\\') { escape = true; continue; }
    if (ch === '`') { 
      templateStack.pop();
      state = templateStack.length > 0 ? 'in-expr' : 'code';
      continue; 
    }
    if (ch === '$' && code[i+1] === '{') { 
      templateStack.push('in-expr');
      state = 'in-expr'; 
      i++;
      continue; 
    }
    continue;
  }
  if (state === 'in-expr') {
    // Inside ${...} of a template - track nested braces
    // Actually this is code context within the expression
    state = 'code'; 
    // fall through to handle the char as code
  }
  
  // code state
  if (ch === '/' && code[i+1] === '/') { state = 'comment-line'; continue; }
  if (ch === '/' && code[i+1] === '*') { state = 'comment-block'; continue; }
  if (ch === "'") { state = 'string-single'; stringStart = lineNum; continue; }
  if (ch === '"') { state = 'string-double'; stringStart = lineNum; continue; }
  if (ch === '`') { 
    templateStack.push('template');
    state = 'template'; 
    stringStart = lineNum; 
    continue; 
  }
}

console.log('Final state:', state);
console.log('Template stack depth:', templateStack.length, templateStack);
if (state !== 'code' && state !== 'comment-line') {
  console.log('WARNING: File ends in non-code state, starting from line:', stringStart);
}
console.log('Total lines:', lineNum);
