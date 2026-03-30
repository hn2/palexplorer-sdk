export class SettingsAPI {
  constructor(client) { this.client = client; }

  async get() {
    return this.client.fetchLocal('/api/settings');
  }

  async update({ theme, language, autoConnect, notifications, analyticsEnabled } = {}) {
    return this.client.fetchLocal('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ theme, language, autoConnect, notifications, analyticsEnabled }),
    });
  }

  async listApiKeys() {
    return this.client.fetchLocal('/api/settings/api-keys');
  }

  async createApiKey(name) {
    return this.client.fetchLocal('/api/settings/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async revokeApiKey(id) {
    return this.client.fetchLocal(`/api/settings/api-keys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
