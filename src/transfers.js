import { unsupported } from './unsupported.js';

export class TransfersAPI {
  constructor(client) { this.client = client; }

  async list() {
    return this.client.fetchLocal('/api/transfers');
  }

  async download({ magnet, name, savePath, encryptedShareKey }) {
    return this.client.fetchLocal('/api/transfers/download', {
      method: 'POST',
      body: JSON.stringify({ magnet, name, savePath, encryptedShareKey }),
    });
  }

  async stats() {
    return this.client.fetchLocal('/api/stats');
  }

  async pause(magnet) {
    return this.client.fetchLocal(`/api/transfers/${encodeURIComponent(magnet)}/pause`, {
      method: 'POST',
    });
  }

  async resume(magnet) {
    return this.client.fetchLocal(`/api/transfers/${encodeURIComponent(magnet)}/resume`, {
      method: 'POST',
    });
  }

  async cancel(magnet) {
    return this.client.fetchLocal(`/api/transfers/${encodeURIComponent(magnet)}`, {
      method: 'DELETE',
    });
  }

  async files(magnet) {
    unsupported('transfers.files');
  }

  async downloadSelected(magnet, { fileIndices, destDir }) {
    unsupported('transfers.downloadSelected');
  }
}
