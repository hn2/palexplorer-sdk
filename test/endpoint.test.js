import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { PalexplorerClient } from '../src/index.js';

const cleanup = [];
afterEach(async () => { while (cleanup.length) await cleanup.pop()(); });

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pal-sdk-endpoint-'));
  cleanup.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

async function ipcServer(handler) {
  const name = `pal-sdk-test-${process.pid}-${Date.now()}`;
  const bs = String.fromCharCode(92);
  const socketPath = process.platform === 'win32' ? `${bs}${bs}.${bs}pipe${bs}${name}` : path.join(tmp(), `${name}.sock`);
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push({ url: req.url, auth: req.headers.authorization });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(handler(req)));
  });
  await new Promise((resolve) => server.listen(socketPath, resolve));
  cleanup.push(() => new Promise((resolve) => server.close(resolve)));
  return { socketPath, seen };
}

function endpointFile(content) {
  const file = path.join(tmp(), 'capability-endpoint.json');
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  return file;
}

test('without options, /api/v1 calls use the published IPC endpoint instead of TCP', async () => {
  const { socketPath, seen } = await ipcServer(() => ({ capabilities: ['sync'] }));
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('loopback HTTP must not be used'); };
  cleanup.push(() => { globalThis.fetch = original; });
  const pal = new PalexplorerClient({ localToken: 'tok', localEndpointFile: endpointFile({ schema: 'pal.capabilities/v1', socket: socketPath }) });
  const res = await pal.sync.capabilities();
  assert.deepEqual(res, { capabilities: ['sync'] });
  assert.equal(seen[0].url, '/api/v1/capabilities');
  assert.equal(seen[0].auth, 'Bearer tok');
});

test('routes outside /api/v1 keep using loopback HTTP until the core serves them over IPC', async () => {
  const { socketPath, seen } = await ipcServer(() => ({}));
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => { urls.push(String(url)); return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
  cleanup.push(() => { globalThis.fetch = original; });
  const pal = new PalexplorerClient({ localEndpointFile: endpointFile({ schema: 'pal.capabilities/v1', socket: socketPath }) });
  await pal.fetchLocal('/api/shares');
  assert.equal(seen.length, 0);
  assert.equal(urls[0], 'http://localhost:8585/api/shares');
});

test('when the core reports fullApi, every route uses the IPC endpoint', async () => {
  const { socketPath, seen } = await ipcServer(() => ({ shares: [] }));
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('loopback HTTP must not be used'); };
  cleanup.push(() => { globalThis.fetch = original; });
  const pal = new PalexplorerClient({ localToken: 'tok', localEndpointFile: endpointFile({ schema: 'pal.capabilities/v1', socket: socketPath, fullApi: true }) });
  const res = await pal.fetchLocal('/api/shares');
  assert.deepEqual(res, { shares: [] });
  assert.equal(seen[0].url, '/api/shares');
});

test('an explicit localServer opts out of endpoint auto-detection', async () => {
  const { socketPath, seen } = await ipcServer(() => ({}));
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
  cleanup.push(() => { globalThis.fetch = original; });
  const pal = new PalexplorerClient({ localServer: 'http://127.0.0.1:9999', localEndpointFile: endpointFile({ schema: 'pal.capabilities/v1', socket: socketPath }) });
  await pal.fetchLocal('/api/v1/capabilities');
  assert.equal(seen.length, 0);
});

test('localEndpoint:false disables auto-detection', () => {
  const pal = new PalexplorerClient({ localEndpoint: false, localEndpointFile: endpointFile({ schema: 'pal.capabilities/v1', socket: '/x' }) });
  assert.equal(pal._autoSocket, null);
});

test('malformed, foreign-schema or missing endpoint files are ignored', () => {
  for (const content of ['not json', { schema: 'other/v1', socket: '/x' }, { schema: 'pal.capabilities/v1' }, { schema: 'pal.capabilities/v1', socket: '' }]) {
    const pal = new PalexplorerClient({ localEndpointFile: endpointFile(content) });
    assert.equal(pal._autoSocket, null);
  }
  const missing = new PalexplorerClient({ localEndpointFile: path.join(tmp(), 'nope.json') });
  assert.equal(missing._autoSocket, null);
});
