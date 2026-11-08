import { routeOr } from './unsupported.js';

export class WorkspacesAPI {
  constructor(client) { this.client = client; }

  async list() {
    return routeOr(this.client, 'workspaces.list', async () => {
      return this.client.fetchLocal('/api/workspaces');
    });
  }

  async create(name) {
    return routeOr(this.client, 'workspaces.create', async () => {
      return this.client.fetchLocal('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    });
  }

  async delete(id) {
    return routeOr(this.client, 'workspaces.delete', async () => {
      return this.client.fetchLocal(`/api/workspaces/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    });
  }

  async activate(id) {
    return routeOr(this.client, 'workspaces.activate', async () => {
      return this.client.fetchLocal(`/api/workspaces/${encodeURIComponent(id)}/activate`, {
        method: 'POST',
      });
    });
  }

  async addShare(id, shareId) {
    return routeOr(this.client, 'workspaces.addShare', async () => {
      return this.client.fetchLocal(`/api/workspaces/${encodeURIComponent(id)}/shares`, {
        method: 'POST',
        body: JSON.stringify({ shareId }),
      });
    });
  }

  async removeShare(id, shareId) {
    return routeOr(this.client, 'workspaces.removeShare', async () => {
      return this.client.fetchLocal(`/api/workspaces/${encodeURIComponent(id)}/shares/${encodeURIComponent(shareId)}`, {
        method: 'DELETE',
      });
    });
  }
}
