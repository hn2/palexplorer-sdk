export class IdentityAPI {
  constructor(client) { this.client = client; }

  async whoami() {
    return this.client.fetchLocal('/api/identity');
  }

  async resolve(handle) {
    const h = handle.replace(/^@/, '');
    return this.client.fetchDiscovery(`/resolve/${encodeURIComponent(h)}`);
  }

  async devices(handle) {
    const h = handle.replace(/^@/, '');
    return this.client.fetchDiscovery(`/devices/${encodeURIComponent(h)}`);
  }

  async proStatus(publicKey) {
    return this.client.fetchDiscovery(`/api/v1/pro-status/${encodeURIComponent(publicKey)}`);
  }
}
