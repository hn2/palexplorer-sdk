import './support/mock-local-api.js';
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PalexplorerClient, PalexplorerError } from '../src/client.js';

const unsupportedCalls = [
  ['auth.me', (c) => c.auth.me()],
  ['auth.setupTotp', (c) => c.auth.setupTotp()],
  ['auth.verifyTotp', (c) => c.auth.verifyTotp('123456')],
  ['auth.disableTotp', (c) => c.auth.disableTotp('pw')],
  ['auth.initQr', (c) => c.auth.initQr()],
  ['auth.pollQr', (c) => c.auth.pollQr('s1')],
  ['billing.createCheckout', (c) => c.billing.createCheckout({ plan: 'pro' })],
  ['billing.createPortalSession', (c) => c.billing.createPortalSession()],
  ['billing.activateLicense', (c) => c.billing.activateLicense('k')],
  ['billing.deactivateLicense', (c) => c.billing.deactivateLicense('k')],
  ['broadcast.toGroup', (c) => c.broadcast.toGroup('g1', 'hi')],
  ['broadcast.start', (c) => c.broadcast.start({ shareId: 's1' })],
  ['broadcast.stop', (c) => c.broadcast.stop()],
  ['settings.get', (c) => c.settings.get()],
  ['settings.update', (c) => c.settings.update({ theme: 'dark' })],
  ['settings.listApiKeys', (c) => c.settings.listApiKeys()],
  ['settings.createApiKey', (c) => c.settings.createApiKey('k')],
  ['settings.revokeApiKey', (c) => c.settings.revokeApiKey('k1')],
  ['audit.list', (c) => c.audit.list()],
  ['audit.export', (c) => c.audit.export()],
  ['audit.clear', (c) => c.audit.clear()],
  ['workspaces.list', (c) => c.workspaces.list()],
  ['workspaces.create', (c) => c.workspaces.create('w')],
  ['workspaces.delete', (c) => c.workspaces.delete('w1')],
  ['workspaces.activate', (c) => c.workspaces.activate('w1')],
  ['workspaces.addShare', (c) => c.workspaces.addShare('w1', 's1')],
  ['workspaces.removeShare', (c) => c.workspaces.removeShare('w1', 's1')],
  ['groups.broadcast', (c) => c.groups.broadcast('g1', 'hi')],
  ['transfers.files', (c) => c.transfers.files('m')],
  ['transfers.downloadSelected', (c) => c.transfers.downloadSelected('m', { fileIndices: [0], destDir: '/tmp' })],
];

describe('methods without a daemon route fail loudly (#17)', () => {
  const original = globalThis.fetch;
  afterEach(() => { globalThis.fetch = original; });

  for (const [name, call] of unsupportedCalls) {
    test(`${name} rejects with 501 and makes no request`, async () => {
      let requests = 0;
      globalThis.fetch = async () => { requests += 1; return { ok: true, status: 200, json: async () => ({}) }; };
      await assert.rejects(() => call(new PalexplorerClient()), (err) => {
        assert.ok(err instanceof PalexplorerError);
        assert.equal(err.status, 501);
        assert.ok(err.message.startsWith(name));
        return true;
      });
      assert.equal(requests, 0);
    });
  }

  test('pals group helpers use the daemon /api/groups routes', async () => {
    const urls = [];
    globalThis.fetch = async (url, opts) => { urls.push([new URL(url).pathname, opts?.method || 'GET']); return { ok: true, status: 200, json: async () => ({}) }; };
    const c = new PalexplorerClient();
    await c.pals.groups();
    await c.pals.addGroupMember('g1', 'p1');
    await c.pals.removeGroupMember('g1', 'p1');
    assert.deepEqual(urls, [['/api/groups', 'GET'], ['/api/groups/g1/members', 'POST'], ['/api/groups/g1/members/p1', 'DELETE']]);
  });
});

describe('a custom local daemon is honored (#17, Codex note on #19)', () => {
  const original = globalThis.fetch;
  afterEach(() => { globalThis.fetch = original; });

  test('an extended IPC client dispatches the request for methods the stock daemon lacks', async () => {
    const seen = [];
    globalThis.fetch = async (url, init) => {
      seen.push([init.method || 'GET', url]);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const c = new PalexplorerClient({ localRoutes: 'extended' });
    assert.equal(c.localRoutes, 'extended');
    await c.settings.get();
    await c.settings.update({ theme: 'dark' });
    await c.workspaces.activate('w1');
    await c.transfers.files('magnet:?x');
    assert.deepEqual(seen.map(([m, u]) => `${m} ${new URL(u).pathname}`), [
      'GET /api/settings', 'PATCH /api/settings', 'POST /api/workspaces/w1/activate', 'GET /api/transfers/magnet%3A%3Fx/files',
    ]);
  });

  test('localRoutes: stock keeps the 501 over IPC, and bad values are rejected', async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; return new Response('{}'); };
    const c = new PalexplorerClient({ localRoutes: 'stock' });
    await assert.rejects(() => c.settings.get(), (err) => err.status === 501);
    assert.equal(called, false);
    assert.throws(() => new PalexplorerClient({ localRoutes: 'nope' }), TypeError);
  });

  test('an HTML fallback page is reported as a missing route, not as a JSON parse crash', async () => {
    globalThis.fetch = async () => new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    const c = new PalexplorerClient({ localRoutes: 'extended' });
    await assert.rejects(() => c.settings.get(), (err) => err instanceof PalexplorerError && err.body.notJson === true);
  });
});
