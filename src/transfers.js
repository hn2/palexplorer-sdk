export class TransfersAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/transfers');
  }

  async download({ magnet, name, savePath, encryptedShareKey }) {
    return this.client.fetchLocal('/api/downloads', {
      method: 'POST',
      body: JSON.stringify({ magnet, name, savePath, encryptedShareKey }),
    });
  }

  async stats() {
    return this.client.fetchLocal('/api/stats');
  }

  async pause(transferId) {
    return this.client.fetchLocal(`/api/transfers/${encodeURIComponent(transferId)}/pause`, {
      method: 'POST',
    });
  }

  async resume(transferId) {
    return this.client.fetchLocal(`/api/transfers/${encodeURIComponent(transferId)}/resume`, {
      method: 'POST',
    });
  }
}
