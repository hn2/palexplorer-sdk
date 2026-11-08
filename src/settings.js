import { unsupported } from './unsupported.js';

export class SettingsAPI {
  constructor(client) { this.client = client; }

  async get() {
    unsupported('settings.get');
  }

  async update({ theme, language, autoConnect, notifications, analyticsEnabled } = {}) {
    unsupported('settings.update');
  }

  async listApiKeys() {
    unsupported('settings.listApiKeys');
  }

  async createApiKey(name) {
    unsupported('settings.createApiKey');
  }

  async revokeApiKey(id) {
    unsupported('settings.revokeApiKey');
  }
}
