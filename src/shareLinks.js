import { assertCanonicalId } from './identifiers.js';

export class ShareLinksAPI {
  constructor(client) { this.client = client; }

  async create({ shareId, expiresIn, password, maxDownloads, recipients } = {}) {
    assertCanonicalId(shareId, 'shareId', { allowSha384: this.client.allowEnterpriseSha384 });
    return this.client.fetchDiscovery('/api/v1/share-links', {
      method: 'POST',
      body: JSON.stringify({ shareId, expiresIn, password, maxDownloads, recipients }),
    });
  }

  async get(linkId) {
    return this.client.fetchDiscovery(`/api/v1/share-links/${encodeURIComponent(linkId)}`);
  }

  async redeem(linkId, password) {
    return this.client.fetchDiscovery(`/api/v1/share-links/${encodeURIComponent(linkId)}/download`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async createGroupLink({ shareId, groupId } = {}) {
    assertCanonicalId(shareId, 'shareId', { allowSha384: this.client.allowEnterpriseSha384 });
    return this.client.fetchDiscovery('/api/v1/share-links-to-groups', {
      method: 'POST',
      body: JSON.stringify({ shareId, groupId }),
    });
  }
}
