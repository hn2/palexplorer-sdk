import { SharesAPI } from './shares.js';
import { TransfersAPI } from './transfers.js';
import { ChatAPI } from './chat.js';
import { PresenceAPI } from './presence.js';
import { IdentityAPI } from './identity.js';
import { CryptoAPI } from './crypto.js';
import { GroupsAPI } from './groups.js';
import { CommentsAPI } from './comments.js';
import { BroadcastAPI } from './broadcast.js';
import { AuditAPI } from './audit.js';
import { SettingsAPI } from './settings.js';
import { WorkspacesAPI } from './workspaces.js';
import { AuthAPI } from './auth.js';
import { PalsAPI } from './pals.js';
import { BillingAPI } from './billing.js';
import { ShareLinksAPI } from './shareLinks.js';
import { NetworksAPI } from './networks.js';
import { AiAPI } from './ai.js';
import { SyncAPI, CapabilitiesAPI } from './sync.js';
import { readLocalEndpoint } from './endpoint.js';

import { PalexplorerError } from './errors.js';
export { PalexplorerError };

function validateServerUrl(raw, allowHttp = false) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new TypeError(`Invalid server URL: ${raw}`);
  }
  if (u.protocol === 'https:') return u.origin;
  if (allowHttp && u.protocol === 'http:') {
    const loopback = ['localhost', '127.0.0.1', '::1'];
    if (loopback.includes(u.hostname)) return u.origin;
    throw new TypeError(`HTTP only allowed for localhost, got ${u.hostname}`);
  }
  throw new TypeError(`Insecure server URL scheme: ${u.protocol}`);
}

export class PalexplorerClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || null;
    this.discoveryServer = validateServerUrl(options.discoveryServer || 'https://discovery.palexplorer.com');
    this.localServer = validateServerUrl(options.localServer || 'http://localhost:8585', true);
    this.localToken = options.localToken || null;
    if (options.localRoutes !== undefined && options.localRoutes !== 'stock' && options.localRoutes !== 'extended') {
      throw new TypeError("localRoutes must be 'stock' or 'extended'");
    }
    this.localRoutes = options.localRoutes || (options.localServer ? 'extended' : 'stock');
    // Local IPC endpoint of the core (named pipe on Windows, unix socket elsewhere; Node.js only). When set, local calls
    // go over it instead of loopback TCP: same API, far lower per-request cost.
    this.localSocket = typeof options.localSocket === 'string' && options.localSocket ? options.localSocket : null;
    // Without an explicit localSocket or localServer, /api/v1/* calls use the core's published IPC endpoint when it
    // exists (no TCP port, current user only). Other routes stay on loopback HTTP unless the core reports it serves the full API over IPC (fullApi).
    this._autoSocket = null;
    this._autoFullApi = false;
    if (!this.localSocket && !options.localServer && options.localEndpoint !== false) {
      const endpoint = readLocalEndpoint(options.localEndpointFile);
      this._autoSocket = endpoint ? endpoint.socket : null;
      this._autoFullApi = endpoint ? endpoint.fullApi : false;
    }
    this.timeout = (typeof options.timeout === 'number' && options.timeout > 0 && Number.isFinite(options.timeout))
      ? options.timeout
      : 10000;

    this.auth = new AuthAPI(this);
    this.shares = new SharesAPI(this);
    this.transfers = new TransfersAPI(this);
    this.chat = new ChatAPI(this);
    this.presence = new PresenceAPI(this);
    this.identity = new IdentityAPI(this);
    this.crypto = new CryptoAPI(this);
    this.groups = new GroupsAPI(this);
    this.comments = new CommentsAPI(this);
    this.broadcast = new BroadcastAPI(this);
    this.audit = new AuditAPI(this);
    this.settings = new SettingsAPI(this);
    this.workspaces = new WorkspacesAPI(this);
    this.pals = new PalsAPI(this);
    this.billing = new BillingAPI(this);
    this.shareLinks = new ShareLinksAPI(this);
    this.networks = new NetworksAPI(this);
    this.ai = new AiAPI(this);
    this.sync = new SyncAPI(this);
    this.capabilities = new CapabilitiesAPI(this);
  }

  async fetchLocal(path, options = {}) {
    const url = `${this.localServer}${path}`;
    const { timeoutMs, signal, ...fetchOptions } = options;
    const headers = { 'Content-Type': 'application/json', ...fetchOptions.headers };
    if (this.localToken) headers['Authorization'] = `Bearer ${this.localToken}`;
    const socketPath = this.localSocket || (this._autoSocket && (this._autoFullApi || path.startsWith('/api/v1/')) ? this._autoSocket : null);
    if (socketPath) {
      const res = await requestOverSocket(this, socketPath, path, { ...fetchOptions, headers, timeoutMs: timeoutMs || this.timeout, signal });
      if (res.status < 200 || res.status >= 300) throw new PalexplorerError(res.body.error || `HTTP ${res.status}`, res.status, res.body);
      return res.body;
    }
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: combineSignals(signal, AbortSignal.timeout(timeoutMs || this.timeout)),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new PalexplorerError(body.error || `HTTP ${res.status}`, res.status, body);
    }
    try {
      return await res.json();
    } catch {
      throw new PalexplorerError(`${path} did not return JSON; the local daemon probably has no such route`, res.status || 502, { notJson: true });
    }
  }

  async fetchDiscovery(path, options = {}) {
    const url = `${this.discoveryServer}${path}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;
    const res = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new PalexplorerError(body.error || `HTTP ${res.status}`, res.status, body);
    }
    return res.json();
  }
}

function combineSignals(...signals) {
  const active = signals.filter(Boolean);
  if (active.length === 1) return active[0];
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(active);
  const controller = new AbortController();
  for (const sig of active) {
    if (sig.aborted) { controller.abort(sig.reason); break; }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}

// The bearer token must only go to a socket owned by the current user. On unix this is checked; Windows named pipes
// cannot be checked from here, so never point localSocket at a path another user can create.
async function assertTrustedSocket(path) {
  if (process.platform === 'win32') return;
  const fs = await import('node:fs');
  const st = fs.statSync(path);
  if (!st.isSocket()) throw new PalexplorerError(`localSocket ${path} is not a socket`, 0, {});
  if (typeof process.getuid === 'function' && st.uid !== process.getuid()) {
    throw new PalexplorerError(`localSocket ${path} is owned by another user; refusing to send the local token`, 0, {});
  }
}

async function requestOverSocket(client, socketPath, path, { method = 'GET', headers, body, timeoutMs, signal }) {
  const http = await import('node:http');
  await assertTrustedSocket(client.localSocket);
  client._socketAgent ||= new http.Agent({ keepAlive: true });
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(deadline); fn(value); };
    const req = http.request({ socketPath, path, method, headers, agent: client._socketAgent, signal }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = undefined; }
        if (parsed === undefined && res.statusCode >= 200 && res.statusCode < 300) {
          finish(reject, new PalexplorerError(`${path} returned a malformed or empty response over IPC`, res.statusCode, { notJson: true }));
          return;
        }
        finish(resolve, { status: res.statusCode, body: parsed ?? {} });
      });
      res.on('error', (err) => finish(reject, err));
    });
    const deadline = setTimeout(() => { req.destroy(new Error('The operation was aborted due to timeout')); }, timeoutMs);
    req.on('error', (err) => finish(reject, err));
    req.end(body);
  });
}
