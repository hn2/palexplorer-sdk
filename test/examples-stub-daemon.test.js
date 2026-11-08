import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const preload = pathToFileURL(path.join(root, 'test', 'support', 'redirect-fetch.mjs')).href;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function startStub(handler) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const entry = { method: req.method, url: req.url, auth: req.headers.authorization || null, apiKey: req.headers['x-api-key'] || null, body: raw ? JSON.parse(raw) : null };
      requests.push(entry);
      handler(entry, res);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, requests, url: `http://127.0.0.1:${server.address().port}` })));
}

function runExample(file, env, { until, timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', preload, path.join(root, 'examples', file)], { cwd: root, env: { ...process.env, ...env } });
    let out = '';
    let err = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${file} timed out\nstdout: ${out}\nstderr: ${err}`)); }, timeoutMs);
    const finish = (code) => { clearTimeout(timer); resolve({ code, out, err }); };
    child.stdout.on('data', (d) => { out += d; if (until && until.test(out)) { child.kill(); } });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => finish(code));
  });
}

describe('examples run against a stub daemon and discovery server (#18)', () => {
  let local;
  let discovery;
  const state = { shares: [{ id: 's0', name: 'old', visibility: 'private', recipients: [] }] };

  before(async () => {
    local = await startStub((req, res) => {
      if (req.auth !== 'Bearer your_local_bearer_token') return json(res, 401, { error: 'unauthorized' });
      if (req.method === 'GET' && req.url === '/api/identity') return json(res, 200, { handle: '@me', publicKey: 'ab'.repeat(32) });
      if (req.method === 'GET' && req.url === '/api/shares') return json(res, 200, state.shares);
      if (req.method === 'POST' && req.url === '/api/shares') {
        const share = { id: 's1', name: req.body.path, visibility: req.body.visibility, recipients: req.body.recipients };
        state.shares.push(share);
        return json(res, 201, share);
      }
      if (req.method === 'DELETE' && req.url === '/api/shares/s1') { state.shares = state.shares.filter((s) => s.id !== 's1'); return json(res, 200, { ok: true }); }
      if (req.method === 'GET' && req.url === '/api/stats') return json(res, 200, { uploadSpeed: 2048, downloadSpeed: 4096 });
      if (req.method === 'GET' && req.url === '/api/transfers') return json(res, 200, [{ name: 'movie.mkv', status: 'downloading', progress: 0.5 }]);
      return json(res, 404, { error: 'no route' });
    });
    let inbox = [{ fromHandle: 'alice', payload: { type: 'chat', text: 'hello bot' } }];
    discovery = await startStub((req, res) => {
      if (req.method === 'GET' && req.url.startsWith('/api/v1/presence/')) return json(res, 200, { handle: '@alice', online: true, devices: [{ deviceName: 'phone', status: 'online', lastSeen: 'now' }] });
      if (req.method === 'GET' && req.url.startsWith('/messages/mybot')) { const m = inbox; inbox = []; return json(res, 200, m); }
      if (req.method === 'POST' && req.url === '/messages') return json(res, 200, { ok: true });
      if (req.method === 'POST' && req.url === '/api/v1/heartbeat') return json(res, 200, { ok: true });
      return json(res, 404, { error: 'no route' });
    });
  });

  after(() => { local.server.close(); discovery.server.close(); });

  const env = () => ({ STUB_LOCAL: local.url, STUB_DISCOVERY: discovery.url });

  test('quickstart.js completes and prints identity, shares, presence and speeds', async () => {
    const { code, out, err } = await runExample('quickstart.js', env());
    assert.equal(code, 0, err);
    assert.match(out, /Identity:/);
    assert.match(out, /You have 1 shares/);
    assert.match(out, /Alice is online/);
    assert.match(out, /phone: online/);
    assert.match(out, /Upload: 2\.0 KB\/s/);
    assert.ok(local.requests.every((r) => r.auth === 'Bearer your_local_bearer_token'));
  });

  test('share-file.js creates, lists and revokes a share through the daemon', async () => {
    const before = local.requests.length;
    const { code, out, err } = await runExample('share-file.js', env());
    assert.equal(code, 0, err);
    assert.match(out, /Share created:/);
    assert.match(out, /Share revoked/);
    const calls = local.requests.slice(before).map((r) => `${r.method} ${r.url}`);
    assert.deepEqual(calls, ['POST /api/shares', 'GET /api/shares', 'DELETE /api/shares/s1']);
    const created = local.requests.find((r) => r.method === 'POST' && r.url === '/api/shares');
    assert.deepEqual(created.body.recipients, ['@alice', '@bob']);
  });

  test('monitor-transfers.js prints the active transfer from the daemon', async () => {
    const { out } = await runExample('monitor-transfers.js', env(), { until: /movie\.mkv/ });
    assert.match(out, /Transfer Monitor/);
    assert.match(out, /movie\.mkv/);
    assert.match(out, /50\.0%/);
  });

  test('chat-bot.js polls the discovery inbox and replies', async () => {
    const { out } = await runExample('chat-bot.js', env(), { until: /bot . alice/ });
    assert.match(out, /\[alice\]: hello bot/);
    const reply = discovery.requests.find((r) => r.method === 'POST' && r.url === '/messages');
    assert.ok(reply, 'the bot sent a reply');
    assert.equal(reply.body.toHandle, 'alice');
    assert.match(reply.body.payload.text, /How can I help/);
  });
});
