export class GroupsAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/pals/groups');
  }

  async create(nameOrOpts = {}) {
    const { name, description, visibility } = typeof nameOrOpts === 'string'
      ? { name: nameOrOpts }
      : nameOrOpts;
    return this.client.fetchLocal('/api/pals/groups', {
      method: 'POST',
      body: JSON.stringify({ name, description, visibility }),
    });
  }

  async delete(groupId) {
    return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}`, {
      method: 'DELETE',
    });
  }

  async addMember(groupId, palId) {
    return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ palId }),
    });
  }

  async removeMember(groupId, palId) {
    return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(palId)}`, {
      method: 'DELETE',
    });
  }

  async broadcast(groupId, message) {
    return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}/broadcast`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
}
