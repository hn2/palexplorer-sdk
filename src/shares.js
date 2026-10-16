export class SharesAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/shares');
  }

  async create({ path, visibility = 'private', recipients = [], password, sharedWithGroups = [] }) {
    return this.client.fetchLocal('/api/shares', {
      method: 'POST',
      body: JSON.stringify({ path, visibility, recipients, password, sharedWithGroups }),
    });
  }

  async remove(shareId) {
    return this.client.fetchLocal(`/api/shares/${encodeURIComponent(shareId)}`, {
      method: 'DELETE',
    });
  }

  async get(shareId) {
    return this.client.fetchLocal(`/api/shares/${encodeURIComponent(shareId)}`);
  }
}
