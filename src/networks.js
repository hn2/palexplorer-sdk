import { assertCanonicalId } from './identifiers.js';

export class NetworksAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/v1/networks');
  }

  async get(networkId) {
    assertCanonicalId(networkId, 'networkId', { allowSha384: this.client.allowEnterpriseSha384 });
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}`);
  }

  async create({ name, description, visibility } = {}) {
    return this.client.fetchLocal('/api/v1/networks', {
      method: 'POST',
      body: JSON.stringify({ name, description, visibility }),
    });
  }

  async update(networkId, patch) {
    assertCanonicalId(networkId, 'networkId', { allowSha384: this.client.allowEnterpriseSha384 });
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new TypeError('patch must be a plain object');
    }
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async delete(networkId) {
    assertCanonicalId(networkId, 'networkId', { allowSha384: this.client.allowEnterpriseSha384 });
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}`, {
      method: 'DELETE',
    });
  }

  async members(networkId) {
    assertCanonicalId(networkId, 'networkId', { allowSha384: this.client.allowEnterpriseSha384 });
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}/members`);
  }

  async invite(networkId) {
    assertCanonicalId(networkId, 'networkId', { allowSha384: this.client.allowEnterpriseSha384 });
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}/invite`, {
      method: 'POST',
    });
  }

  async join(inviteCode) {
    return this.client.fetchLocal(`/api/v1/networks/join/${encodeURIComponent(inviteCode)}`, {
      method: 'POST',
    });
  }

  async updateMember(networkId, userId, patch) {
    assertCanonicalId(networkId, 'networkId', { allowSha384: this.client.allowEnterpriseSha384 });
    assertCanonicalId(userId, 'userId', { allowSha384: this.client.allowEnterpriseSha384 });
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new TypeError('patch must be a plain object');
    }
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}/members/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }
}
