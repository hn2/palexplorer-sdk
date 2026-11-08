import { unsupported } from './unsupported.js';

export class BroadcastAPI {
  constructor(client) { this.client = client; }

  // Send a PAL/1.0 message to all members of a group
  async toGroup(groupId, message) {
    unsupported('broadcast.toGroup');
  }

  // Media streaming broadcast — requires desktop app (Electron IPC)
  // Returns { error, desktopRequired: true } when called via REST API
  async start(data) {
    unsupported('broadcast.start');
  }

  async stop() {
    unsupported('broadcast.stop');
  }
}
