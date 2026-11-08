export class PalsAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/pals');
  }

  async add(handle) {
    return this.client.fetchLocal('/api/pals', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    });
  }

  async remove(palId) {
    return this.client.fetchLocal(`/api/pals/${encodeURIComponent(palId)}`, {
      method: 'DELETE',
    });
  }

  async groups() {
    return this.client.fetchLocal('/api/groups');
  }

  async createGroup({ name, description, visibility } = {}) {
    return this.client.fetchLocal('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name, description, visibility }),
    });
  }

  async deleteGroup(groupId) {
    return this.client.fetchLocal(`/api/groups/${encodeURIComponent(groupId)}`, {
      method: 'DELETE',
    });
  }

  async addGroupMember(groupId, palId) {
    return this.client.fetchLocal(`/api/groups/${encodeURIComponent(groupId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ palId }),
    });
  }

  async removeGroupMember(groupId, palId) {
    return this.client.fetchLocal(`/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(palId)}`, {
      method: 'DELETE',
    });
  }
}
