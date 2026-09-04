// Regenerate JS from TypeScript using esbuild for any given function
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const esbuildBin = path.join('node_modules', '.bin', 'esbuild.cmd');
const acorn = require('acorn');

function regenerate(funcName) {
  const tsFile = `supabase/functions/${funcName}/index.ts`;
  const outFile = `api/functions/${funcName}.js`;
  
  if (!fs.existsSync(tsFile)) {
    console.log(`SKIP: ${tsFile} not found`);
    return false;
  }
  
  let code = fs.readFileSync(tsFile, 'utf8');
  
  // Step 1: Fix imports to Node.js-compatible paths
  code = code.replace(/from "https:\/\/esm\.sh\/@supabase\/supabase-js@[^"]+"/g, 'from "@supabase/supabase-js"');
  code = code.replace(/from "npm:@supabase\/supabase-js@[^"]+"/g, 'from "@supabase/supabase-js"');
  code = code.replace(/from "https:\/\/esm\.sh\/[^"]+"/g, (m) => {
    // Convert esm.sh URLs to npm package names
    const pkg = m.replace(/from "https:\/\/esm\.sh\//, '').replace(/@\d[^"]*"$/, '"');
    return `from ${pkg}`;
  });
  code = code.replace(/from "npm:([^"@]+)@[^"]+"/g, 'from "$1"');
  code = code.replace(/from "\.\.\/\_shared\//g, 'from "../lib/');
  code = code.replace(/\.ts"/g, '.js"');
  
  // Step 2: Remove corsHeaders import (we define our own)
  code = code.replace(/import \{ corsHeaders \}[^;]+;\s*\n/g, '');
  
  // Step 3: Add our own corsHeaders after createClient import
  if (code.includes('createClient') && !code.includes('const corsHeaders')) {
    code = code.replace(
      /(import \{ createClient \} from "@supabase\/supabase-js";)/,
      '$1\nconst corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };'
    );
  }
  
  // Step 4: Remove type-only known items
  code = code.replace(/,\s*KeyResolver/g, '');
  code = code.replace(/,\s*ChatMsg/g, '');
  code = code.replace(/import type [^;]+;\s*\n/g, '');
  code = code.replace(/export type [^;{]+;\s*\n/g, '');
  
  // Write temp TS file
  const tmpTs = `scripts/_tmp_${funcName}.ts`;
  fs.writeFileSync(tmpTs, code, 'utf8');
  
  // Step 5: esbuild to strip TypeScript
  try {
    execFileSync('cmd', [
      '/c', esbuildBin, tmpTs,
      '--bundle=false',
      '--platform=node',
      '--format=esm',
      '--target=node18',
      `--outfile=${outFile}`,
      '--log-level=warning'
    ], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch(e) {
    console.log(`esbuild error for ${funcName}:`, (e.stderr || e.stdout || e.message).slice(0, 200));
    // cleanup
    try { fs.unlinkSync(tmpTs); } catch {}
    return false;
  }
  
  // Step 6: Fix Deno references in generated JS
  let js = fs.readFileSync(outFile, 'utf8');
  
  // Replace Deno.env.get("X") with process.env.X  
  js = js.replace(/Deno\.env\.get\("([^"]+)"\)/g, 'process.env.$1');
  js = js.replace(/Deno\.env\.get\('([^']+)'\)/g, 'process.env.$1');
  
  // Replace Deno.serve(async (req) => { with const handler = async (req) => {
  js = js.replace(/Deno\.serve\(async \(req\) =>/g, 'const handler = async (req) =>');
  
  // Replace closing }); of Deno.serve with };\n\nexport default handler;
  // The pattern: last }); in the file is the Deno.serve closer
  if (js.includes('const handler = async')) {
    // Find the last }); and replace with };
    js = js.replace(/\}\);\s*$/, '};\n\nexport default handler;');
  } else if (!js.includes('export default')) {
    // No Deno.serve found - just add export default handler at end
    // Find "const handler" 
    if (js.match(/^const handler/m)) {
      js = js.trimEnd() + '\n\nexport default handler;\n';
    }
  }
  
  fs.writeFileSync(outFile, js, 'utf8');
  
  // Step 7: Verify with acorn
  try {
    acorn.parse(js, { ecmaVersion: 2022, sourceType: 'module' });
    console.log(`✓ ${funcName}: OK (${js.split('\n').length} lines)`);
    // cleanup
    try { fs.unlinkSync(tmpTs); } catch {}
    return true;
  } catch(e) {
    console.log(`✗ ${funcName}: acorn error at L${e.loc?.line}: ${e.message.slice(0,80)}`);
    try { fs.unlinkSync(tmpTs); } catch {}
    return false;
  }
}

// Process the 2 remaining files
const toFix = ['seo-daily-report', 'seo-editorial-agent'];
for (const name of toFix) {
  regenerate(name);
}
