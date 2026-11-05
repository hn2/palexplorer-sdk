// Palexplorer SDK — TypeScript definitions
// @palexplorer/sdk@0.1.0-beta.2

export interface ClientOptions {
  /** Core IPC endpoint (named pipe / unix socket path; Node.js only). Preferred over localServer when set. */
  localSocket?: string;
  apiKey?: string;
  discoveryServer?: string;
  localServer?: string;
  localToken?: string;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  [key: string]: unknown;
}

export declare class PalexplorerError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown);
}

export declare class PalexplorerClient {
  apiKey: string | null;
  discoveryServer: string;
  localServer: string;
  localToken: string | null;
  timeout: number;
  auth: AuthAPI;
  shares: SharesAPI;
  transfers: TransfersAPI;
  chat: ChatAPI;
  presence: PresenceAPI;
  identity: IdentityAPI;
  crypto: CryptoAPI;
  groups: GroupsAPI;
  comments: CommentsAPI;
  broadcast: BroadcastAPI;
  audit: AuditAPI;
  settings: SettingsAPI;
  workspaces: WorkspacesAPI;
  pals: PalsAPI;
  billing: BillingAPI;
  shareLinks: ShareLinksAPI;
  networks: NetworksAPI;
  sync: SyncAPI;
  capabilities: CapabilitiesAPI;
  constructor(options?: ClientOptions);
  fetchLocal<T = ApiResponse>(path: string, options?: RequestInit): Promise<T>;
  fetchDiscovery<T = ApiResponse>(path: string, options?: RequestInit): Promise<T>;
}

export declare class DiscoveryClient {
  server: string;
  apiKey: string | null;
  timeout: number;
  constructor(options?: { server?: string; apiKey?: string; timeout?: number });
  fetch<T = ApiResponse>(path: string, options?: RequestInit): Promise<T>;
  resolve(handle: string): Promise<ApiResponse>;
  presence(handle: string): Promise<ApiResponse>;
  status(): Promise<ApiResponse>;
}

export declare class AuthAPI {
  constructor(client: PalexplorerClient);
  status(): Promise<ApiResponse>;
  me(): Promise<ApiResponse>;
  login(options: { username: string; password: string; totpCode?: string }): Promise<ApiResponse>;
  logout(): Promise<void>;
  refresh(): Promise<ApiResponse>;
  setupTotp(): Promise<ApiResponse>;
  verifyTotp(code: string): Promise<ApiResponse>;
  disableTotp(password: string): Promise<ApiResponse>;
  initQr(): Promise<ApiResponse>;
  pollQr(sessionId: string): Promise<ApiResponse>;
}

export declare class SharesAPI {
  constructor(client: PalexplorerClient);
  list(): Promise<ApiResponse[]>;
  get(shareId: string): Promise<ApiResponse>;
  create(options: {
    path: string;
    visibility?: 'private' | 'public' | string;
    recipients?: string[];
    password?: string;
    sharedWithGroups?: string[];
  }): Promise<ApiResponse>;
  remove(shareId: string): Promise<void>;
}

export declare class TransfersAPI {
  constructor(client: PalexplorerClient);
  list(): Promise<ApiResponse[]>;
  download(options: { magnet: string; name?: string; savePath?: string; encryptedShareKey?: string }): Promise<ApiResponse>;
  stats(): Promise<ApiResponse>;
  pause(magnet: string): Promise<void>;
  resume(magnet: string): Promise<void>;
  cancel(magnet: string): Promise<void>;
  files(magnet: string): Promise<ApiResponse>;
  downloadSelected(magnet: string, options: { fileIndices: number[]; destDir?: string }): Promise<ApiResponse>;
}

export declare class ChatAPI {
  constructor(client: PalexplorerClient);
  send(options: { to: string; text: string }): Promise<void>;
  receive(options: { handle: string; deviceId?: string }): Promise<ApiResponse[]>;
}

export declare class PresenceAPI {
  constructor(client: PalexplorerClient);
  check(handle: string): Promise<{ handle: string; online: boolean; devices?: unknown[] }>;
  heartbeat(options: { handle: string; deviceId: string }): Promise<void>;
}

export declare class IdentityAPI {
  constructor(client: PalexplorerClient);
  whoami(): Promise<ApiResponse>;
  resolve(handle: string): Promise<ApiResponse>;
  devices(handle: string): Promise<{ devices: unknown[] }>;
  proStatus(publicKey: string): Promise<ApiResponse>;
}

export declare class CryptoAPI {
  constructor(client: PalexplorerClient);
  sign(message: string, privateKeyHex: string): Promise<string>;
  verify(message: string, signatureHex: string, publicKeyHex: string): Promise<boolean>;
}

export declare class GroupsAPI {
  constructor(client: PalexplorerClient);
  list(): Promise<ApiResponse[]>;
  create(options: string | { name: string; description?: string; visibility?: string }): Promise<ApiResponse>;
  delete(groupId: string): Promise<void>;
  addMember(groupId: string, palId: string): Promise<void>;
  removeMember(groupId: string, palId: string): Promise<void>;
  broadcast(groupId: string, message: unknown): Promise<ApiResponse>;
}

export declare class CommentsAPI {
  constructor(client: PalexplorerClient);
  list(shareId: string): Promise<ApiResponse[]>;
  add(shareId: string, text: string): Promise<ApiResponse>;
  delete(shareId: string, commentId: string): Promise<void>;
}

export declare class BroadcastAPI {
  constructor(client: PalexplorerClient);
  toGroup(groupId: string, message: string): Promise<{ success: boolean; sent: number }>;
  start(data: Record<string, unknown>): Promise<void>;
  stop(): Promise<void>;
}

export declare class AuditAPI {
  constructor(client: PalexplorerClient);
  list(options?: { limit?: number; offset?: number }): Promise<ApiResponse[]>;
  export(): Promise<ApiResponse[]>;
  clear(): Promise<void>;
}

export declare class SettingsAPI {
  constructor(client: PalexplorerClient);
  get(): Promise<ApiResponse>;
  update(options?: {
    theme?: string;
    language?: string;
    autoConnect?: boolean;
    notifications?: boolean;
    analyticsEnabled?: boolean;
  }): Promise<ApiResponse>;
  listApiKeys(): Promise<ApiResponse[]>;
  createApiKey(name: string): Promise<ApiResponse>;
  revokeApiKey(id: string): Promise<void>;
}

export declare class WorkspacesAPI {
  constructor(client: PalexplorerClient);
  list(): Promise<ApiResponse[]>;
  create(name: string): Promise<ApiResponse>;
  delete(id: string): Promise<void>;
  activate(id: string): Promise<ApiResponse>;
  addShare(id: string, shareId: string): Promise<ApiResponse>;
  removeShare(id: string, shareId: string): Promise<void>;
}

export declare class PalsAPI {
  constructor(client: PalexplorerClient);
  list(): Promise<ApiResponse[]>;
  add(handle: string): Promise<ApiResponse>;
  remove(palId: string): Promise<void>;
  groups(): Promise<ApiResponse[]>;
  createGroup(options?: { name?: string; description?: string; visibility?: string }): Promise<ApiResponse>;
  deleteGroup(groupId: string): Promise<void>;
  addGroupMember(groupId: string, palId: string): Promise<void>;
  removeGroupMember(groupId: string, palId: string): Promise<void>;
}

export declare class BillingAPI {
  constructor(client: PalexplorerClient);
  status(): Promise<ApiResponse>;
  validate(publicKey: string): Promise<ApiResponse>;
  createCheckout(options?: { plan?: string; successUrl?: string; cancelUrl?: string }): Promise<{ url: string }>;
  createPortalSession(): Promise<{ url: string }>;
  activateLicense(licenseKey: string): Promise<void>;
  deactivateLicense(licenseKey: string): Promise<void>;
}

export declare class ShareLinksAPI {
  constructor(client: PalexplorerClient);
  create(options?: {
    shareId?: string;
    expiresIn?: number;
    password?: string;
    maxDownloads?: number;
    recipients?: string[];
  }): Promise<ApiResponse>;
  get(linkId: string): Promise<ApiResponse>;
  redeem(linkId: string, password?: string): Promise<{ magnet: string }>;
  createGroupLink(options?: { shareId?: string; groupId?: string }): Promise<ApiResponse>;
}

export declare class NetworksAPI {
  constructor(client: PalexplorerClient);
  list(): Promise<ApiResponse[]>;
  get(networkId: string): Promise<ApiResponse>;
  create(options?: { name?: string; description?: string; visibility?: string }): Promise<ApiResponse>;
  update(networkId: string, patch: Record<string, unknown>): Promise<ApiResponse>;
  delete(networkId: string): Promise<void>;
  members(networkId: string): Promise<ApiResponse[]>;
  invite(networkId: string): Promise<{ inviteCode: string }>;
  join(inviteCode: string): Promise<void>;
  updateMember(networkId: string, userId: string, patch: Record<string, unknown>): Promise<ApiResponse>;
}

export interface AiGrant {
  id: string;
  recipient: string;
  scopes: string[];
  sourceId: string | null;
  createdAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  revocationReason: string | null;
  state: 'active' | 'revoked' | 'expired';
}

export interface AiMemory {
  id: string;
  content: string;
  source: string | null;
  tags: string[];
  createdAt: number;
  retentionUntil: number | null;
}

export interface AiPolicy {
  enabled: boolean;
  cloudOptOut: boolean;
  localFallback: boolean;
  embeddingPolicy: 'local-only' | 'encrypted-portable' | 'hybrid';
  order: Array<{ provider: string; role: string; replaced?: string }>;
}

export declare class AiAPI {
  constructor(client: PalexplorerClient);
  overview(): Promise<{ policy: AiPolicy; scopes: Array<{ scope: string; risk: string; defaultRetentionMs: number }>; activeGrants: number; memories: number }>;
  listGrants(options?: { all?: boolean }): Promise<AiGrant[]>;
  revokeGrant(grantId: string): Promise<{ revoked: number }>;
  revokeAllGrants(): Promise<{ revoked: number }>;
  listMemories(options?: { all?: boolean }): Promise<AiMemory[]>;
  forgetMemory(memoryId: string): Promise<{ removed: number }>;
  getPolicy(): Promise<AiPolicy>;
  setPolicy(options: { cloudOptOut?: boolean; localFallback?: boolean; embeddingPolicy?: AiPolicy['embeddingPolicy'] }): Promise<AiPolicy>;
}

export interface SyncMessage { id: string; from: string; app: string; payload: unknown; receivedAt: string; }
export interface SyncPeer { publicKey: string; kind: 'pal' | 'device'; name: string; online: boolean; }

export declare class SyncAPI {
  capabilities(): Promise<{ schema: 'pal.capabilities/v1'; capabilities: { name: string; methods: string[] }[]; self: { publicKey: string }; app: string | null }>;
  register(app: string): Promise<{ ok: true }>;
  deliver(options: { app: string; to: string; payload: unknown }): Promise<{ ok: true; id: string }>;
  receive(options: { app: string; waitMs?: number; limit?: number; signal?: AbortSignal }): Promise<SyncMessage[]>;
  peers(): Promise<{ self: { publicKey: string }; peers: SyncPeer[] }>;
  subscribe(app: string, onMessage: (msg: SyncMessage) => unknown, options?: { waitMs?: number; retryMs?: number; onError?: (err: Error) => void }): () => Promise<void>;
}

export declare class CapabilitiesAPI {
  issueToken(options: { app: string; scopes?: 'sync:deliver'[] }): Promise<{ token: string; app: string; scopes: string[] }>;
  revokeTokens(app: string): Promise<{ revoked: number }>;
}
