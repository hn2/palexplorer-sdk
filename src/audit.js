export class AuditAPI {
  constructor(client) { this.client = client; }

  async list(opts = {}) {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set('limit', opts.limit);
    if (opts.offset != null) params.set('offset', opts.offset);
    const qs = params.toString();
    return this.client.fetchLocal(`/api/settings/audit-log${qs ? '?' + qs : ''}`);
  }

  async export() {
    return this.client.fetchLocal('/api/settings/audit-log?format=json');
  }

  async clear() {
    return this.client.fetchLocal('/api/settings/audit-log', {
      method: 'DELETE',
    });
  }
}
