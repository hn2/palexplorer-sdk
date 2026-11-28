import './support/mock-local-api.js';
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { PalexplorerClient, PalexplorerError } from '../src/client.js';

function createTestIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(-32);
  const pk = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  return {
    publicKey,
    pkHex: pk.toString('hex'),
    identity: { publicKey: pk.toString('hex'), privateKey: Buffer.concat([seed, pk]).toString('hex') },
  };
}

function captureFetch(reply = { ok: true }) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const parsed = new URL(url);
    calls.push({
      origin: parsed.origin,
      pathname: parsed.pathname,
      method: (opts.method || 'GET').toUpperCase(),
      headers: opts.headers || {},
      body: opts.body !== undefined ? JSON.parse(opts.body) : undefined,
    });
    return { ok: true, status: 200, json: async () => reply };
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function parseOpenApiOperations(yamlText) {
  const ops = new Map();
  let inPaths = false;
  let currentPath = null;
  for (const rawLine of yamlText.replaceAll('\r', '').split('\n')) {
    if (/^paths:\s*$/.test(rawLine)) {
      inPaths = true;
      currentPath = null;
      continue;
    }
    if (inPaths && /^\S/.test(rawLine)) {
      break;
    }
    if (!inPaths) continue;
    const pathMatch = rawLine.match(/^  (\/[^:\s]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      if (!ops.has(currentPath)) ops.set(currentPath, new Set());
      continue;
    }
    const methodMatch = rawLine.match(/^    (get|post|put|patch|delete|head|options):\s*$/i);
    if (currentPath && methodMatch) {
      ops.get(currentPath).add(methodMatch[1].toUpperCase());
    }
  }
  return ops;
}

describe('BillingAPI route parity (#39)', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); mock = null; });

  test('status hits local GET /api/billing/status with bearer token', async () => {
    mock = captureFetch({ isPro: true, plan: 'pro' });
    const client = new PalexplorerClient({ localToken: 'tok_local' });
    const res = await client.billing.status();
    assert.equal(res.isPro, true);
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].origin, 'https://local-unit.invalid');
    assert.equal(mock.calls[0].method, 'GET');
    assert.equal(mock.calls[0].pathname, '/api/billing/status');
    assert.equal(mock.calls[0].headers.Authorization, 'Bearer tok_local');
  });

  test('validate hits palexplorer-server GET /api/v1/billing/validate/:publicKey with Ed25519 ownership headers', async () => {
    const { publicKey, pkHex, identity } = createTestIdentity();
    mock = captureFetch({ plan: 'pro', pro: true, publicKey: pkHex });
    const client = new PalexplorerClient({
      discoveryServer: 'https://discovery.palexplorer.com',
      apiKey: 'pk_pro_test',
      identity,
    });
    const res = await client.billing.validate(pkHex);
    assert.equal(res.plan, 'pro');
    assert.equal(mock.calls.length, 1);
    const call = mock.calls[0];
    assert.equal(call.origin, 'https://discovery.palexplorer.com');
    assert.equal(call.method, 'GET');
    assert.equal(call.pathname, `/api/v1/billing/validate/${pkHex}`);
    assert.equal(call.headers['X-API-Key'], 'pk_pro_test');
    const ts = call.headers['x-timestamp'];
    const sig = call.headers['x-signature'];
    assert.ok(ts && sig, 'x-timestamp and x-signature headers must be sent');
    assert.equal(
      crypto.verify(null, Buffer.from(`billing-validate:${pkHex}:${ts}`), publicKey, Buffer.from(sig, 'hex')),
      true,
    );
  });

  test('identity.proStatus hits palexplorer-server GET /api/v1/pro-status/:publicKey with Ed25519 ownership headers', async () => {
    const { publicKey, pkHex, identity } = createTestIdentity();
    mock = captureFetch({ plan: 'pro', pro: true, publicKey: pkHex });
    const client = new PalexplorerClient({ identity });
    await client.identity.proStatus(pkHex);
    assert.equal(mock.calls.length, 1);
    const call = mock.calls[0];
    assert.equal(call.origin, 'https://discovery.palexplorer.com');
    assert.equal(call.method, 'GET');
    assert.equal(call.pathname, `/api/v1/pro-status/${pkHex}`);
    const ts = call.headers['x-timestamp'];
    const sig = call.headers['x-signature'];
    assert.equal(
      crypto.verify(null, Buffer.from(`pro-status:${pkHex}:${ts}`), publicKey, Buffer.from(sig, 'hex')),
      true,
    );
  });

  test('extended billing routes reject with 501 under stock localRoutes and dispatch exact routes under extended', async () => {
    mock = captureFetch({ ok: true });
    const stock = new PalexplorerClient({ localRoutes: 'stock' });
    await assert.rejects(() => stock.billing.createCheckout({ plan: 'pro' }), (e) => e instanceof PalexplorerError && e.status === 501);
    await assert.rejects(() => stock.billing.createPortalSession(), (e) => e instanceof PalexplorerError && e.status === 501);
    await assert.rejects(() => stock.billing.activateLicense('LIC-1'), (e) => e instanceof PalexplorerError && e.status === 501);
    await assert.rejects(() => stock.billing.deactivateLicense('LIC-1'), (e) => e instanceof PalexplorerError && e.status === 501);
    assert.equal(mock.calls.length, 0);

    const ext = new PalexplorerClient({ localRoutes: 'extended', localToken: 'tok_ext' });
    await ext.billing.createCheckout({ plan: 'pro', successUrl: 'https://a.test/ok', cancelUrl: 'https://a.test/no' });
    await ext.billing.createPortalSession();
    await ext.billing.activateLicense('LIC-1');
    await ext.billing.deactivateLicense('LIC-2');

    assert.deepEqual(
      mock.calls.map(({ origin, method, pathname, body }) => ({ origin, method, pathname, body })),
      [
        {
          origin: 'https://local-unit.invalid',
          method: 'POST',
          pathname: '/api/billing/checkout',
          body: { plan: 'pro', successUrl: 'https://a.test/ok', cancelUrl: 'https://a.test/no' },
        },
        {
          origin: 'https://local-unit.invalid',
          method: 'POST',
          pathname: '/api/billing/portal',
          body: undefined,
        },
        {
          origin: 'https://local-unit.invalid',
          method: 'POST',
          pathname: '/api/billing/license/activate',
          body: { licenseKey: 'LIC-1' },
        },
        {
          origin: 'https://local-unit.invalid',
          method: 'POST',
          pathname: '/api/billing/license/deactivate',
          body: { licenseKey: 'LIC-2' },
        },
      ],
    );
  });
});

describe('GroupsAPI and BroadcastAPI route parity (#39)', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); mock = null; });

  test('GroupsAPI CRUD methods use /api/groups* with proper encoding and payloads', async () => {
    mock = captureFetch({ ok: true });
    const client = new PalexplorerClient({ localToken: 'tok_g' });
    await client.groups.list();
    await client.groups.create('Team Alpha');
    await client.groups.create({ name: 'Beta', description: 'desc', visibility: 'private' });
    await client.groups.delete('g/1');
    await client.groups.addMember('g/1', 'pal-1');
    await client.groups.removeMember('g/1', 'pal/2');

    assert.deepEqual(
      mock.calls.map(({ origin, method, pathname, body }) => ({ origin, method, pathname, body })),
      [
        { origin: 'https://local-unit.invalid', method: 'GET', pathname: '/api/groups', body: undefined },
        { origin: 'https://local-unit.invalid', method: 'POST', pathname: '/api/groups', body: { name: 'Team Alpha' } },
        {
          origin: 'https://local-unit.invalid',
          method: 'POST',
          pathname: '/api/groups',
          body: { name: 'Beta', description: 'desc', visibility: 'private' },
        },
        { origin: 'https://local-unit.invalid', method: 'DELETE', pathname: '/api/groups/g%2F1', body: undefined },
        { origin: 'https://local-unit.invalid', method: 'POST', pathname: '/api/groups/g%2F1/members', body: { palId: 'pal-1' } },
        { origin: 'https://local-unit.invalid', method: 'DELETE', pathname: '/api/groups/g%2F1/members/pal%2F2', body: undefined },
      ],
    );
    assert.ok(mock.calls.every((c) => c.headers.Authorization === 'Bearer tok_g'));
  });

  test('groups.broadcast and broadcast.toGroup reject under stock and both POST /api/groups/:groupId/broadcast under extended', async () => {
    mock = captureFetch({ ok: true, sent: 2, total: 2 });
    const stock = new PalexplorerClient({ localRoutes: 'stock' });
    await assert.rejects(() => stock.groups.broadcast('g/1', 'hello'), (e) => e instanceof PalexplorerError && e.status === 501);
    await assert.rejects(() => stock.broadcast.toGroup('g/1', 'hello'), (e) => e instanceof PalexplorerError && e.status === 501);
    assert.equal(mock.calls.length, 0);

    const ext = new PalexplorerClient({ localRoutes: 'extended', localToken: 'tok_b' });
    await ext.groups.broadcast('g/1', 'from-groups');
    await ext.broadcast.toGroup('g/1', 'from-broadcast');

    assert.deepEqual(
      mock.calls.map(({ origin, method, pathname, body }) => ({ origin, method, pathname, body })),
      [
        { origin: 'https://local-unit.invalid', method: 'POST', pathname: '/api/groups/g%2F1/broadcast', body: { message: 'from-groups' } },
        { origin: 'https://local-unit.invalid', method: 'POST', pathname: '/api/groups/g%2F1/broadcast', body: { message: 'from-broadcast' } },
      ],
    );
    assert.equal(mock.calls[0].pathname, mock.calls[1].pathname);
    assert.ok(mock.calls.every((c) => c.headers.Authorization === 'Bearer tok_b'));
  });

  test('broadcast.start and broadcast.stop reject under stock and dispatch exact routes under extended', async () => {
    mock = captureFetch({ ok: true });
    const stock = new PalexplorerClient({ localRoutes: 'stock' });
    await assert.rejects(() => stock.broadcast.start({ shareId: 's1' }), (e) => e instanceof PalexplorerError && e.status === 501);
    await assert.rejects(() => stock.broadcast.stop(), (e) => e instanceof PalexplorerError && e.status === 501);
    assert.equal(mock.calls.length, 0);

    const ext = new PalexplorerClient({ localRoutes: 'extended' });
    await assert.rejects(() => ext.broadcast.start(null), TypeError);
    await assert.rejects(() => ext.broadcast.start(['bad']), TypeError);
    assert.equal(mock.calls.length, 0);

    await ext.broadcast.start({ shareId: 's1', title: 'Live' });
    await ext.broadcast.stop();

    assert.deepEqual(
      mock.calls.map(({ origin, method, pathname, body }) => ({ origin, method, pathname, body })),
      [
        { origin: 'https://local-unit.invalid', method: 'POST', pathname: '/api/broadcast/start', body: { shareId: 's1', title: 'Live' } },
        { origin: 'https://local-unit.invalid', method: 'POST', pathname: '/api/broadcast/stop', body: undefined },
      ],
    );
  });
});

describe('OpenAPI and docs route parity (#39)', () => {
  test('docs/openapi.yaml documents every billing, pro-status, groups, and broadcast route with matching HTTP methods', () => {
    const spec = fs.readFileSync(new URL('../docs/openapi.yaml', import.meta.url), 'utf8');
    const ops = parseOpenApiOperations(spec);

    const expected = [
      ['GET', '/api/billing/status'],
      ['POST', '/api/billing/checkout'],
      ['POST', '/api/billing/portal'],
      ['POST', '/api/billing/license/activate'],
      ['POST', '/api/billing/license/deactivate'],
      ['GET', '/api/v1/billing/validate/{publicKey}'],
      ['GET', '/api/v1/pro-status/{publicKey}'],
      ['GET', '/api/groups'],
      ['POST', '/api/groups'],
      ['DELETE', '/api/groups/{groupId}'],
      ['POST', '/api/groups/{groupId}/members'],
      ['DELETE', '/api/groups/{groupId}/members/{palId}'],
      ['POST', '/api/groups/{groupId}/broadcast'],
      ['POST', '/api/broadcast/start'],
      ['POST', '/api/broadcast/stop'],
    ];

    for (const [method, route] of expected) {
      assert.ok(ops.has(route), `docs/openapi.yaml is missing path ${route}`);
      assert.ok(ops.get(route).has(method), `docs/openapi.yaml is missing ${method} on ${route}`);
    }
  });

  test('no stale /pals/groups route remains in src/ or docs/', () => {
    const files = [
      '../src/groups.js',
      '../src/broadcast.js',
      '../src/pals.js',
      '../src/billing.js',
      '../docs/openapi.yaml',
      '../docs/REST-API.md',
    ];
    for (const rel of files) {
      const content = fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
      assert.doesNotMatch(content, /\/pals\/groups\b/, `${rel} must not contain stale /pals/groups route`);
    }
  });
});
