import { assertEd25519PublicKey } from './identifiers.js';
import { ownershipHeaders } from './ownershipProof.js';

export class IdentityAPI {
  constructor(client) { this.client = client; }

  async whoami() {
    return this.client.fetchLocal('/api/identity');
  }

  async resolve(handle) {
    if (typeof handle !== 'string' || !handle.trim()) {
      throw new TypeError('handle must be a non-empty string');
    }
    const h = handle.replace(/^@/, '');
    if (!h) throw new TypeError('handle must be a non-empty string');
    return this.client.fetchDiscovery(`/resolve/${encodeURIComponent(h)}`);
  }

  async devices(handle) {
    if (typeof handle !== 'string' || !handle.trim()) {
      throw new TypeError('handle must be a non-empty string');
    }
    const h = handle.replace(/^@/, '');
    if (!h) throw new TypeError('handle must be a non-empty string');
    return this.client.fetchDiscovery(`/devices/${encodeURIComponent(h)}`);
  }

  async proStatus(publicKey) {
    assertEd25519PublicKey(publicKey, 'publicKey');
    const headers = ownershipHeaders(this.client.signingIdentity, 'pro-status', publicKey);
    return this.client.fetchDiscovery(`/api/v1/pro-status/${encodeURIComponent(publicKey)}`, { headers });
  }
}
