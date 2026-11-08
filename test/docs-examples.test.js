import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PalexplorerClient } from '../src/client.js';

const client = new PalexplorerClient();
const sources = ['README.md', ...fs.readdirSync(new URL('../examples/', import.meta.url)).map((f) => `examples/${f}`)];

test('every pal.<module>.<method>() call in the README and examples exists on the client (#18)', () => {
  const missing = [];
  for (const file of sources) {
    const text = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const m of text.matchAll(/\b(?:pal|client)\.([a-zA-Z]+)\.([a-zA-Z]+)\(/g)) {
      if (typeof client[m[1]]?.[m[2]] !== 'function') missing.push(`${file}: ${m[1]}.${m[2]}`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test('examples only import the public package entry point', () => {
  for (const f of fs.readdirSync(new URL('../examples/', import.meta.url))) {
    const text = fs.readFileSync(new URL(`../examples/${f}`, import.meta.url), 'utf8');
    for (const m of text.matchAll(/from ['"]([^'"]+)['"]/g)) {
      assert.match(m[1], /^(@palexplorer\/sdk|\.\.\/src\/index\.js|node:.*)$/, `${f} imports ${m[1]}`);
    }
  }
});
