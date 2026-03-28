export class PresenceAPI {
  constructor(client) { this.client = client; }

  async check(handle) {
    const h = handle.replace(/^@/, '');
    return this.client.fetchDiscovery(`/api/v1/presence/${encodeURIComponent(h)}`);
  }

  async heartbeat({ handle, deviceId }) {
    return this.client.fetchDiscovery('/api/v1/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ handle, deviceId }),
    });
  }
}
