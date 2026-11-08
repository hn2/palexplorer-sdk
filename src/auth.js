import { unsupported } from './unsupported.js';

export class AuthAPI {
  constructor(client) { this.client = client; }

  async status() {
    return this.client.fetchLocal('/api/auth/status');
  }

  async me() {
    unsupported('auth.me');
  }

  async login({ username, password, totpCode } = {}) {
    return this.client.fetchLocal('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, totpCode }),
    });
  }

  async logout() {
    return this.client.fetchLocal('/api/auth/logout', {
      method: 'POST',
    });
  }

  async refresh() {
    return this.client.fetchLocal('/api/auth/refresh', {
      method: 'POST',
    });
  }

  async setupTotp() {
    unsupported('auth.setupTotp');
  }

  async verifyTotp(code) {
    unsupported('auth.verifyTotp');
  }

  async disableTotp(password) {
    unsupported('auth.disableTotp');
  }

  // QR login flow (desktop → web)
  async initQr() {
    unsupported('auth.initQr');
  }

  async pollQr(sessionId) {
    unsupported('auth.pollQr');
  }
}
