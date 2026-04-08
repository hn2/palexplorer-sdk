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
  }

  async fetchLocal(path, options = {}) {
    const url = `${this.localServer}${path}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.localToken) headers['Authorization'] = `Bearer ${this.localToken}`;
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

export class PalexplorerError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'PalexplorerError';
    this.status = status;
    Object.defineProperty(this, 'body', { value: body, enumerable: false, writable: false });
  }
}
