import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PalexplorerClient } from '../src/index.js';

const dts = fs.readFileSync(new URL('../dist/index.d.ts', import.meta.url), 'utf8');

function classBody(name) {
  const m = dts.match(new RegExp(String.raw`export declare class ${name} \{([\s\S]*?)\r?\n\}`));
  return m ? m[1] : null;
}

describe('dist/index.d.ts matches the runtime API (#17)', () => {
  const client = new PalexplorerClient();
  const apis = Object.values(client).filter((v) => v && typeof v === 'object' && /API$/.test(v.constructor.name));

  test('every API module is declared', () => {
    assert.ok(apis.length >= 17);
    for (const api of apis) assert.ok(classBody(api.constructor.name), `${api.constructor.name} is missing from index.d.ts`);
  });

  test('every public method of every module is declared, and nothing extra is declared', () => {
    const problems = [];
    for (const api of apis) {
      const cls = api.constructor.name;
      const body = classBody(cls);
      if (!body) continue;
      const real = Object.getOwnPropertyNames(Object.getPrototypeOf(api)).filter((n) => n !== 'constructor');
      const declared = [...body.matchAll(/^\s+(\w+)(?:<[^>]*>)?\(/gm)].map((x) => x[1]).filter((n) => n !== 'constructor');
      for (const n of real) if (!declared.includes(n)) problems.push(`${cls}.${n} exists but is not declared`);
      for (const n of declared) if (!real.includes(n)) problems.push(`${cls}.${n} is declared but does not exist`);
    }
    assert.deepEqual(problems, []);
  });

  test('ClientOptions declares localRoutes and the client exposes it', () => {
    assert.match(dts, /localRoutes\?: 'stock' \| 'extended'/);
    assert.equal(client.localRoutes, 'stock');
  });
});
