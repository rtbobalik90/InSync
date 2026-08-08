import assert from 'node:assert/strict';
import fs from 'node:fs';
const required = ['index.html','styles.css','app.js','storage.js','ai.js','cloud.js','manifest.webmanifest','sw.js'];
for (const file of required) assert.equal(fs.existsSync(new URL(`../${file}`, import.meta.url)), true, `${file} missing`);
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /InSync/);
assert.match(html, /manifest\.webmanifest/);
console.log('InSync smoke test passed.');
