# @palexplorer/sdk

Official JavaScript SDK for the Palexplorer P2P file sharing API.

> **Status:** v0.1.0 — early stage, API stabilizing. Zero external dependencies, ES modules only.

## Installation

```bash
npm install @palexplorer/sdk
```

## Quick Start

```javascript
import { PalexplorerClient } from '@palexplorer/sdk';

const pal = new PalexplorerClient({
  apiKey: 'pk_pro_your_key_here',
  localServer: 'http://localhost:8585',
  localToken: 'your_bearer_token',
});

// List your shares
const shares = await pal.shares.list();
console.log(shares);

// Check if a pal is online
const status = await pal.presence.check('@alice');
console.log(status.online ? 'Alice is online' : 'Alice is offline');

// Send a chat message
await pal.chat.send({ to: '@alice', text: 'Hello!' });
```

## Authentication

### API Key (Discovery Server)

Required for discovery server operations (chat, presence, identity resolution). Get an API key from the Palexplorer settings page (Pro subscription required).

```javascript
const pal = new PalexplorerClient({
  apiKey: 'pk_pro_abc123...',
});
```

### Bearer Token (Local Daemon)

Required for local operations (shares, transfers, groups, comments, audit). Get the token by running `pal serve --web` or from your Palexplorer config.

```javascript
const pal = new PalexplorerClient({
  localServer: 'http://localhost:8585',
  localToken: 'your_bearer_token',
});
```

### Both

For full access to all features:

```javascript
const pal = new PalexplorerClient({
  apiKey: 'pk_pro_abc123...',
  localServer: 'http://localhost:8585',
  localToken: 'your_bearer_token',
});
```

## Configuration

```javascript
const pal = new PalexplorerClient({
  apiKey: 'pk_pro_...',                                // API key for discovery server
  discoveryServer: 'https://discovery.palexplorer.com', // Discovery server URL (default)
  localServer: 'http://localhost:8585',                 // Local daemon URL (default)
  localToken: 'bearer_token',                           // Local daemon auth token
  timeout: 10000,                                       // Request timeout in ms (default: 10000)
});
```

## API Reference

### PalexplorerClient

The main client class. All sub-APIs are accessed as properties.

```javascript
const pal = new PalexplorerClient(options);

pal.auth        // AuthAPI       — login, logout, TOTP, QR login
pal.shares      // SharesAPI     — create, list, delete, update shares
pal.transfers   // TransfersAPI  — download, pause, resume, stats
pal.chat        // ChatAPI       — send and receive messages
pal.presence    // PresenceAPI   — online status, heartbeat
pal.identity    // IdentityAPI   — whoami, resolve handles
pal.crypto      // CryptoAPI     — Ed25519 sign/verify
pal.groups      // GroupsAPI     — manage pal groups, broadcast
pal.comments    // CommentsAPI   — share comments
pal.broadcast   // BroadcastAPI  — group messaging, media broadcast
pal.audit       // AuditAPI      — audit log access
pal.settings    // SettingsAPI   — app settings, API key management
pal.workspaces  // WorkspacesAPI — workspace management
```

Internal methods (used by sub-APIs):
- `fetchLocal(path, options)` -- fetch from local daemon with Bearer auth
- `fetchDiscovery(path, options)` -- fetch from discovery server with API key

---

### SharesAPI (`pal.shares`)

Manages file shares via the local daemon.

| Method | Signature | Description |
|:---|:---|:---|
| `list()` | `() => Promise<Share[]>` | List all shares |
| `get(shareId)` | `(string) => Promise<Share>` | Get a single share by ID |
| `create(opts)` | `({ path, visibility?, recipients?, password?, sharedWithGroups? }) => Promise<Share>` | Create a share |
| `remove(shareId)` | `(string) => Promise<void>` | Remove/revoke a share |

```javascript
// Create a share visible to specific pals and groups
const share = await pal.shares.create({
  path: '/home/user/documents',
  visibility: 'private',            // 'global' or 'private'
  recipients: ['@alice', '@bob'],   // handles or public keys
  password: 'optional-password',
  sharedWithGroups: ['group-id-1'], // group IDs to notify
});

// List and remove
const shares = await pal.shares.list();
await pal.shares.remove(shares[0].id);
```

---

### GroupsAPI (`pal.groups`)

Manages pal groups via the local daemon.

| Method | Signature | Description |
|:---|:---|:---|
| `list()` | `() => Promise<Group[]>` | List all groups |
| `create(opts)` | `({ name, description?, visibility? }) => Promise<Group>` | Create a group |
| `delete(groupId)` | `(string) => Promise<void>` | Delete a group |
| `addMember(groupId, palId)` | `(string, string) => Promise<Group>` | Add a pal to a group by pal ID or public key |
| `removeMember(groupId, palId)` | `(string, string) => Promise<Group>` | Remove a pal from a group |
| `broadcast(groupId, message)` | `(string, string) => Promise<{ ok, sent, total }>` | Send message to all group members |

```javascript
const group = await pal.groups.create({ name: 'Team Alpha', visibility: 'private' });
await pal.groups.addMember(group.id, 'pal-id-or-public-key');
await pal.groups.broadcast(group.id, 'Meeting in 5 minutes!');
await pal.groups.removeMember(group.id, 'pal-id');
await pal.groups.delete(group.id);
```

---

### CommentsAPI (`pal.comments`)

Manages comments on shares via the local daemon.

| Method | Signature | Description |
|:---|:---|:---|
| `list(shareId)` | `(string) => Promise<Comment[]>` | List comments on a share |
| `add(shareId, text)` | `(string, string) => Promise<Comment>` | Add a comment |
| `delete(shareId, commentId)` | `(string, string) => Promise<void>` | Delete a comment |

```javascript
const comments = await pal.comments.list('share-id');
const comment = await pal.comments.add('share-id', 'Great file!');
await pal.comments.delete('share-id', comment.id);
```

---

### BroadcastAPI (`pal.broadcast`)

Group broadcast and streaming control.

| Method | Signature | Description |
|:---|:---|:---|
| `toGroup(groupId, message)` | `(string, string) => Promise<{ success, sent }>` | Broadcast message to all group members |
| `start(data)` | `(object) => Promise<void>` | Start a broadcast stream |
| `stop()` | `() => Promise<void>` | Stop the active broadcast stream |

```javascript
await pal.broadcast.toGroup('group-id', 'Hello everyone!');
await pal.broadcast.start({ path: '/media/stream' });
await pal.broadcast.stop();
```

---

### AuditAPI (`pal.audit`)

Access the local audit log.

| Method | Signature | Description |
|:---|:---|:---|
| `list(opts?)` | `({ limit?, offset? }) => Promise<AuditEntry[]>` | List audit log entries |
| `export()` | `() => Promise<AuditEntry[]>` | Export full audit log as JSON |
| `clear()` | `() => Promise<void>` | Clear the audit log |

```javascript
const entries = await pal.audit.list({ limit: 20, offset: 0 });
const all = await pal.audit.export();
await pal.audit.clear();
```

---

### TransfersAPI (`pal.transfers`)

Manages file transfers via the local daemon.

| Method | Signature | Description |
|:---|:---|:---|
| `list()` | `() => Promise<Transfer[]>` | List all active and historical transfers |
| `download(opts)` | `({ magnet, name, savePath, encryptedShareKey? }) => Promise<Transfer>` | Start a download |
| `stats()` | `() => Promise<Stats>` | Get transfer statistics (upload/download speed) |
| `pause(transferId)` | `(string) => Promise<void>` | Pause a transfer |
| `resume(transferId)` | `(string) => Promise<void>` | Resume a paused transfer |

```javascript
await pal.transfers.download({
  magnet: 'magnet:?xt=urn:btih:...',
  name: 'my-file',
  savePath: './downloads',
});

const stats = await pal.transfers.stats();
console.log(`Up: ${stats.uploadSpeed} B/s, Down: ${stats.downloadSpeed} B/s`);

const transfers = await pal.transfers.list();
await pal.transfers.pause(transfers[0].id);
await pal.transfers.resume(transfers[0].id);
```

---

### ChatAPI (`pal.chat`)

Send and receive messages via the discovery server.

| Method | Signature | Description |
|:---|:---|:---|
| `send(opts)` | `({ to, text, toPublicKey? }) => Promise<void>` | Send a chat message to a handle |
| `receive(opts)` | `({ handle, deviceId? }) => Promise<Message[]>` | Receive and consume messages (destructive -- messages deleted from server) |

```javascript
await pal.chat.send({ to: '@alice', text: 'Hello!' });

const messages = await pal.chat.receive({
  handle: 'myhandle',
  deviceId: 'my-device-id', // optional, for device-specific messages
});
```

---

### IdentityAPI (`pal.identity`)

Identity resolution across local daemon and discovery server.

| Method | Signature | Description |
|:---|:---|:---|
| `whoami()` | `() => Promise<Identity>` | Get your own identity from local daemon |
| `resolve(handle)` | `(string) => Promise<HandleEntry>` | Resolve a handle to public key via discovery server |
| `devices(handle)` | `(string) => Promise<{ devices: Device[] }>` | List devices for a handle |
| `proStatus(publicKey)` | `(string) => Promise<ProStatus>` | Check Pro subscription status for a public key |

```javascript
const me = await pal.identity.whoami();
const alice = await pal.identity.resolve('@alice');
const devices = await pal.identity.devices('@alice');
const pro = await pal.identity.proStatus('abcdef1234...');
```

---

### PresenceAPI (`pal.presence`)

Online presence via the discovery server.

| Method | Signature | Description |
|:---|:---|:---|
| `check(handle)` | `(string) => Promise<{ handle, online, devices }>` | Check if a handle is online |
| `heartbeat(opts)` | `({ handle, deviceId }) => Promise<void>` | Send heartbeat to keep device online |

```javascript
const status = await pal.presence.check('@alice');
// { handle: 'alice', online: true, devices: [{ deviceId, status, lastSeen }] }

await pal.presence.heartbeat({
  handle: 'myhandle',
  deviceId: 'my-device-id',
});
```

---

### CryptoAPI (`pal.crypto`)

Ed25519 signing and verification. Requires `sodium-native` installed separately.

| Method | Signature | Description |
|:---|:---|:---|
| `sign(message, privateKeyHex)` | `(string, string) => Promise<string>` | Sign a message, returns hex signature |
| `verify(message, signatureHex, publicKeyHex)` | `(string, string, string) => Promise<boolean>` | Verify a signature |

```javascript
const signature = await pal.crypto.sign('hello world', privateKeyHex);
const valid = await pal.crypto.verify('hello world', signature, publicKeyHex);
```

---

### AuthAPI (`pal.auth`)

Authentication operations against the local daemon.

| Method | Signature | Description |
|:---|:---|:---|
| `status()` | `() => Promise<{ setupRequired }>` | Check if initial setup is required |
| `me()` | `() => Promise<User>` | Get current authenticated user |
| `login(opts)` | `({ username, password, totpCode? }) => Promise<{ accessToken, user, requireTotp? }>` | Log in |
| `logout()` | `() => Promise<void>` | Log out and revoke refresh token |
| `refresh()` | `() => Promise<{ accessToken }>` | Renew access token via refresh cookie |
| `setupTotp()` | `() => Promise<{ secret, qrCode }>` | Begin TOTP 2FA setup |
| `verifyTotp(code)` | `(string) => Promise<void>` | Confirm TOTP code and enable 2FA |
| `disableTotp(password)` | `(string) => Promise<void>` | Disable 2FA |
| `initQr()` | `() => Promise<{ sessionId, challenge, linkCode, qrCode, expiresIn }>` | Start QR login session |
| `pollQr(sessionId)` | `(string) => Promise<{ status, accessToken?, user? }>` | Poll QR session for approval |

```javascript
// Check setup and login
const { setupRequired } = await pal.auth.status();
const { accessToken, user } = await pal.auth.login({ username: 'admin', password: 'pass' });

// Current user
const me = await pal.auth.me();

// TOTP 2FA setup
const { secret, qrCode } = await pal.auth.setupTotp();
await pal.auth.verifyTotp('123456');

// QR login (desktop → web pairing)
const { sessionId, qrCode: qr } = await pal.auth.initQr();
const result = await pal.auth.pollQr(sessionId);
// result.status: 'pending' | 'approved' | 'expired'
```

---

### SettingsAPI (`pal.settings`)

App settings and API key management via the local daemon.

| Method | Signature | Description |
|:---|:---|:---|
| `get()` | `() => Promise<{ settings, device, favorites }>` | Get current settings |
| `update(opts)` | `({ theme?, language?, autoConnect?, notifications?, analyticsEnabled? }) => Promise<void>` | Update settings |
| `listApiKeys()` | `() => Promise<ApiKey[]>` | List API keys |
| `createApiKey(name)` | `(string) => Promise<{ key, id }>` | Create a new API key |
| `revokeApiKey(id)` | `(string) => Promise<void>` | Revoke an API key |

```javascript
const { settings } = await pal.settings.get();
await pal.settings.update({ theme: 'dark', notifications: true });

const keys = await pal.settings.listApiKeys();
const { key, id } = await pal.settings.createApiKey('my-script');
await pal.settings.revokeApiKey(id);
```

---

### WorkspacesAPI (`pal.workspaces`)

Workspace management via the local daemon.

| Method | Signature | Description |
|:---|:---|:---|
| `list()` | `() => Promise<Workspace[]>` | List all workspaces |
| `create(name)` | `(string) => Promise<Workspace>` | Create a workspace |
| `delete(id)` | `(string) => Promise<void>` | Delete a workspace |
| `activate(id)` | `(string) => Promise<void>` | Set a workspace as active |
| `addShare(id, shareId)` | `(string, string) => Promise<void>` | Add a share to a workspace |
| `removeShare(id, shareId)` | `(string, string) => Promise<void>` | Remove a share from a workspace |

```javascript
const ws = await pal.workspaces.create('Project Alpha');
await pal.workspaces.activate(ws.workspace.id);
await pal.workspaces.addShare(ws.workspace.id, 'share-id');
await pal.workspaces.removeShare(ws.workspace.id, 'share-id');
await pal.workspaces.delete(ws.workspace.id);
```

---

### DiscoveryClient

Standalone lightweight client for discovery server operations only. Does not require a local daemon.

```javascript
import { DiscoveryClient } from '@palexplorer/sdk';

const discovery = new DiscoveryClient({
  server: 'https://discovery.palexplorer.com', // default
  apiKey: 'pk_pro_...',                         // optional
  timeout: 10000,                                // default
});
```

| Method | Signature | Description |
|:---|:---|:---|
| `resolve(handle)` | `(string) => Promise<HandleEntry>` | Resolve a handle to public key |
| `presence(handle)` | `(string) => Promise<PresenceInfo>` | Check online status |
| `status()` | `() => Promise<ServerStatus>` | Server health check |

```javascript
const entry = await discovery.resolve('alice');
const online = await discovery.presence('alice');
const health = await discovery.status();
```

## Error Handling

```javascript
import { PalexplorerClient, PalexplorerError } from '@palexplorer/sdk';

try {
  await pal.shares.list();
} catch (err) {
  if (err instanceof PalexplorerError) {
    console.log(err.status);  // HTTP status code
    console.log(err.message); // Error message
    console.log(err.body);    // Full response body
  }
}
```

## Rate Limits

| Plan | Requests/min | API Keys |
|------|-------------|----------|
| Free | No API access | 0 |
| Pro ($4.99/mo) | 600 | 3 |
| API Pro ($9.99/mo) | 600 | 5 |
| Enterprise ($5.99/user/mo) | 2,400 | 50 |

## Examples

See the [examples/](./examples/) directory:
- `quickstart.js` -- Basic usage
- `share-file.js` -- Create and manage shares
- `monitor-transfers.js` -- Real-time transfer monitoring
- `chat-bot.js` -- Auto-reply chat bot

## Requirements

- Node.js 18+
- Palexplorer desktop app running with `pal serve --web` (for local operations)
- Pro subscription (for API key and discovery server access)
- Optional: `sodium-native` for crypto operations

## License

Copyright (c) 2026 Palexplorer. All rights reserved. Proprietary and confidential.
