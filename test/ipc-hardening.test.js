import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { PalexplorerClient } from '../src/index.js';
import { assertTrustedAncestors, requestLocalIpc } from '../src/localIpc.js';
import { readLocalEndpoint } from '../src/endpoint.js';
import { startIpcStub } from './support/ipc-stub.js';

const respond = (_req, res) => res.end(JSON.stringify({ ok: true }));

test('request headers are sent in the frame and invalid ones are rejected before connecting', async () => {
  const stub = await startIpcStub(respond);
  try {
    await requestLocalIpc(stub.socketPath, '/api/x', { method: 'POST', body: '{}', token: 't', timeoutMs: 2000, headers: { 'Idempotency-Key': 'abc' } });
    assert.deepEqual(stub.requests[0].headers, { 'Idempotency-Key': 'abc' });
    for (const headers of [['a'], { 'bad name': 'v' }, { a: 1 }, { a: 'x'.repeat(257) }]) {
      await assert.rejects(requestLocalIpc(stub.socketPath, '/api/x', { token: 't', timeoutMs: 2000, headers }), TypeError);
    }
    assert.equal(stub.requests.length, 1);
  } finally { await stub.close(); }
});

test('the client sends the token only after the server proves it holds the endpoint secret', async () => {
  const secret = randomBytes(32).toString('hex');
  const good = await startIpcStub(respond, { secret });
  try {
    const result = await requestLocalIpc(good.socketPath, '/api/x', { token: 'real-token', timeoutMs: 2000, secret });
    assert.equal(result.status, 200);
    assert.deepEqual(good.tokens, ['real-token']);
  } finally { await good.close(); }
});

test('an impostor server without the secret never receives the token', async () => {
  const impostor = await startIpcStub(respond, { secret: randomBytes(32).toString('hex') });
  try {
    await assert.rejects(requestLocalIpc(impostor.socketPath, '/api/x', { token: 'real-token', timeoutMs: 2000, secret: randomBytes(32).toString('hex') }), /did not prove its identity/);
    assert.deepEqual(impostor.tokens, []);
    assert.equal(impostor.requests.length, 0);
  } finally { await impostor.close(); }
});

test('a malformed local secret is refused before anything is sent', async () => {
  const stub = await startIpcStub(respond);
  try {
    await assert.rejects(requestLocalIpc(stub.socketPath, '/api/x', { token: 't', timeoutMs: 2000, secret: 'short' }), TypeError);
    assert.deepEqual(stub.tokens, []);
  } finally { await stub.close(); }
});

test('the client reads the secret from the endpoint file and passes it on', async () => {
  const secret = randomBytes(32).toString('hex');
  const stub = await startIpcStub(respond, { secret });
  const file = path.join(stub.dir, 'capability-endpoint.json');
  fs.writeFileSync(file, JSON.stringify({ schema: 'pal.local-ipc/v1', socket: stub.socketPath, secret, fullApi: true }), { mode: 0o600 });
  try {
    assert.equal(readLocalEndpoint(file).secret, secret);
    const client = new PalexplorerClient({ localEndpointFile: file, localToken: 'tok' });
    assert.deepEqual(await client.fetchLocal('/api/x', { headers: { 'X-Trace': '1' } }), { ok: true });
    assert.deepEqual(stub.tokens, ['tok']);
    const wrong = new PalexplorerClient({ localSocket: stub.socketPath, localSecret: randomBytes(32).toString('hex'), localToken: 'tok2' });
    await assert.rejects(wrong.fetchLocal('/api/x'), /did not prove/);
    assert.deepEqual(stub.tokens, ['tok']);
  } finally { await stub.close(); }
});

test('an endpoint file with a malformed secret yields no secret', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pal-sdk-ep-'));
  const file = path.join(dir, 'e.json');
  fs.writeFileSync(file, JSON.stringify({ schema: 'pal.local-ipc/v1', socket: process.platform === 'win32' ? String.raw`\.\pipe\x` : '/tmp/x.sock', secret: 'nothex' }), { mode: 0o600 });
  try { assert.equal(readLocalEndpoint(file)?.secret, undefined); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('every ancestor directory is validated: another user, or a world-writable non-sticky parent, is refused', () => {
  const dirs = { '/home/me/run': { uid: 1000, mode: 0o700 }, '/home/me': { uid: 1000, mode: 0o755 }, '/home': { uid: 0, mode: 0o755 }, '/': { uid: 0, mode: 0o755 } };
  const fake = (table) => ({ statSync: (d) => table[d] });
  const p = path.posix;
  assert.doesNotThrow(() => assertTrustedAncestors('/home/me/run/a.sock', fake(dirs), p, 1000));
  assert.throws(() => assertTrustedAncestors('/home/me/run/a.sock', fake({ ...dirs, '/home': { uid: 0, mode: 0o777 } }), p, 1000), /closed to other users/);
  assert.throws(() => assertTrustedAncestors('/home/me/run/a.sock', fake({ ...dirs, '/home': { uid: 4242, mode: 0o755 } }), p, 1000), /closed to other users/);
  assert.doesNotThrow(() => assertTrustedAncestors('/home/me/run/a.sock', fake({ ...dirs, '/home': { uid: 0, mode: 0o1777 } }), p, 1000));
});
