// Proper TypeScript-to-JS converter for seo-blog-agent
// Uses esbuild to properly strip TypeScript
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const tsFile = 'supabase/functions/seo-blog-agent/index.ts';
const outFile = 'api/functions/seo-blog-agent.js';

// Read original TS
let code = fs.readFileSync(tsFile, 'utf8');

// Step 1: Fix imports to use Node.js-compatible paths
code = code.replace(/from "https:\/\/esm\.sh\/@supabase\/supabase-js@[^"]+"/g, 'from "@supabase/supabase-js"');
code = code.replace(/from "npm:@supabase\/supabase-js@[^/]+\/cors"/g, 'from "@supabase/supabase-js"');
code = code.replace(/from "\.\.\/\_shared\//g, 'from "../lib/');
code = code.replace(/\.ts"/g, '.js"');

// Remove the corsHeaders import from supabase-js cors (we define our own)
code = code.replace(/import \{ corsHeaders \} from [^;]+;\s*\n/g, '');

// Add our own corsHeaders after the createClient import  
code = code.replace(
  /import \{ createClient \} from "@supabase\/supabase-js";/,
  'import { createClient } from "@supabase/supabase-js";\nconst corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };'
);

// Remove 'import type' statements entirely
code = code.replace(/import type [^;]+;\s*\n/g, '');

// Remove 'export type' statements
code = code.replace(/export type [^;{]+;/g, '');
code = code.replace(/export type \{[^}]*\}/g, '');

// Remove type-only exports from regular exports
code = code.replace(/export \{ type [^}]+ \}/g, '');

// Remove known type-only imports (e.g. KeyResolver, ChatMsg, etc)
code = code.replace(/,\s*KeyResolver/g, '');  // remove type KeyResolver from imports
code = code.replace(/,\s*ChatMsg/g, '');       // remove type ChatMsg from imports
// Remove 'import type' patterns that may have survived
code = code.replace(/import \{ type [^}]+\} from [^;]+;\n/g, '');

// Use esbuild to strip TypeScript
const tmpTs = 'scripts/_tmp_seo_blog.ts';
fs.writeFileSync(tmpTs, code, 'utf8');

const esbuildBin = path.join('node_modules', '.bin', 'esbuild.cmd');
try {
  const result = execFileSync('cmd', [
    '/c', esbuildBin, tmpTs,
    '--bundle=false',
    '--platform=node', 
    '--format=esm',
    '--target=node18',
    '--outfile=' + outFile,
    '--log-level=warning'
  ], { encoding: 'utf8' });
  console.log('esbuild output:', result);
  console.log('SUCCESS: Generated', outFile);
} catch(e) {
  console.log('esbuild error:', e.stderr || e.stdout || e.message);
  process.exit(1);
}

// Read and fix the generated JS
let js = fs.readFileSync(outFile, 'utf8');

// Fix imports back to relative paths (esbuild may have changed them)
// Fix any remaining issues
console.log('Generated file lines:', js.split('\n').length);

// Verify with acorn
const acorn = require('acorn');
try {
  acorn.parse(js, { ecmaVersion: 2022, sourceType: 'module' });
  console.log('Acorn parse: OK');
} catch(e) {
  console.log('Acorn parse error:', e.message.slice(0, 100));
}
