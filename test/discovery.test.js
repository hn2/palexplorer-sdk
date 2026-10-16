import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DiscoveryClient } from '../src/discovery.js';

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

describe('DiscoveryClient', () => {
  let mock;
  afterEach(() => { if (mock) mock.restore(); });

  test('constructor sets defaults', () => {
    const client = new DiscoveryClient();
    assert.equal(client.server, 'https://discovery.palexplorer.com');
    assert.equal(client.apiKey, null);
    assert.equal(client.timeout, 10000);
  });

  test('constructor accepts options', () => {
    const client = new DiscoveryClient({
      server: 'https://my-server.com/',
      apiKey: 'key123',
      timeout: 5000,
    });
    assert.equal(client.server, 'https://my-server.com');
    assert.equal(client.apiKey, 'key123');
    assert.equal(client.timeout, 5000);
  });

  test('fetch sends API key header', async () => {
    mock = mockFetch({ '/status': { ok: true } });
    const client = new DiscoveryClient({ apiKey: 'mykey' });
    await client.fetch('/status');
    assert.equal(mock.calls[0].opts.headers['X-API-Key'], 'mykey');
  });

  test('fetch omits API key when not set', async () => {
    mock = mockFetch({ '/status': { ok: true } });
    const client = new DiscoveryClient();
    await client.fetch('/status');
    assert.equal(mock.calls[0].opts.headers['X-API-Key'], undefined);
  });

  test('fetch throws on error response', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false, status: 503,
      json: async () => ({ error: 'Service unavailable' }),
    });
    const client = new DiscoveryClient();
    await assert.rejects(() => client.fetch('/status'), { message: 'Service unavailable' });
    globalThis.fetch = original;
  });

  test('resolve calls /resolve/:handle', async () => {
    mock = mockFetch({ '/resolve/alice': { publicKey: 'pk', handle: 'alice' } });
    const client = new DiscoveryClient();
    const result = await client.resolve('alice');
    assert.equal(result.handle, 'alice');
    assert.ok(mock.calls[0].url.includes('/resolve/alice'));
  });

  test('presence calls /api/v1/presence/:handle', async () => {
    mock = mockFetch({ '/api/v1/presence/bob': { online: true } });
    const client = new DiscoveryClient();
    const result = await client.presence('bob');
    assert.equal(result.online, true);
  });

  test('status calls /status', async () => {
    mock = mockFetch({ '/status': { version: '1.4.0', peers: 42 } });
    const client = new DiscoveryClient();
    const result = await client.status();
    assert.equal(result.version, '1.4.0');
    assert.equal(result.peers, 42);
  });
});
