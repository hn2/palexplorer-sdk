export class AuditAPI {
  constructor(client) { this.client = client; }

  async list(opts = {}) {
    const params = new URLSearchParams();
    if (opts.limit != null) {
      const n = Number(opts.limit);
      if (!Number.isInteger(n) || n < 1 || n > 1000) throw new RangeError('limit must be 1-1000');
      params.set('limit', n);
    }
    if (opts.offset != null) {
      const n = Number(opts.offset);
      if (!Number.isInteger(n) || n < 0) throw new RangeError('offset must be non-negative');
      params.set('offset', n);
    }
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
