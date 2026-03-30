export class BroadcastAPI {
  constructor(client) { this.client = client; }

  // Send a PAL/1.0 message to all members of a group
  async toGroup(groupId, message) {
    return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}/broadcast`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Media streaming broadcast — requires desktop app (Electron IPC)
  // Returns { error, desktopRequired: true } when called via REST API
  async start(data) {
    return this.client.fetchLocal('/api/broadcast/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async stop() {
    return this.client.fetchLocal('/api/broadcast/stop', {
      method: 'POST',
    });
  }
}
