import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PalexplorerClient } from '../src/client.js';
import { isLocalPipe } from '../src/localIpc.js';
import { startIpcStub } from './support/ipc-stub.js';

const cleanup = [];
afterEach(async () => { while (cleanup.length) await cleanup.pop()(); });
async function stub(handler = (_req, res) => res.end('{"ok":true}')) {
  const value = await startIpcStub(handler); cleanup.push(value.close); return value;
}

test('all local routes use framed IPC and bearer authentication, never fetch', async () => {
  const server = await stub();
  const file = path.join(server.dir, 'endpoint.json');
  fs.writeFileSync(file, JSON.stringify({ schema: 'pal.local-ipc/v1', socket: server.socketPath, fullApi: true }));
  const original = globalThis.fetch; globalThis.fetch = () => { throw new Error('HTTP must not run'); }; cleanup.push(() => { globalThis.fetch = original; });
  const pal = new PalexplorerClient({ localToken: 'secret', localEndpointFile: file });
  assert.deepEqual(await pal.fetchLocal('/api/v1/capabilities'), { ok: true });
  assert.deepEqual(await pal.fetchLocal('/api/shares', { method: 'POST', body: '{"name":"x"}' }), { ok: true });
  assert.equal(server.requests[0].auth, 'Bearer secret');
  assert.deepEqual(server.requests[1].body, { name: 'x' });
});

test('missing, legacy and malformed endpoint metadata fail closed without HTTP', async () => {
  const server = await stub();
  const original = globalThis.fetch; let calls = 0; globalThis.fetch = async () => { calls++; }; cleanup.push(() => { globalThis.fetch = original; });
  for (const content of [null, 'invalid JSON', { schema: 'pal.capabilities/v1', socket: server.socketPath }]) {
    const file = path.join(server.dir, `metadata-${calls}.json`);
    if (content !== null) fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
    await assert.rejects(new PalexplorerClient({ localToken: 's', localEndpointFile: file }).fetchLocal('/api/shares'), /HTTP fallback is disabled/);
    fs.rmSync(file, { force: true });
  }
  assert.equal(calls, 0);
});

test('localServer cannot opt back into TCP, including HTTPS or aliases', () => {
  for (const localServer of ['http://localhost:8585', 'http://127.1:8585', 'https://localhost', 'http://[::1]']) {
    assert.throws(() => new PalexplorerClient({ localServer }), /localServer was removed/);
  }
});

test('Windows remote UNC and device paths cannot receive the token', () => {
  assert.equal(isLocalPipe(String.raw`\\.\pipe\palexplorer-cap-a`), true);
  for (const value of [String.raw`\\remote\pipe\pal`, String.raw`\\?\UNC\host\pipe\pal`, String.raw`\\.\pipe\a\b`, 'localhost:8585']) assert.equal(isLocalPipe(value), false);
});

test('malformed JSON, oversized frames and truncated responses are rejected', async () => {
  for (const kind of ['json', 'size', 'truncated']) {
    const server = await stub((_req, res) => {
      if (kind === 'json') { res.writeHead(200); res.end('<html>'); }
      if (kind === 'size') { const header = Buffer.alloc(4); header.writeUInt32BE(1024 * 1024); res.raw(header); }
      if (kind === 'truncated') res.destroy();
    });
    const pal = new PalexplorerClient({ localSocket: server.socketPath, localToken: 's', timeout: 200 });
    await assert.rejects(pal.fetchLocal('/api/test'), /malformed|length|complete response/);
  }
});

test('timeouts and AbortSignal close the IPC request', async () => {
  const server = await stub(() => {});
  const pal = new PalexplorerClient({ localSocket: server.socketPath, localToken: 's', timeout: 30 });
  await assert.rejects(pal.fetchLocal('/api/wait'), /timed out/);
  const controller = new AbortController();
  const result = pal.fetchLocal('/api/wait', { signal: controller.signal, timeoutMs: 1000 });
  controller.abort(new Error('cancelled'));
  await assert.rejects(result, /cancelled/);
});

test('missing local token is rejected before dispatch', async () => {
  const server = await stub();
  await assert.rejects(new PalexplorerClient({ localSocket: server.socketPath }).fetchLocal('/api/test'), /token is required/);
  assert.equal(server.requests.length, 0);
});

test('explicit Windows UNC endpoints fail before credentials leave the process', { skip: process.platform !== 'win32' }, async () => {
  const pal = new PalexplorerClient({ localSocket: String.raw`\\remote\pipe\palexplorer`, localToken: 'must-stay-local' });
  await assert.rejects(pal.fetchLocal('/api/shares'), /Only a local Windows named pipe/);
});

test('Unix endpoints require an owner-controlled directory and safe metadata', { skip: process.platform === 'win32' }, async () => {
  const server = await stub();
  const file = path.join(server.dir, 'endpoint.json');
  fs.writeFileSync(file, JSON.stringify({ schema: 'pal.local-ipc/v1', socket: server.socketPath }));
  fs.chmodSync(file, 0o666);
  await assert.rejects(new PalexplorerClient({ localToken: 's', localEndpointFile: file }).fetchLocal('/api/shares'), /No trusted local IPC/);
  fs.chmodSync(file, 0o600);
  fs.chmodSync(server.dir, 0o777);
  await assert.rejects(new PalexplorerClient({ localSocket: server.socketPath, localToken: 's' }).fetchLocal('/api/shares'), /directory must belong/);
  fs.chmodSync(server.dir, 0o700);
});

test('a large response whose frames arrive coalesced is accepted', async () => {
  const frame = value => { const b = Buffer.from(JSON.stringify(value)); const h = Buffer.alloc(4); h.writeUInt32BE(b.length); return Buffer.concat([h, b]); };
  const server = await stub((_req, res) => {
    const text = JSON.stringify({ blob: 'x'.repeat(40 * 1024 * 8) });
    const bytes = Buffer.from(text);
    const parts = [frame({ kind: 'headers', status: 200 })];
    for (let i = 0; i < bytes.length; i += 40 * 1024) parts.push(frame({ kind: 'data', body: bytes.subarray(i, i + 40 * 1024).toString('base64') }));
    parts.push(frame({ kind: 'end' }));
    res.raw(Buffer.concat(parts));
  });
  const pal = new PalexplorerClient({ localSocket: server.socketPath, localToken: 's', timeout: 2000 });
  assert.equal((await pal.fetchLocal('/api/big')).blob.length, 40 * 1024 * 8);
});
