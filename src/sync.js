// pal.capabilities/v1 sync/deliver (hn2/palexplorer#930): send opaque JSON payloads to a pal or own device through the
// local Palexplorer core over PAL/3. The core owns every key; the app holds only a (preferably app-scoped) token.
const MAX_WAIT_MS = 25000;

export class SyncAPI {
  constructor(client) { this.client = client; }

  async capabilities() {
    return this.client.fetchLocal('/api/v1/capabilities');
  }

  async register(app) {
    return this.client.fetchLocal('/api/v1/sync/register', { method: 'POST', body: JSON.stringify({ app }) });
  }

  async deliver({ app, to, payload }) {
    return this.client.fetchLocal('/api/v1/sync/deliver', { method: 'POST', body: JSON.stringify({ app, to, payload }), timeoutMs: Math.max(this.client.timeout, 60000) });
  }

  async receive({ app, waitMs = 0, limit, signal } = {}) {
    const wait = Math.max(0, Math.min(Number(waitMs) || 0, MAX_WAIT_MS));
    const qs = new URLSearchParams({ app, waitMs: String(wait) });
    if (limit) qs.set('limit', String(limit));
    const { messages } = await this.client.fetchLocal(`/api/v1/sync/inbox?${qs}`, { timeoutMs: this.client.timeout + wait, signal });
    return messages;
  }

  async peers() {
    return this.client.fetchLocal('/api/v1/sync/peers');
  }

  // Long-polls the inbox and calls onMessage for each message, in order. Returns stop(); errors go to onError and the
  // loop retries after retryMs.
  subscribe(app, onMessage, { waitMs = MAX_WAIT_MS, retryMs = 1000, onError = () => {} } = {}) {
    let stopped = false;
    const controller = new AbortController();
    const loop = async () => {
      while (!stopped) {
        try {
          const messages = await this.receive({ app, waitMs, signal: controller.signal });
          for (const msg of messages) {
            if (stopped) return;
            await onMessage(msg);
          }
        } catch (err) {
          if (stopped) return;
          onError(err);
          await new Promise((resolve) => setTimeout(resolve, retryMs));
        }
      }
    };
    const done = loop();
    return () => { stopped = true; controller.abort(); return done; };
  }
}

export class CapabilitiesAPI {
  constructor(client) { this.client = client; }

  // Needs the full local token. The returned token is pinned to `app` and `scopes`; store it, it is shown only once.
  async issueToken({ app, scopes = ['sync:deliver'] }) {
    return this.client.fetchLocal('/api/v1/tokens', { method: 'POST', body: JSON.stringify({ app, scopes }) });
  }

  async revokeTokens(app) {
    return this.client.fetchLocal(`/api/v1/tokens/${encodeURIComponent(app)}`, { method: 'DELETE' });
  }
}
