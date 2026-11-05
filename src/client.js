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
    // Local IPC endpoint of the core (named pipe on Windows, unix socket elsewhere; Node.js only). When set, local calls
    // go over it instead of loopback TCP: same API, far lower per-request cost.
    this.localSocket = typeof options.localSocket === 'string' && options.localSocket ? options.localSocket : null;
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
    if (this.localSocket) {
      const res = await requestOverSocket(this, path, { ...fetchOptions, headers, timeoutMs: timeoutMs || this.timeout, signal });
      if (res.status < 200 || res.status >= 300) throw new PalexplorerError(res.body.error || `HTTP ${res.status}`, res.status, res.body);
      return res.body;
    }
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs || this.timeout)]) : AbortSignal.timeout(timeoutMs || this.timeout),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new PalexplorerError(body.error || `HTTP ${res.status}`, res.status, body);
    }
    return res.json();
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

async function requestOverSocket(client, path, { method = 'GET', headers, body, timeoutMs, signal }) {
  const http = await import('node:http');
  client._socketAgent ||= new http.Agent({ keepAlive: true });
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath: client.localSocket, path, method, headers, agent: client._socketAgent, signal, timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let parsed = {};
        try { parsed = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; } catch { parsed = {}; }
        resolve({ status: res.statusCode, body: parsed });
      });
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('The operation was aborted due to timeout')));
    req.on('error', reject);
    req.end(body);
  });
}

export class PalexplorerError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'PalexplorerError';
    this.status = status;
    Object.defineProperty(this, 'body', { value: body, enumerable: false, writable: false });
  }
}
