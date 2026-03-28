import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PalexplorerClient, PalexplorerError } from '../src/client.js';

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

describe('PalexplorerClient', () => {
  let mock;

  afterEach(() => { if (mock) mock.restore(); });

  test('constructor sets defaults', () => {
    const client = new PalexplorerClient();
    assert.equal(client.discoveryServer, 'https://discovery.palexplorer.com');
    assert.equal(client.localServer, 'http://localhost:8585');
    assert.equal(client.apiKey, null);
    assert.equal(client.timeout, 10000);
  });

  test('constructor accepts custom options', () => {
    const client = new PalexplorerClient({
      apiKey: 'pk_test_123',
      discoveryServer: 'https://my-server.com/',
      localServer: 'http://localhost:9999/',
      localToken: 'mytoken',
      timeout: 5000,
    });
    assert.equal(client.apiKey, 'pk_test_123');
    assert.equal(client.discoveryServer, 'https://my-server.com');
    assert.equal(client.localServer, 'http://localhost:9999');
    assert.equal(client.localToken, 'mytoken');
    assert.equal(client.timeout, 5000);
  });

  test('strips trailing slashes from servers', () => {
    const client = new PalexplorerClient({
      discoveryServer: 'https://d.com/',
      localServer: 'http://l.com/',
    });
    assert.equal(client.discoveryServer, 'https://d.com');
    assert.equal(client.localServer, 'http://l.com');
  });

  test('has all sub-APIs', () => {
    const client = new PalexplorerClient();
    assert.ok(client.shares);
    assert.ok(client.transfers);
    assert.ok(client.chat);
    assert.ok(client.presence);
    assert.ok(client.identity);
    assert.ok(client.crypto);
    assert.ok(client.groups);
    assert.ok(client.comments);
    assert.ok(client.broadcast);
    assert.ok(client.audit);
  });

  test('fetchLocal sends Bearer token', async () => {
    mock = mockFetch({ '/api/shares': { shares: [] } });
    const client = new PalexplorerClient({ localToken: 'tok123' });
    await client.fetchLocal('/api/shares');
    assert.equal(mock.calls.length, 1);
    assert.ok(mock.calls[0].opts.headers.Authorization.includes('tok123'));
  });

  test('fetchDiscovery sends API key', async () => {
    mock = mockFetch({ '/resolve/alice': { publicKey: 'pk' } });
    const client = new PalexplorerClient({ apiKey: 'pk_test' });
    await client.fetchDiscovery('/resolve/alice');
    assert.equal(mock.calls[0].opts.headers['X-API-Key'], 'pk_test');
  });

  test('fetchLocal throws PalexplorerError on failure', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false, status: 500,
      json: async () => ({ error: 'Server error' }),
    });
    const client = new PalexplorerClient();
    await assert.rejects(() => client.fetchLocal('/api/shares'), (err) => {
      assert.ok(err instanceof PalexplorerError);
      assert.equal(err.status, 500);
      assert.equal(err.message, 'Server error');
      return true;
    });
    globalThis.fetch = original;
  });
});

describe('SharesAPI', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('list calls /api/shares', async () => {
    mock = mockFetch({ '/api/shares': { shares: [{ id: 's1' }] } });
    const client = new PalexplorerClient();
    const result = await client.shares.list();
    assert.deepEqual(result, { shares: [{ id: 's1' }] });
  });

  test('create sends POST with body', async () => {
    mock = mockFetch({ '/api/shares': { id: 'new-share' } });
    const client = new PalexplorerClient();
    await client.shares.create({ path: '/tmp/test', visibility: 'private' });
    assert.equal(mock.calls[0].opts.method, 'POST');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.path, '/tmp/test');
    assert.equal(body.visibility, 'private');
  });

  test('remove sends DELETE', async () => {
    mock = mockFetch({ '/api/shares/s1': { ok: true } });
    const client = new PalexplorerClient();
    await client.shares.remove('s1');
    assert.equal(mock.calls[0].opts.method, 'DELETE');
  });

  test('get fetches single share', async () => {
    mock = mockFetch({ '/api/shares/s1': { id: 's1', path: '/data' } });
    const client = new PalexplorerClient();
    const result = await client.shares.get('s1');
    assert.equal(result.id, 's1');
  });
});

describe('IdentityAPI', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('whoami calls local server', async () => {
    mock = mockFetch({ '/api/identity': { name: 'Alice', handle: 'alice' } });
    const client = new PalexplorerClient();
    const result = await client.identity.whoami();
    assert.equal(result.name, 'Alice');
  });

  test('resolve strips @ prefix', async () => {
    mock = mockFetch({ '/resolve/alice': { publicKey: 'pk123' } });
    const client = new PalexplorerClient();
    await client.identity.resolve('@alice');
    assert.ok(mock.calls[0].url.includes('/resolve/alice'));
    assert.ok(!mock.calls[0].url.includes('%40'));
  });

  test('devices fetches from discovery', async () => {
    mock = mockFetch({ '/devices/alice': { devices: [] } });
    const client = new PalexplorerClient();
    const result = await client.identity.devices('alice');
    assert.ok(result.devices);
  });
});

describe('GroupsAPI', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('list calls /api/pals/groups', async () => {
    mock = mockFetch({ '/api/pals/groups': { groups: [] } });
    const client = new PalexplorerClient();
    const result = await client.groups.list();
    assert.ok(result.groups);
  });

  test('create sends group name', async () => {
    mock = mockFetch({ '/api/pals/groups': { id: 'g1', name: 'Team' } });
    const client = new PalexplorerClient();
    await client.groups.create('Team');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.name, 'Team');
  });

  test('delete sends DELETE', async () => {
    mock = mockFetch({ '/api/pals/groups/g1': { ok: true } });
    const client = new PalexplorerClient();
    await client.groups.delete('g1');
    assert.equal(mock.calls[0].opts.method, 'DELETE');
  });

  test('addMember sends POST', async () => {
    mock = mockFetch({ '/api/pals/groups/g1/members': { ok: true } });
    const client = new PalexplorerClient();
    await client.groups.addMember('g1', { id: 'p1', name: 'Bob' });
    assert.equal(mock.calls[0].opts.method, 'POST');
  });

  test('removeMember sends DELETE', async () => {
    mock = mockFetch({ '/api/pals/groups/g1/members/p1': { ok: true } });
    const client = new PalexplorerClient();
    await client.groups.removeMember('g1', 'p1');
    assert.equal(mock.calls[0].opts.method, 'DELETE');
  });
});
