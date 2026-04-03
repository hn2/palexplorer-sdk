export class BillingAPI {
  constructor(client) { this.client = client; }

  async status() {
    return this.client.fetchLocal('/api/billing/status');
  }

  async validate(publicKey) {
    return this.client.fetchDiscovery(`/api/v1/billing/validate/${encodeURIComponent(publicKey)}`);
  }

  async createCheckout({ plan, successUrl, cancelUrl } = {}) {
    return this.client.fetchLocal('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, successUrl, cancelUrl }),
    });
  }

  async createPortalSession() {
    return this.client.fetchLocal('/api/billing/portal', {
      method: 'POST',
    });
  }

  async activateLicense(licenseKey) {
    return this.client.fetchLocal('/api/billing/license/activate', {
      method: 'POST',
      body: JSON.stringify({ licenseKey }),
    });
  }

  async deactivateLicense(licenseKey) {
    return this.client.fetchLocal('/api/billing/license/deactivate', {
      method: 'POST',
      body: JSON.stringify({ licenseKey }),
    });
  }
}
