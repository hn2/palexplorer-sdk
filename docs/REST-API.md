# Palexplorer REST API

**Base URL:** `http://localhost:8585/api` (local server, started by `pal serve --web`)

**Version:** v1 (current)

---

## Authentication

All endpoints except `/auth/*` and `/beta/*` require a valid JWT bearer token.

```
Authorization: Bearer <accessToken>
```

Tokens are obtained via `/api/auth/login`, `/api/auth/email/verify`, or OAuth flows. Tokens expire after 15 minutes; use `/api/auth/refresh` to renew (requires the httpOnly `refresh_token` cookie).

### CSRF Protection

All state-mutating requests (POST, PATCH, PUT, DELETE) except `/auth/*` require:
```
x-csrf-token: <value of csrf_token cookie>
```

The `csrf_token` cookie is set automatically on first page load. Read it client-side and echo it in the header.

---

## Auth

### `GET /auth/status`
Check whether initial setup is required.
```json
{ "setupRequired": true }
```

### `POST /auth/setup`
Create the first admin account.
```json
// Request
{ "username": "string (4-32 chars)", "password": "string (8-128 chars)" }

// Response
{ "accessToken": "string", "user": { "id": "string", "username": "string", "role": "owner" } }
```

### `POST /auth/login`
```json
// Request
{ "username": "string", "password": "string", "totpCode": "string (optional)" }

// Response
{ "accessToken": "string", "user": { "id": "string", "username": "string", "role": "string" }, "requireTotp": true }
// requireTotp:true means re-submit with totpCode
```

### `POST /auth/refresh`
Renew access token using the httpOnly refresh cookie.
```json
{ "accessToken": "string" }
```

### `POST /auth/logout`
Revoke the current refresh token and clear cookies.

### `GET /auth/me`
Get current authenticated user.
```json
{ "id": "string", "username": "string", "email": "string|null", "role": "string", "provider": "string|null" }
```

### `POST /auth/guest`
Create an anonymous guest session (limited access).
```json
{ "accessToken": "string", "user": { "id": "Guest", "username": "Guest", "guest": true } }
```

### TOTP 2FA

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/totp/setup` | Start TOTP setup — returns `{ secret, qrCode }` |
| POST | `/auth/totp/verify` | Confirm code and enable 2FA — body: `{ code }` |
| POST | `/auth/totp/disable` | Disable 2FA — body: `{ password }` |

### OAuth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/oauth/google` | Redirect to Google OAuth |
| GET | `/auth/oauth/github` | Redirect to GitHub OAuth |
| GET | `/auth/oauth/google/callback` | Google callback |
| GET | `/auth/oauth/github/callback` | GitHub callback |

### QR Login (Desktop → Web)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/qr/init` | Start QR session — returns `{ sessionId, challenge, linkCode, qrCode, expiresIn }` |
| POST | `/auth/qr/resolve` | Resolve 6-char link code — body: `{ code }` → `{ sessionId, challenge }` |
| GET | `/auth/qr/status/:sessionId` | Poll for approval — returns `{ status: pending\|approved\|expired, accessToken?, user? }` |
| POST | `/auth/qr/verify` | Desktop approves — body: `{ sessionId, publicKey, signature }` |

### Email Passwordless

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/email/send` | Send verification code — body: `{ email }` |
| POST | `/auth/email/verify` | Login with code — body: `{ email, code }` → `{ token, user }` |

---

## Identity

_Requires auth + registered user_

### `GET /identity`
Get current identity (private key stripped).
```json
{ "identity": { "publicKey": "string", "handle": "@string|null", "name": "string", "deviceId": "string" } }
```

### `POST /identity/init`
Create a new identity.
```json
// Request
{ "name": "string" }

// Response
{ "identity": { ... }, "mnemonic": "24 words" }
```

### `POST /identity/recover`
Recover identity from 24-word mnemonic.
```json
// Request
{ "mnemonic": "word1 word2 ...", "name": "string" }
```

### `POST /identity/register-handle`
Register an @handle (requires discovery server).
```json
// Request
{ "handle": "string (no @ prefix)" }
```

---

## Shares

_Requires auth + CSRF_

### `GET /shares`
List all local shares. Local file paths are stripped from responses.
```json
{ "shares": [{ "id": "string", "name": "string", "visibility": "public|private|unlisted", "magnet": "string", "recipients": [], "sharedWithGroups": [], "createdAt": "ISO8601" }] }
```

### `GET /shares/:id`
Get a single share by ID.
```json
{ "share": { ... } }
```

### `DELETE /shares/:id`
Remove a share.

### `PATCH /shares/:id`
Update share name or permissions.
```json
// Request
{ "name": "string (optional)", "permissions": {} }
```

### `POST /shares/:id/rotate-key`
Rotate the share's encryption key. Existing recipients must re-download.

### `GET /shares/pal/:handle`
Get shares belonging to a specific pal.

### Share Links

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shares/links` | List share links |
| POST | `/shares/links` | Create link — body: `{ shareId, expiresInHours?, password? }` |
| POST | `/shares/links/:id/access` | Verify password, increment download count — body: `{ password? }` |
| DELETE | `/shares/links/:id` | Delete link |

### Received Shares

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shares/received` | List shares received from others |
| POST | `/shares/add-magnet` | Add share via magnet — body: `{ magnet }` |
| POST | `/shares/add-link` | Add share via link — body: `{ link }` |
| DELETE | `/shares/received/:id` | Remove received share |

### Share Comments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shares/:id/comments` | List comments |
| POST | `/shares/:id/comments` | Add comment — body: `{ text }` |
| DELETE | `/shares/:id/comments/:commentId` | Delete comment |

---

## Transfers

_Requires auth + CSRF. Download/cancel operations proxy to the desktop app on localhost:9090._

### `GET /transfers`
List active and recent transfers.
```json
{ "active": [{ "magnet": "string", "name": "string", "progress": 0.0-1.0, "paused": false, "size": 0 }], "history": [] }
```

### `GET /transfers/stats`
Transfer statistics.
```json
{ "active": 2, "completed": 14, "downloading": 1, "totalBytes": 1048576 }
```

### `POST /transfers/download`
Start a download (requires desktop app running).
```json
// Request
{ "magnet": "magnet:?xt=...", "name": "string", "encryptedShareKey": "hex (optional)" }
```

### `POST /transfers/:magnet/pause`
### `POST /transfers/:magnet/resume`
### `DELETE /transfers/:magnet`
Cancel a transfer.

### `GET /transfers/:magnet/files`
List files in a torrent (requires desktop app).
```json
{ "files": [{ "name": "string", "size": 0, "index": 0 }] }
```

### `POST /transfers/:magnet/download-selected`
Download specific files.
```json
// Request
{ "fileIndices": [0, 2], "destDir": "/path/to/save" }
```

---

## Pals

_Requires auth + CSRF_

### `GET /pals`
```json
{ "pals": [{ "id": "string", "name": "string", "publicKey": "string", "handle": "@string|null", "addedAt": "ISO8601" }] }
```

### `POST /pals`
Add a pal by handle or public key.
```json
{ "name": "string", "handle": "@string (optional)", "key": "hex pubkey (optional)" }
```

### `DELETE /pals/:id`
### `GET /pals/:handle/devices`
Get devices for a pal (resolved via discovery server).

### Groups

| Method | Path | Description |
|--------|------|-------------|
| GET | `/pals/groups` | List groups |
| POST | `/pals/groups` | Create group — body: `{ name, description?, visibility? }` |
| POST | `/pals/groups/:id/members` | Add member — body: `{ palId }` |
| DELETE | `/pals/groups/:id/members/:palId` | Remove member |
| DELETE | `/pals/groups/:id` | Delete group |
| POST | `/pals/groups/:id/broadcast` | Send message to all group members — body: `{ message }` → `{ ok, sent, total }` |

### Messages

| Method | Path | Description |
|--------|------|-------------|
| GET | `/pals/messages/unread` | Unread count — `{ count }` |
| GET | `/pals/messages?pal=@handle` | Get messages (all or with specific pal) |
| POST | `/pals/messages` | Send message — body: `{ toHandle, toDeviceId?, text? }` |

---

## Discovery

_Requires auth + CSRF. Proxies to the configured discovery server._

### `GET /discovery/servers`
```json
{ "servers": ["https://..."], "healthy": ["https://..."] }
```

### `GET /discovery/resolve/:handle`
Resolve @handle to identity.
```json
{ "result": { "publicKey": "string", "handle": "string", "name": "string" } }
```

### `GET /discovery/search?q=&type=all|share|user&scope=public|private&page=1&limit=20`
Search shares and users.

### `GET /discovery/directory?q=`
Search the user directory.

### `GET /discovery/groups/search?q=`
Search public groups.

### `GET /discovery/shares/:handle`
Get public shares for a handle.

---

## Settings

_Requires auth + CSRF + registered user_

### `GET /settings`
```json
{ "settings": { "theme": "dark", "language": "en", "autoConnect": true, "notifications": true }, "device": { ... }, "favorites": [] }
```

### `PATCH /settings`
```json
{ "theme": "light|dark|system", "language": "string", "autoConnect": true, "notifications": true, "analyticsEnabled": true }
```

### `GET /settings/audit-log?limit=50`
```json
{ "entries": [{ "action": "string", "timestamp": "ISO8601", "details": {} }] }
```

### API Keys

| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings/api-keys` | List API keys |
| POST | `/settings/api-keys` | Create key — body: `{ name }` → `{ key, id }` |
| DELETE | `/settings/api-keys/:id` | Revoke key |

---

## Workspaces

_Requires auth + CSRF_

### `GET /workspaces`
```json
{ "workspaces": [{ "id": "string", "name": "string", "shares": [], "active": false, "createdAt": "ISO8601" }] }
```

### `POST /workspaces` — body: `{ name }`
### `DELETE /workspaces/:id`
### `POST /workspaces/:id/activate`
### `POST /workspaces/:id/shares` — body: `{ shareId }`
### `DELETE /workspaces/:id/shares/:shareId`

---

## Broadcast

_Requires auth + CSRF_

> **Note:** Media streaming broadcast (`start`/`stop`) requires the Palexplorer desktop app. These endpoints return `503 desktopRequired: true` when called via the web REST API. Group messaging broadcast is available via `POST /pals/groups/:id/broadcast`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/broadcast/start` | Start media broadcast (desktop only) |
| POST | `/broadcast/stop` | Stop media broadcast (desktop only) |

---

## Billing

_Requires auth_

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/status` | Pro plan status — `{ isPro, plan, expiresAt? }` |
| GET | `/billing/checkout` | Redirect to Lemon Squeezy checkout |
| GET | `/billing/portal` | Redirect to customer portal |

---

## Stream

_Requires auth_

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stream/status` | P2P streaming engine status |

> Media streaming is P2P only (`pal-stream://` Electron protocol). The web server has no disk streaming capability.

---

## Marketplace

_Public endpoints (no auth required for read)_

| Method | Path | Description |
|--------|------|-------------|
| GET | `/marketplace?q=&category=&sort=popular` | Search extensions |
| GET | `/marketplace/:id` | Extension details |
| POST | `/marketplace/publish` | Publish extension (auth required, multipart) |
| PUT | `/marketplace/publish/:id` | Update extension (auth + owner) |
| DELETE | `/marketplace/:id` | Delete (auth + owner) |
| GET | `/marketplace/:id/reviews` | List reviews |
| POST | `/marketplace/:id/reviews` | Add review — body: `{ rating: 1-5, comment? }` |
| GET | `/marketplace/:id/stats` | Download/rating stats (auth + author) |

---

## Beta

_Public_

| Method | Path | Description |
|--------|------|-------------|
| POST | `/beta/signup` | Sign up — body: `{ email, name? }` |
| GET | `/beta/count` | Signup count |
| GET | `/beta/list` | Admin list (requires `X-Admin-Token` header) |

---

## Error Responses

All errors follow:
```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / missing required field |
| 401 | Not authenticated |
| 403 | Forbidden (CSRF mismatch, wrong role, or disabled endpoint) |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate handle, already in group) |
| 429 | Rate limited |
| 503 | Desktop app required but not running |

---

## Rate Limits

- All `/api/*` routes: 100 req/min per IP
- Auth routes: stricter limit (20 req/min)
