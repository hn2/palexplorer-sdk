import { routeOr } from './unsupported.js';

export class SettingsAPI {
  constructor(client) { this.client = client; }

  async get() {
    return routeOr(this.client, 'settings.get', async () => {
      return this.client.fetchLocal('/api/settings');
    });
  }

  async update({ theme, language, autoConnect, notifications, analyticsEnabled } = {}) {
    return routeOr(this.client, 'settings.update', async () => {
      return this.client.fetchLocal('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ theme, language, autoConnect, notifications, analyticsEnabled }),
      });
    });
  }

  async listApiKeys() {
    return routeOr(this.client, 'settings.listApiKeys', async () => {
      return this.client.fetchLocal('/api/settings/api-keys');
    });
  }

  async createApiKey(name) {
    return routeOr(this.client, 'settings.createApiKey', async () => {
      return this.client.fetchLocal('/api/settings/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    });
  }

  async revokeApiKey(id) {
    return routeOr(this.client, 'settings.revokeApiKey', async () => {
      return this.client.fetchLocal(`/api/settings/api-keys/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    });
  }
}
