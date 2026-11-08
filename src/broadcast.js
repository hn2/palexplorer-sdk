import { routeOr } from './unsupported.js';

export class BroadcastAPI {
  constructor(client) { this.client = client; }

  // Send a PAL/1.0 message to all members of a group
  async toGroup(groupId, message) {
    return routeOr(this.client, 'broadcast.toGroup', async () => {
      return this.client.fetchLocal(`/api/pals/groups/${encodeURIComponent(groupId)}/broadcast`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    });
  }

  // Media streaming broadcast — requires desktop app (Electron IPC)
  // Returns { error, desktopRequired: true } when called via REST API
  async start(data) {
    return routeOr(this.client, 'broadcast.start', async () => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new TypeError('data must be a plain object');
      }
      return this.client.fetchLocal('/api/broadcast/start', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });
  }

  async stop() {
    return routeOr(this.client, 'broadcast.stop', async () => {
      return this.client.fetchLocal('/api/broadcast/stop', {
        method: 'POST',
      });
    });
  }
}
