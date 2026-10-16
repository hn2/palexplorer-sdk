export class ShareLinksAPI {
  constructor(client) { this.client = client; }

  async create({ shareId, expiresIn, password, maxDownloads, recipients } = {}) {
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
    return this.client.fetchDiscovery('/api/v1/share-links-to-groups', {
      method: 'POST',
      body: JSON.stringify({ shareId, groupId }),
    });
  }
}
