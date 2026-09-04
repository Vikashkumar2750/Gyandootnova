// Find the 2 extra closing braces using a proper state machine
const fs = require('fs');
const code = fs.readFileSync('api/functions/seo-blog-agent.js', 'utf8');
const lines = code.split('\n');

// State machine to track braces while skipping string/template content
let depth = 0;
let state = 'code'; // 'code', 'string-single', 'string-double', 'template', 'comment-line', 'comment-block'
let templateDepth = 0; // for nested ${} in templates
let escape = false;
const problems = [];

let lineNum = 1;
let colNum = 0;

for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  const next = code[i+1];
  
  if (ch === '\n') { lineNum++; colNum = 0; continue; } else colNum++;
  
  if (escape) { escape = false; continue; }
  
  if (state === 'comment-line') {
    // stays until newline (handled above)
    continue;
  }
  
  if (state === 'comment-block') {
    if (ch === '*' && next === '/') { state = 'code'; i++; colNum++; }
    continue;
  }
  
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
    if (ch === '`') { state = 'code'; templateDepth--; continue; }
    if (ch === '$' && next === '{') { state = 'code'; templateDepth++; i++; colNum++; depth++; continue; } // enter ${
    continue;
  }
  
  // state === 'code'
  if (ch === '/' && next === '/') { state = 'comment-line'; i++; colNum++; continue; }
  if (ch === '/' && next === '*') { state = 'comment-block'; i++; colNum++; continue; }
  if (ch === "'") { state = 'string-single'; continue; }
  if (ch === '"') { state = 'string-double'; continue; }
  if (ch === '`') { state = 'template'; templateDepth++; continue; }
  
  if (ch === '{') {
    depth++;
  }
  
  if (ch === '}') {
    // Check if this closes a template expression
    if (templateDepth > 0) {
      depth--;
      templateDepth--;
      state = 'template';
      continue;
    }
    depth--;
    if (depth < 0) {
      problems.push({line: lineNum, col: colNum, depth, context: lines[lineNum-1]?.slice(0, 100)});
    }
  }
}

console.log('Final depth:', depth, '| State:', state, '| TemplateDepth:', templateDepth);
console.log('Problems (depth underflows):', problems.length);
problems.slice(0, 5).forEach(p => console.log('  L'+p.line+': depth='+p.depth, '|', p.context));
