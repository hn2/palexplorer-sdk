export class ChatAPI {
  constructor(client) { this.client = client; }

  async send({ to, text }) {
    return this.client.fetchDiscovery('/messages', {
      method: 'POST',
      body: JSON.stringify({
        toHandle: to,
        payload: { type: 'chat', text, timestamp: Date.now() },
      }),
    });
  }

  async receive({ handle, deviceId }) {
    const params = new URLSearchParams();
    if (deviceId) params.set('deviceId', deviceId);
    const qs = params.toString() ? `?${params}` : '';
    return this.client.fetchDiscovery(`/messages/${encodeURIComponent(handle)}${qs}`);
  }
}
