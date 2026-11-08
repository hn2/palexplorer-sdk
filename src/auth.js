import { routeOr } from './unsupported.js';

export class AuthAPI {
  constructor(client) { this.client = client; }

  async status() {
    return this.client.fetchLocal('/api/auth/status');
  }

  async me() {
    return routeOr(this.client, 'auth.me', async () => {
      return this.client.fetchLocal('/api/auth/me');
    });
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
    return routeOr(this.client, 'auth.setupTotp', async () => {
      return this.client.fetchLocal('/api/auth/totp/setup', {
        method: 'POST',
      });
    });
  }

  async verifyTotp(code) {
    return routeOr(this.client, 'auth.verifyTotp', async () => {
      return this.client.fetchLocal('/api/auth/totp/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    });
  }

  async disableTotp(password) {
    return routeOr(this.client, 'auth.disableTotp', async () => {
      return this.client.fetchLocal('/api/auth/totp/disable', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
    });
  }

  // QR login flow (desktop → web)
  async initQr() {
    return routeOr(this.client, 'auth.initQr', async () => {
      return this.client.fetchLocal('/api/auth/qr/init', { method: 'POST' });
    });
  }

  async pollQr(sessionId) {
    return routeOr(this.client, 'auth.pollQr', async () => {
      return this.client.fetchLocal(`/api/auth/qr/status/${encodeURIComponent(sessionId)}`);
    });
  }
}
