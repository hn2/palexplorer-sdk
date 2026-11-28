// #31: Canonical SHA-256 (64 lowercase hex) and optional enterprise SHA-384 (96 lowercase hex) identifier
// validation and address-free response normalization at Palexplorer SDK boundaries.
import './support/mock-local-api.js';
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  PalexplorerClient,
  DiscoveryClient,
  SHA256_ID_RE,
  SHA384_ID_RE,
  isSha384Id,
  isSha256Id,
  isCanonicalId,
  assertCanonicalId,
  assertSafeTransferRef,
  sanitizeTransportResponse,
} from '../src/index.js';

describe('canonical PAL/3 SHA-384 identifier validation (#31, #40)', () => {
  const validSha256 = 'ab'.repeat(32);
  const validSha384 = 'cd'.repeat(48);
  let originalFetch;

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
    originalFetch = null;
  });

  test('isSha384Id and isCanonicalId accept 96 lowercase hex by default and reject 64-hex, short, uppercase, or prefixed hashes', () => {
    assert.equal(isSha384Id(validSha384), true);
    assert.equal(isSha256Id(validSha256), true);
    assert.equal(isCanonicalId(validSha384), true);
    assert.equal(isCanonicalId(validSha256), false);
    assert.equal(isCanonicalId(validSha256, { allowLegacySha256: true }), true);
    assert.equal(SHA384_ID_RE.test(validSha384), true);
    assert.equal(SHA256_ID_RE.test(validSha256), true);

    for (const bad of [
      '',
      'ab'.repeat(8),
      'ab'.repeat(16),
      validSha256,
      'CD'.repeat(48),
      `sha256:${validSha256}`,
      `blake3:${validSha256}`,
      `blake2b:${validSha256}`,
      `sha1:${'ab'.repeat(20)}`,
      `md5:${'ab'.repeat(16)}`,
      `btih:${'ab'.repeat(20)}`,
    ]) {
      assert.equal(isSha384Id(bad), false, `expected false for ${bad}`);
      assert.throws(() => assertCanonicalId(bad, 'resourceId'), TypeError);
    }
  });

  test('SDK boundary methods reject malformed, truncated, or BLAKE/btih identifiers before making a request', async () => {
    let calls = 0;
    originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ({}) }; };

    const client = new PalexplorerClient({ localToken: 'tok' });
    await assert.rejects(() => client.sync.deliver({ app: 'fl', to: 'short', payload: {} }), TypeError);
    await assert.rejects(() => client.sync.deliver({ app: 'fl', to: `blake3:${validSha256}`, payload: {} }), /forbidden hash algorithm/);
    await assert.rejects(() => client.shares.get('short-share'), TypeError);
    await assert.rejects(() => client.shares.remove('AB'.repeat(48)), TypeError);
    await assert.rejects(() => client.identity.proStatus('not-a-valid-key'), TypeError);
    await assert.rejects(() => client.billing.validate('1234'), TypeError);
    await assert.rejects(() => client.networks.get('short-net'), TypeError);
    await assert.rejects(() => client.networks.updateMember(validSha384, 'short-user', { role: 'member' }), TypeError);
    await assert.rejects(() => client.shareLinks.create({ shareId: 'short' }), TypeError);
    await assert.rejects(() => client.transfers.download({ magnet: 'magnet:?xt=urn:btih:deadbeef' }), /forbidden legacy hash/);
    assert.equal(calls, 0);
  });

  test('SHA-384 (96-hex) identifiers work by default and 64-hex requires explicit allowLegacySha256', async () => {
    const seen = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      seen.push(new URL(url).pathname);
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    };

    const stdClient = new PalexplorerClient({ localToken: 'tok' });
    await assert.rejects(() => stdClient.shares.get(validSha256), TypeError);
    await stdClient.shares.get(validSha384);
    await stdClient.networks.get(validSha384);

    const legacyClient = new PalexplorerClient({ localToken: 'tok', allowLegacySha256: true });
    assert.equal(legacyClient.allowLegacySha256, true);
    await legacyClient.shares.get(validSha256);
    assert.deepEqual(seen, [`/api/shares/${validSha384}`, `/api/v1/networks/${validSha384}`, `/api/shares/${validSha256}`]);
  });

  test('transport response normalization strips peer IP, port, and endpoint fields', async () => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        self: { publicKey: validSha256, ip: '203.0.113.5', port: 52474 },
        peers: [
          {
            publicKey: 'ef'.repeat(32),
            kind: 'pal',
            name: 'Bob',
            online: true,
            ip: '198.51.100.9',
            port: 52474,
            pal3Host: '198.51.100.9',
            pal3Port: 52474,
            serveUrl: 'http://198.51.100.9:52474',
            directAddress: '198.51.100.9:52474',
            endpoints: [{ host: '198.51.100.9', port: 52474 }],
          },
        ],
      }),
    });

    const client = new PalexplorerClient({ localToken: 'tok' });
    const res = await client.sync.peers();
    assert.deepEqual(res, {
      self: { publicKey: validSha256 },
      peers: [{ publicKey: 'ef'.repeat(32), kind: 'pal', name: 'Bob', online: true }],
    });

    const disc = new DiscoveryClient();
    const resolved = await disc.resolve('bob');
    assert.equal(resolved.self.ip, undefined);
    assert.equal(resolved.peers[0].pal3Host, undefined);
    assert.equal(resolved.peers[0].endpoints, undefined);
  });

  test('assertSafeTransferRef accepts PAL/3 SHA-256 references and rejects btih/BLAKE/SHA-1/MD5', () => {
    assert.equal(assertSafeTransferRef(validSha256), validSha256);
    assert.equal(assertSafeTransferRef(`pal3://share/${validSha256}`), `pal3://share/${validSha256}`);
    assert.throws(() => assertSafeTransferRef('magnet:?xt=urn:btih:123456'), /forbidden legacy hash/);
    assert.throws(() => assertSafeTransferRef('blake3:123456'), /forbidden legacy hash/);
  });

  test('sanitizeTransportResponse recursively removes address keys without mutating primitives', () => {
    assert.equal(sanitizeTransportResponse(null), null);
    assert.equal(sanitizeTransportResponse('ok'), 'ok');
    assert.deepEqual(
      sanitizeTransportResponse({ id: validSha256, remoteAddress: '10.0.0.1', nested: [{ localIp: '192.168.1.2', name: 'doc' }] }),
      { id: validSha256, nested: [{ name: 'doc' }] },
    );
  });
});
