import { unsupported } from './unsupported.js';

export class AuditAPI {
  constructor(client) { this.client = client; }

  async list(opts = {}) {
    unsupported('audit.list');
  }

  async export() {
    unsupported('audit.export');
  }

  async clear() {
    unsupported('audit.clear');
  }
}
