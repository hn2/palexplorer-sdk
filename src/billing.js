import { routeOr } from './unsupported.js';
import { assertCanonicalId } from './identifiers.js';

export class BillingAPI {
  constructor(client) { this.client = client; }

  async status() {
    return this.client.fetchLocal('/api/billing/status');
  }

  async validate(publicKey) {
    assertCanonicalId(publicKey, 'publicKey', { allowSha384: this.client.allowEnterpriseSha384 });
    return this.client.fetchDiscovery(`/api/v1/billing/validate/${encodeURIComponent(publicKey)}`);
  }

  async createCheckout({ plan, successUrl, cancelUrl } = {}) {
    return routeOr(this.client, 'billing.createCheckout', async () => {
      return this.client.fetchLocal('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan, successUrl, cancelUrl }),
      });
    });
  }

  async createPortalSession() {
    return routeOr(this.client, 'billing.createPortalSession', async () => {
      return this.client.fetchLocal('/api/billing/portal', {
        method: 'POST',
      });
    });
  }

  async activateLicense(licenseKey) {
    return routeOr(this.client, 'billing.activateLicense', async () => {
      return this.client.fetchLocal('/api/billing/license/activate', {
        method: 'POST',
        body: JSON.stringify({ licenseKey }),
      });
    });
  }

  async deactivateLicense(licenseKey) {
    return routeOr(this.client, 'billing.deactivateLicense', async () => {
      return this.client.fetchLocal('/api/billing/license/deactivate', {
        method: 'POST',
        body: JSON.stringify({ licenseKey }),
      });
    });
  }
}
