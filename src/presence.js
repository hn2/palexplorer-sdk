export class PresenceAPI {
  constructor(client) { this.client = client; }

  async check(handle) {
    if (typeof handle !== 'string' || !handle.trim()) {
      throw new TypeError('handle must be a non-empty string');
    }
    const h = handle.replace(/^@/, '');
    if (!h) throw new TypeError('handle must be a non-empty string');
    return this.client.fetchDiscovery(`/api/v1/presence/${encodeURIComponent(h)}`);
  }

  async heartbeat({ handle, deviceId }) {
    return this.client.fetchDiscovery('/api/v1/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ handle, deviceId }),
    });
  }
}
