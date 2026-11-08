import { unsupported } from './unsupported.js';

export class BillingAPI {
  constructor(client) { this.client = client; }

  async status() {
    return this.client.fetchLocal('/api/billing/status');
  }

  async validate(publicKey) {
    return this.client.fetchDiscovery(`/api/v1/billing/validate/${encodeURIComponent(publicKey)}`);
  }

  async createCheckout({ plan, successUrl, cancelUrl } = {}) {
    unsupported('billing.createCheckout');
  }

  async createPortalSession() {
    unsupported('billing.createPortalSession');
  }

  async activateLicense(licenseKey) {
    unsupported('billing.activateLicense');
  }

  async deactivateLicense(licenseKey) {
    unsupported('billing.deactivateLicense');
  }
}
