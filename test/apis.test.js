import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PalexplorerClient } from '../src/client.js';

function mockFetch(responses = {}) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    const path = new URL(url).pathname;
    const handler = responses[path] || responses['*'];
    if (!handler) {
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    }
    const body = typeof handler === 'function' ? handler(url, opts) : handler;
    return { ok: true, status: 200, json: async () => body };
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

describe('TransfersAPI', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('list fetches /api/transfers', async () => {
    mock = mockFetch({ '/api/transfers': { transfers: [{ id: 't1' }] } });
    const client = new PalexplorerClient();
    const result = await client.transfers.list();
    assert.deepEqual(result.transfers, [{ id: 't1' }]);
  });

  test('download sends POST to /api/downloads', async () => {
    mock = mockFetch({ '/api/transfers/download': { id: 'd1', status: 'queued' } });
    const client = new PalexplorerClient();
    await client.transfers.download({ magnet: 'magnet:?xt=urn:btih:abc', name: 'file.zip', savePath: '/tmp' });
    assert.equal(mock.calls[0].opts.method, 'POST');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.magnet, 'magnet:?xt=urn:btih:abc');
    assert.equal(body.name, 'file.zip');
    assert.equal(body.savePath, '/tmp');
  });

  test('stats fetches /api/stats', async () => {
    mock = mockFetch({ '/api/transfers/stats': { total: 5, active: 2 } });
    const client = new PalexplorerClient();
    const result = await client.transfers.stats();
    assert.equal(result.total, 5);
  });

  test('pause sends POST', async () => {
    mock = mockFetch({ '/api/transfers/t1/pause': { ok: true } });
    const client = new PalexplorerClient();
    await client.transfers.pause('t1');
    assert.equal(mock.calls[0].opts.method, 'POST');
    assert.ok(mock.calls[0].url.includes('/transfers/t1/pause'));
  });

  test('resume sends POST', async () => {
    mock = mockFetch({ '/api/transfers/t1/resume': { ok: true } });
    const client = new PalexplorerClient();
    await client.transfers.resume('t1');
    assert.equal(mock.calls[0].opts.method, 'POST');
    assert.ok(mock.calls[0].url.includes('/transfers/t1/resume'));
  });

  test('pause encodes transferId', async () => {
    mock = mockFetch({ '/api/transfers/a%20b/pause': { ok: true } });
    const client = new PalexplorerClient();
    await client.transfers.pause('a b');
    assert.ok(mock.calls[0].url.includes('a%20b'));
  });
});

describe('ChatAPI', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('send posts to discovery /messages', async () => {
    mock = mockFetch({ '/messages': { ok: true } });
    const client = new PalexplorerClient();
    await client.chat.send({ to: 'alice', text: 'hello' });
    assert.equal(mock.calls[0].opts.method, 'POST');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.toHandle, 'alice');
    assert.equal(body.payload.type, 'chat');
    assert.equal(body.payload.text, 'hello');
  });

  test('send includes timestamp', async () => {
    mock = mockFetch({ '/messages': { ok: true } });
    const client = new PalexplorerClient();
    const before = Date.now();
    await client.chat.send({ to: 'bob', text: 'hi' });
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.ok(body.payload.timestamp >= before);
  });

  test('receive fetches messages for handle', async () => {
    mock = mockFetch({ '/messages/alice': { messages: [{ text: 'hey' }] } });
    const client = new PalexplorerClient();
    const result = await client.chat.receive({ handle: 'alice' });
    assert.deepEqual(result.messages, [{ text: 'hey' }]);
  });

  test('receive adds deviceId query param', async () => {
    mock = mockFetch({ '*': { messages: [] } });
    const client = new PalexplorerClient();
    await client.chat.receive({ handle: 'alice', deviceId: 'dev1' });
    assert.ok(mock.calls[0].url.includes('deviceId=dev1'));
  });
});

describe('PresenceAPI', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('check fetches presence status', async () => {
    mock = mockFetch({ '/api/v1/presence/alice': { online: true, lastSeen: '2026-01-01' } });
    const client = new PalexplorerClient();
    const result = await client.presence.check('alice');
    assert.equal(result.online, true);
  });

  test('check strips @ prefix', async () => {
    mock = mockFetch({ '/api/v1/presence/alice': { online: false } });
    const client = new PalexplorerClient();
    await client.presence.check('@alice');
    assert.ok(mock.calls[0].url.includes('/presence/alice'));
    assert.ok(!mock.calls[0].url.includes('%40'));
  });

  test('heartbeat sends POST', async () => {
    mock = mockFetch({ '/api/v1/heartbeat': { ok: true } });
    const client = new PalexplorerClient();
    await client.presence.heartbeat({ handle: 'alice', deviceId: 'dev1' });
    assert.equal(mock.calls[0].opts.method, 'POST');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.handle, 'alice');
    assert.equal(body.deviceId, 'dev1');
  });
});

describe('CommentsAPI', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('list fetches comments for share', async () => {
    mock = mockFetch({ '/api/shares/s1/comments': { comments: [{ id: 'c1', text: 'nice' }] } });
    const client = new PalexplorerClient();
    const result = await client.comments.list('s1');
    assert.equal(result.comments[0].text, 'nice');
  });

  test('add sends POST with text', async () => {
    mock = mockFetch({ '/api/shares/s1/comments': { id: 'c2' } });
    const client = new PalexplorerClient();
    await client.comments.add('s1', 'great file');
    assert.equal(mock.calls[0].opts.method, 'POST');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.text, 'great file');
  });

  test('delete sends DELETE', async () => {
    mock = mockFetch({ '/api/shares/s1/comments/c1': { ok: true } });
    const client = new PalexplorerClient();
    await client.comments.delete('s1', 'c1');
    assert.equal(mock.calls[0].opts.method, 'DELETE');
  });

  test('encodes shareId in URL', async () => {
    mock = mockFetch({ '/api/shares/a%20b/comments': { comments: [] } });
    const client = new PalexplorerClient();
    await client.comments.list('a b');
    assert.ok(mock.calls[0].url.includes('a%20b'));
  });
});

describe('BroadcastAPI', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('toGroup sends POST with message', async () => {
    mock = mockFetch({ '/api/pals/groups/g1/broadcast': { ok: true, sent: 5 } });
    const client = new PalexplorerClient();
    const result = await client.broadcast.toGroup('g1', 'hello team');
    assert.equal(mock.calls[0].opts.method, 'POST');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.message, 'hello team');
    assert.equal(result.sent, 5);
  });

  test('start sends broadcast data', async () => {
    mock = mockFetch({ '/api/broadcast/start': { ok: true } });
    const client = new PalexplorerClient();
    await client.broadcast.start({ shareId: 's1', port: 6881 });
    assert.equal(mock.calls[0].opts.method, 'POST');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.shareId, 's1');
  });

  test('stop sends POST', async () => {
    mock = mockFetch({ '/api/broadcast/stop': { ok: true } });
    const client = new PalexplorerClient();
    await client.broadcast.stop();
    assert.equal(mock.calls[0].opts.method, 'POST');
  });
});

describe('AuditAPI', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('list fetches audit log', async () => {
    mock = mockFetch({ '/api/settings/audit-log': { entries: [{ action: 'download' }] } });
    const client = new PalexplorerClient();
    const result = await client.audit.list();
    assert.equal(result.entries[0].action, 'download');
  });

  test('list passes limit and offset', async () => {
    mock = mockFetch({ '*': { entries: [] } });
    const client = new PalexplorerClient();
    await client.audit.list({ limit: 10, offset: 20 });
    assert.ok(mock.calls[0].url.includes('limit=10'));
    assert.ok(mock.calls[0].url.includes('offset=20'));
  });

  test('list omits empty params', async () => {
    mock = mockFetch({ '/api/settings/audit-log': { entries: [] } });
    const client = new PalexplorerClient();
    await client.audit.list();
    assert.ok(!mock.calls[0].url.includes('?'));
  });

  test('export fetches with format=json', async () => {
    mock = mockFetch({ '*': { entries: [] } });
    const client = new PalexplorerClient();
    await client.audit.export();
    assert.ok(mock.calls[0].url.includes('format=json'));
  });

  test('clear sends DELETE', async () => {
    mock = mockFetch({ '/api/settings/audit-log': { ok: true } });
    const client = new PalexplorerClient();
    await client.audit.clear();
    assert.equal(mock.calls[0].opts.method, 'DELETE');
  });
});
