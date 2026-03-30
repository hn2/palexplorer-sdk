export class WorkspacesAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/workspaces');
  }

  async create(name) {
    return this.client.fetchLocal('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async delete(id) {
    return this.client.fetchLocal(`/api/workspaces/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async activate(id) {
    return this.client.fetchLocal(`/api/workspaces/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    });
  }

  async addShare(id, shareId) {
    return this.client.fetchLocal(`/api/workspaces/${encodeURIComponent(id)}/shares`, {
      method: 'POST',
      body: JSON.stringify({ shareId }),
    });
  }

  async removeShare(id, shareId) {
    return this.client.fetchLocal(`/api/workspaces/${encodeURIComponent(id)}/shares/${encodeURIComponent(shareId)}`, {
      method: 'DELETE',
    });
  }
}
