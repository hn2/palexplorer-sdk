import { routeOr } from './unsupported.js';
import { assertEd25519PublicKey } from './identifiers.js';
import { ownershipHeaders } from './ownershipProof.js';

export class BillingAPI {
  constructor(client) { this.client = client; }

  async status() {
    return this.client.fetchLocal('/api/billing/status');
  }

  async validate(publicKey) {
    assertEd25519PublicKey(publicKey, 'publicKey');
    const headers = ownershipHeaders(this.client.signingIdentity, 'billing-validate', publicKey);
    return this.client.fetchDiscovery(`/api/v1/billing/validate/${encodeURIComponent(publicKey)}`, { headers });
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
