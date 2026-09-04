// Test ESM syntax check
import('./api/functions/seo-blog-agent.js').catch(e => {
  const loc = e.stack ? e.stack.split('\n') : [];
  console.log('ERROR:', e.message);
  console.log('STACK:', loc.slice(0,8).join('\n'));
});
