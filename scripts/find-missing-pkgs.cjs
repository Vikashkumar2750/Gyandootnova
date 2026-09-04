// Find missing npm packages needed by api/ JS files
const fs = require('fs');
const path = require('path');

const importRe = /from ["']([^./][^"']+)["']/g;

function findImports(dir) {
  const pkgs = new Set();
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const code = fs.readFileSync(path.join(dir, file), 'utf8');
    let m;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(code)) !== null) {
      let pkg = m[1];
      if (pkg.startsWith('node:')) continue;
      // Get package name (handle scoped packages)
      const parts = pkg.split('/');
      const name = pkg.startsWith('@') ? parts.slice(0,2).join('/') : parts[0];
      pkgs.add(name);
    }
  }
  return pkgs;
}

const dirs = ['api/functions', 'api/lib', 'api'];
const allPkgs = new Set();
for (const d of dirs) {
  if (fs.existsSync(d)) {
    for (const p of findImports(d)) allPkgs.add(p);
  }
}

const missing = [];
const present = [];
for (const pkg of allPkgs) {
  const exists = fs.existsSync(path.join('node_modules', ...pkg.split('/')));
  if (exists) present.push(pkg);
  else missing.push(pkg);
}

console.log('Missing packages (' + missing.length + '):');
missing.sort().forEach(p => console.log(' ', p));
console.log('\nPresent packages (' + present.length + '):');
present.sort().forEach(p => console.log(' ', p));

if (missing.length > 0) {
  console.log('\nInstall command:');
  console.log('npm install ' + missing.join(' '));
}
