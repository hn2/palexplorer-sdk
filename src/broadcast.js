export class BroadcastAPI {
  constructor(client) { this.client = client; }

  async toGroup(groupId, message) {
    return this.client.fetchLocal(`/api/v1/groups/${encodeURIComponent(groupId)}/broadcast`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async start(data) {
    return this.client.fetchLocal('/api/v1/broadcast/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async stop() {
    return this.client.fetchLocal('/api/v1/broadcast/stop', {
      method: 'POST',
    });
  }
}
