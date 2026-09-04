const acorn = require('./node_modules/acorn/dist/acorn.js');
const fs = require('fs');
const code = fs.readFileSync('api/functions/seo-blog-agent.js', 'utf8');
const lines = code.split('\n');

const p12 = lines.slice(0, 12).join('\n') + '\nexport default handler;';
const p29 = lines.slice(0, 29).join('\n') + '\nexport default handler;';

try { acorn.parse(p12, { ecmaVersion: 2022, sourceType: 'module' }); console.log('1-12: OK'); }
catch(e) { console.log('1-12: FAIL ' + e.message.slice(0,80)); }

try { acorn.parse(p29, { ecmaVersion: 2022, sourceType: 'module' }); console.log('1-29: OK'); }
catch(e) { console.log('1-29: FAIL ' + e.message.slice(0,80)); }

// Test import-const-import interleaving
const testCode = [
  'import { createClient } from "@supabase/supabase-js";',
  'const corsHeaders = {};',
  'import { foo } from "./lib/seo-alerts.js";',
  'export default {};'
].join('\n');
try { acorn.parse(testCode, { ecmaVersion: 2022, sourceType: 'module' }); console.log('import-const-import: OK'); }
catch(e) { console.log('import-const-import: FAIL ' + e.message.slice(0,80)); }
