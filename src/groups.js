import { routeOr } from './unsupported.js';

export class GroupsAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/groups');
  }

  async create(nameOrOpts = {}) {
    const { name, description, visibility } = typeof nameOrOpts === 'string'
      ? { name: nameOrOpts }
      : nameOrOpts;
    return this.client.fetchLocal('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name, description, visibility }),
    });
  }

  async delete(groupId) {
    return this.client.fetchLocal(`/api/groups/${encodeURIComponent(groupId)}`, {
      method: 'DELETE',
    });
  }

  async addMember(groupId, palId) {
    return this.client.fetchLocal(`/api/groups/${encodeURIComponent(groupId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ palId }),
    });
  }

  async removeMember(groupId, palId) {
    return this.client.fetchLocal(`/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(palId)}`, {
      method: 'DELETE',
    });
  }

  async broadcast(groupId, message) {
    return routeOr(this.client, 'groups.broadcast', async () => {
      return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}/broadcast`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    });
  }
}
