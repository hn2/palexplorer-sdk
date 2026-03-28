export class GroupsAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/pals/groups');
  }

  async create(name) {
    return this.client.fetchLocal('/api/pals/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async delete(groupId) {
    return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}`, {
      method: 'DELETE',
    });
  }

  async addMember(groupId, pal) {
    return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ pal }),
    });
  }

  async removeMember(groupId, palId) {
    return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(palId)}`, {
      method: 'DELETE',
    });
  }
}
