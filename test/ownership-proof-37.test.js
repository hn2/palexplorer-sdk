import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PalexplorerClient } from '../src/client.js';

// Stands in for palexplorer-server#355: x-timestamp within 5 minutes, x-signature = Ed25519 over `<action>:<pk>:<ts>`.
function serverStub(calls) {
  return async (url, opts) => {
    const { pathname } = new URL(url);
    const pk = pathname.split('/').pop();
    const action = pathname.includes('/pro-status/') ? 'pro-status' : 'billing-validate';
    const sig = opts.headers['x-signature'];
    const ts = opts.headers['x-timestamp'];
    calls.push({ pathname, headers: opts.headers });
    const reply = (status, body) => ({ ok: status === 200, status, json: async () => body });
    if (!sig || !ts) return reply(401, { error: 'Signature required' });
    if (Math.abs(Date.now() - Number(ts)) > 5 * 60 * 1000) return reply(401, { error: 'Timestamp expired' });
    const key = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pk, 'hex')]), format: 'der', type: 'spki' });
    if (!crypto.verify(null, Buffer.from(`${action}:${pk}:${ts}`), key, Buffer.from(sig, 'hex'))) return reply(401, { error: 'Invalid signature' });
    return reply(200, { plan: 'pro', publicKey: pk });
  };
}

describe('identity.proStatus and billing.validate prove the key (#37)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(-32);
  const pk = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const pkHex = pk.toString('hex');
  const identity = { publicKey: pkHex, privateKey: Buffer.concat([seed, pk]).toString('hex') };
  let original;
  const calls = [];
  const install = () => { original = globalThis.fetch; globalThis.fetch = serverStub(calls); };
  afterEach(() => { if (original) globalThis.fetch = original; calls.length = 0; });

  test('proStatus_when_identity_given_sends_a_signature_the_server_accepts', async () => {
    install();
    const res = await new PalexplorerClient({ identity, localEndpoint: false }).identity.proStatus(pkHex);
    assert.equal(res.plan, 'pro');
    assert.equal(calls.length, 1);
  });

  test('validate_when_identity_given_sends_a_signature_the_server_accepts', async () => {
    install();
    const res = await new PalexplorerClient({ identity, localEndpoint: false }).billing.validate(pkHex);
    assert.equal(res.plan, 'pro');
  });

  test('a_32_byte_seed_and_byte_buffers_work_too', async () => {
    install();
    const client = new PalexplorerClient({ identity: { publicKey: pk, privateKey: seed }, localEndpoint: false });
    assert.equal((await client.identity.proStatus(pkHex)).plan, 'pro');
  });

  test('without_an_identity_the_call_rejects_with_401_and_sends_nothing', async () => {
    install();
    const client = new PalexplorerClient({ localEndpoint: false });
    await assert.rejects(() => client.identity.proStatus(pkHex), (e) => e.status === 401);
    await assert.rejects(() => client.billing.validate(pkHex), (e) => e.status === 401);
    assert.equal(calls.length, 0);
  });

  test('asking_for_another_key_is_refused_before_any_request', async () => {
    install();
    const client = new PalexplorerClient({ identity, localEndpoint: false });
    await assert.rejects(() => client.identity.proStatus('ab'.repeat(32)), (e) => e.status === 401);
    assert.equal(calls.length, 0);
  });

  test('the_signature_is_bound_to_the_action_so_the_stub_rejects_a_swapped_route', async () => {
    install();
    const { ownershipHeaders } = await import('../src/ownershipProof.js');
    const headers = ownershipHeaders(identity, 'pro-status', pkHex);
    const res = await globalThis.fetch(`https://x.test/api/v1/billing/validate/${pkHex}`, { headers });
    assert.equal(res.status, 401);
  });

  test('a_stale_timestamp_is_refused_by_the_server', async () => {
    install();
    const { ownershipHeaders } = await import('../src/ownershipProof.js');
    const headers = ownershipHeaders(identity, 'pro-status', pkHex, Date.now() - 10 * 60 * 1000);
    const res = await globalThis.fetch(`https://x.test/api/v1/pro-status/${pkHex}`, { headers });
    assert.equal(res.status, 401);
  });
});
