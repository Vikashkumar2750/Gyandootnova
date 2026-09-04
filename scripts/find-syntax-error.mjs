// Use acorn to find the exact error position
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

try {
  const acorn = require('./node_modules/acorn/dist/acorn.js');
  const code = readFileSync('api/functions/seo-blog-agent.js', 'utf8');
  
  // Try parsing progressively to find where the problem starts
  const lines = code.split('\n');
  let lastOk = 0;
  
  for (let i = 10; i <= lines.length; i += 10) {
    const partial = lines.slice(0, i).join('\n') + '\nexport default {};';
    try {
      acorn.parse(partial, { ecmaVersion: 2022, sourceType: 'module' });
      lastOk = i;
    } catch (e) {
      if (e.loc?.line < i) {
        // Error is within our partial
        console.log(`Error first appears between line ${lastOk} and ${i}`);
        
        // Narrow down
        for (let j = lastOk + 1; j <= i; j++) {
          const partial2 = lines.slice(0, j).join('\n') + '\nexport default {};';
          try {
            acorn.parse(partial2, { ecmaVersion: 2022, sourceType: 'module' });
          } catch (e2) {
            if (e2.loc?.line <= j) {
              console.log(`First error at line ${j}: ${lines[j-1]}`);
              console.log('Error:', e2.message.split('\n')[0]);
              process.exit(0);
            }
          }
        }
        break;
      }
    }
  }
} catch (e) {
  console.log('Script error:', e.message);
}
