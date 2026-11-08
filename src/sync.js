// pal.capabilities/v1 sync/deliver (hn2/palexplorer#930): send opaque JSON payloads to a pal or own device through the
// local Palexplorer core over PAL/3. The core owns every key; the app holds only a (preferably app-scoped) token.
import { randomUUID } from 'node:crypto';

const MAX_WAIT_MS = 25000;
const randomKey = () => randomUUID();

export class SyncAPI {
  constructor(client) { this.client = client; }

  async capabilities() {
    return this.client.fetchLocal('/api/v1/capabilities');
  }

  async register(app) {
    return this.client.fetchLocal('/api/v1/sync/register', { method: 'POST', body: JSON.stringify({ app }) });
  }

  // `idempotencyKey` defaults to a fresh random id; pass the same key when retrying a delivery whose answer was lost so
  // the core can recognise it as the same request.
  async deliver({ app, to, payload, idempotencyKey = randomKey() }) {
    return this.client.fetchLocal('/api/v1/sync/deliver', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ app, to, payload, idempotencyKey }),
      timeoutMs: Math.max(this.client.timeout, 60000),
    });
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

  // Long-polls the inbox and calls onMessage for each message, in order. A throwing onMessage is reported to onError and
  // the rest of the batch is still delivered. Poll failures are retried with bounded exponential backoff (retryMs doubling
  // up to maxRetryMs, with jitter); after maxFailures consecutive failures the subscription stops and reports it.
  // Returns stop(): it aborts the in-flight poll and the retry wait, and may be called (and awaited) from onMessage.
  subscribe(app, onMessage, {
    waitMs = MAX_WAIT_MS, retryMs = 1000, maxRetryMs = 30000, maxFailures = Infinity,
    onError = (err) => console.warn(`[pal.sync] ${app}: ${err.message}`),
  } = {}) {
    let stopped = false;
    let handling = false;
    let wake = null;
    const controller = new AbortController();
    const report = (err) => { try { onError(err); } catch { /* a faulty error handler must not end the subscription */ } };
    const sleep = (ms) => new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      wake = () => { clearTimeout(timer); resolve(); };
    });
    const loop = async () => {
      let failures = 0;
      while (!stopped) {
        let messages;
        try {
          messages = await this.receive({ app, waitMs, signal: controller.signal });
          failures = 0;
        } catch (err) {
          if (stopped) return;
          failures += 1;
          report(err);
          if (failures >= maxFailures) {
            report(new Error(`subscription stopped after ${failures} consecutive failures`));
            stopped = true;
            return;
          }
          const base = Math.min(retryMs * 2 ** (failures - 1), maxRetryMs);
          await sleep(base / 2 + Math.random() * (base / 2));
          continue;
        }
        if (!messages.length && waitMs < 1000) await sleep(retryMs);
        for (const msg of messages) {
          if (stopped) return;
          handling = true;
          try {
            await onMessage(msg);
          } catch (err) {
            report(err);
          } finally {
            handling = false;
          }
        }
      }
    };
    const done = loop();
    return () => {
      stopped = true;
      controller.abort();
      if (wake) wake();
      return handling ? Promise.resolve() : done;
    };
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
