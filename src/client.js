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
import { requestLocalIpc } from './localIpc.js';

import { PalexplorerError } from './errors.js';
export { PalexplorerError };

function validateServerUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new TypeError(`Invalid server URL: ${raw}`);
  }
  if (u.protocol === 'https:') return u.origin;
  throw new TypeError(`Insecure server URL scheme: ${u.protocol}`);
}

export class PalexplorerClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || null;
    this.discoveryServer = validateServerUrl(options.discoveryServer || 'https://discovery.palexplorer.com');
    if (options.localServer !== undefined) throw new TypeError('localServer was removed: use authenticated local IPC');
    this.localToken = options.localToken || null;
    if (options.localRoutes !== undefined && options.localRoutes !== 'stock' && options.localRoutes !== 'extended') {
      throw new TypeError("localRoutes must be 'stock' or 'extended'");
    }
    this.localRoutes = options.localRoutes || 'stock';
    this.localSocket = typeof options.localSocket === 'string' && options.localSocket ? options.localSocket : null;
    this.localEndpointFile = options.localEndpointFile;
    this.localEndpoint = options.localEndpoint !== false;
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
    const endpoint = this.localSocket ? { socket: this.localSocket } : (this.localEndpoint ? readLocalEndpoint(this.localEndpointFile) : null);
    if (!endpoint) throw new PalexplorerError('No trusted local IPC endpoint. Start the native core; HTTP fallback is disabled.', 503, {});
    const res = await requestLocalIpc(endpoint.socket, path, {
      method: options.method || 'GET', body: options.body, token: this.localToken,
      timeoutMs: options.timeoutMs || this.timeout, signal: options.signal,
    });
    if (res.status < 200 || res.status >= 300) throw new PalexplorerError(res.body.error || `IPC ${res.status}`, res.status, res.body);
    return res.body;
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
