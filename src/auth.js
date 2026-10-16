export class AuthAPI {
  constructor(client) { this.client = client; }

  async status() {
    return this.client.fetchLocal('/api/auth/status');
  }

  async me() {
    return this.client.fetchLocal('/api/auth/me');
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
    return this.client.fetchLocal('/api/auth/totp/setup', {
      method: 'POST',
    });
  }

  async verifyTotp(code) {
    return this.client.fetchLocal('/api/auth/totp/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disableTotp(password) {
    return this.client.fetchLocal('/api/auth/totp/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // QR login flow (desktop → web)
  async initQr() {
    return this.client.fetchLocal('/api/auth/qr/init', { method: 'POST' });
  }

  async pollQr(sessionId) {
    return this.client.fetchLocal(`/api/auth/qr/status/${encodeURIComponent(sessionId)}`);
  }
}
