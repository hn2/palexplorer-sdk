export class NetworksAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/v1/networks');
  }

  async get(networkId) {
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}`);
  }

  async create({ name, description, visibility } = {}) {
    return this.client.fetchLocal('/api/v1/networks', {
      method: 'POST',
      body: JSON.stringify({ name, description, visibility }),
    });
  }

  async update(networkId, patch) {
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async delete(networkId) {
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}`, {
      method: 'DELETE',
    });
  }

  async members(networkId) {
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}/members`);
  }

  async invite(networkId) {
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
    return this.client.fetchLocal(`/api/v1/networks/${encodeURIComponent(networkId)}/members/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }
}
