// Find the root cause of the seo-blog-agent.js syntax error
const acorn = require('acorn');
const fs = require('fs');

const code = fs.readFileSync('api/functions/seo-blog-agent.js', 'utf8');
const lines = code.split('\n');

function check(numLines) {
  const partial = lines.slice(0, numLines).join('\n') + '\nexport default handler;';
  try { 
    acorn.parse(partial, {ecmaVersion:2022, sourceType:'module'}); 
    return 'OK'; 
  } catch(e) { 
    return e.message.includes('top level') ? 'TL' : ('SE:L'+e.loc?.line+' '+e.message.slice(0,40)); 
  }
}

// Test around line 29-30
console.log('check(29):', check(29));
console.log('check(30):', check(30));
console.log('');

// What does lines[29] contain? (0-indexed, = line 30)
console.log('Line 30 (idx 29):', JSON.stringify(lines[29]));
console.log('Line 29 (idx 28):', JSON.stringify(lines[28]));

// Test: is the TL just because function declarations must be top-level?
// In ESM with strict mode, function declarations inside blocks are fine but 
// the parser might not see them at top level if there's an unclosed block.

// Let's test if it's actually the "const between imports" issue
const testCode1 = `import { createClient } from "@supabase/supabase-js";
import { foo } from "./bar.js";
const corsHeaders = {};
function suggestSchedule() {}
export default handler;`;

const testCode2 = `import { createClient } from "@supabase/supabase-js";
const corsHeaders = {};
import { foo } from "./bar.js";
function suggestSchedule() {}
export default handler;`;

try { acorn.parse(testCode1, {ecmaVersion:2022, sourceType:'module'}); console.log('\ntestCode1 (imports then const): OK'); }
catch(e) { console.log('\ntestCode1: FAIL', e.message.slice(0,80)); }

try { acorn.parse(testCode2, {ecmaVersion:2022, sourceType:'module'}); console.log('testCode2 (const between imports): OK'); }
catch(e) { console.log('testCode2: FAIL', e.message.slice(0,80)); }

// Now - the actual check(29) failing at 'top level':
// This means lines[0..28] (lines 1-29) leaves us inside a block.
// Let me do a more targeted search in lines 1-29:
console.log('\n--- Scanning lines 1-29 ---');
for (let i = 1; i <= 29; i++) {
  const r = check(i);
  if (r !== 'OK') process.stdout.write('L'+i+':'+r+' ');
  else process.stdout.write('L'+i+':OK ');
}
console.log('');
