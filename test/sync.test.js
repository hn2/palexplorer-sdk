import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PalexplorerClient, SyncAPI, CapabilitiesAPI } from '../src/index.js';

let original;
const calls = [];
function mock(handler) {
  original = globalThis.fetch;
  calls.length = 0;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: new URL(url), opts });
    const body = await handler(new URL(url), opts);
    return { ok: true, status: 200, json: async () => body };
  };
}
afterEach(() => { if (original) globalThis.fetch = original; original = null; });

test('sync and capabilities are exported and attached to the client', () => {
  const pal = new PalexplorerClient({ localToken: 't' });
  assert.ok(pal.sync instanceof SyncAPI);
  assert.ok(pal.capabilities instanceof CapabilitiesAPI);
});

test('deliver posts app, to and payload to /api/v1/sync/deliver with the bearer token', async () => {
  mock(() => ({ ok: true, id: 'm1' }));
  const pal = new PalexplorerClient({ localToken: 'tok' });
  const res = await pal.sync.deliver({ app: 'fl.sync', to: 'ab'.repeat(32), payload: { type: 'x' } });
  assert.equal(res.id, 'm1');
  assert.equal(calls[0].url.pathname, '/api/v1/sync/deliver');
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer tok');
  assert.deepEqual(JSON.parse(calls[0].opts.body), { app: 'fl.sync', to: 'ab'.repeat(32), payload: { type: 'x' } });
});

test('receive long-polls the inbox, caps waitMs at 25 s and returns the messages array', async () => {
  mock(() => ({ messages: [{ id: 'a' }] }));
  const pal = new PalexplorerClient();
  const msgs = await pal.sync.receive({ app: 'fl.sync', waitMs: 99999, limit: 10 });
  assert.deepEqual(msgs, [{ id: 'a' }]);
  assert.equal(calls[0].url.pathname, '/api/v1/sync/inbox');
  assert.equal(calls[0].url.searchParams.get('waitMs'), '25000');
  assert.equal(calls[0].url.searchParams.get('limit'), '10');
});

test('subscribe delivers messages in order and stop() ends the loop', async () => {
  let n = 0;
  mock(() => ({ messages: n++ < 2 ? [{ id: `m${n}` }] : [] }));
  const pal = new PalexplorerClient();
  const seen = [];
  let stop;
  await new Promise((resolve) => {
    stop = pal.sync.subscribe('fl.sync', (m) => { seen.push(m.id); if (seen.length === 2) resolve(); }, { waitMs: 0 });
  });
  await stop();
  assert.deepEqual(seen, ['m1', 'm2']);
});

test('issueToken and revokeTokens call the token endpoints', async () => {
  mock(() => ({ token: 'x', revoked: 1 }));
  const pal = new PalexplorerClient({ localToken: 'full' });
  await pal.capabilities.issueToken({ app: 'fl.sync' });
  assert.deepEqual(JSON.parse(calls[0].opts.body), { app: 'fl.sync', scopes: ['sync:deliver'] });
  await pal.capabilities.revokeTokens('fl sync');
  assert.equal(calls[1].url.pathname, '/api/v1/tokens/fl%20sync');
  assert.equal(calls[1].opts.method, 'DELETE');
});

test('stop() aborts an in-flight long-poll instead of waiting it out', async () => {
  original = globalThis.fetch;
  globalThis.fetch = (url, opts) => new Promise((_resolve, reject) => {
    opts.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });
  const pal = new PalexplorerClient();
  const stop = pal.sync.subscribe('fl.sync', () => {}, { waitMs: 25000 });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const started = Date.now();
  await stop();
  assert.ok(Date.now() - started < 1000);
});

test('localSocket sends local calls over IPC with the bearer token and maps errors', async () => {
  const http = await import('node:http');
  const os = await import('node:os');
  const path = await import('node:path');
  const sock = process.platform === 'win32' ? `\\\\.\\pipe\\pal-sdk-test-${process.pid}` : path.join(os.tmpdir(), `pal-sdk-${process.pid}.sock`);
  const seen = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      seen.push({ url: req.url, auth: req.headers.authorization, body: Buffer.concat(chunks).toString() });
      if (req.url.startsWith('/api/v1/tokens')) { res.statusCode = 403; return res.end(JSON.stringify({ error: 'Full token required', code: 'E_APP_FORBIDDEN' })); }
      res.end(JSON.stringify({ ok: true, id: 'ipc1' }));
    });
  });
  await new Promise((resolve) => server.listen(sock, resolve));
  try {
    const pal = new PalexplorerClient({ localSocket: sock, localToken: 'tok' });
    const res = await pal.sync.deliver({ app: 'fl.sync', to: 'ab'.repeat(32), payload: 1 });
    assert.equal(res.id, 'ipc1');
    assert.equal(seen[0].url, '/api/v1/sync/deliver');
    assert.equal(seen[0].auth, 'Bearer tok');
    await assert.rejects(pal.capabilities.issueToken({ app: 'x' }), (err) => err.status === 403 && err.body.code === 'E_APP_FORBIDDEN');
    pal._socketAgent.destroy();
  } finally {
    server.close();
  }
});
