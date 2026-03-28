export class DiscoveryClient {
  constructor(options = {}) {
    this.server = (options.server || 'https://discovery.palexplorer.com').replace(/\/$/, '');
    this.apiKey = options.apiKey || null;
    this.timeout = options.timeout || 10000;
  }

  async fetch(path, options = {}) {
    const url = `${this.server}${path}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;
    const res = await globalThis.fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async resolve(handle) {
    return this.fetch(`/resolve/${encodeURIComponent(handle)}`);
  }

  async presence(handle) {
    return this.fetch(`/api/v1/presence/${encodeURIComponent(handle)}`);
  }

  async status() {
    return this.fetch('/status');
  }
}
