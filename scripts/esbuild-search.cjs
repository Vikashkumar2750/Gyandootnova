// Binary search with esbuild to find the problematic line
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync('api/functions/seo-blog-agent.js', 'utf8');
const lines = code.split('\n');
const esbuild = path.join('node_modules', '.bin', 'esbuild.cmd');
const tmp = 'scripts/_esbuild_test.mjs';

function check(numLines) {
  const partial = lines.slice(0, numLines).join('\n') + '\nexport default {};';
  fs.writeFileSync(tmp, partial, 'utf8');
  try {
    execFileSync('cmd', ['/c', esbuild, tmp, '--bundle=false', '--format=esm', '--log-level=silent'], {encoding:'utf8'});
    return true;
  } catch(e) {
    return false;
  }
}

// Binary search
let lo = 1, hi = lines.length;
while (lo < hi - 1) {
  const mid = Math.floor((lo + hi) / 2);
  if (check(mid)) {
    lo = mid;
  } else {
    hi = mid;
  }
  process.stdout.write('.');
}
console.log('');
console.log('Error introduced at line:', hi);
// Show context
for (let i = Math.max(0, hi-5); i <= Math.min(lines.length-1, hi+3); i++) {
  console.log('L'+(i+1)+': '+lines[i].slice(0,100));
}
