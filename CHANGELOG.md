# Changelog

All notable changes to `@palexplorer/sdk` will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0-beta.3] — 2026-11-05 (not yet published)

### Added

- `SyncAPI` (`pal.sync`): `pal.capabilities/v1` sync/deliver — send opaque JSON payloads to a pal or own device through the local core over PAL/3 (`register`, `deliver`, `receive` long-poll, `subscribe`, `peers`, `capabilities`) (hn2/palexplorer#930).
- `CapabilitiesAPI` (`pal.capabilities`): issue and revoke app-scoped tokens (needs the full local token).
- `localSocket` client option: talk to the core over its IPC endpoint (named pipe / unix socket) instead of loopback TCP; Node.js only.
- `fetchLocal` accepts `timeoutMs` and `signal`.

- `AiAPI` (`pal.ai`): list and revoke AI data grants, list and forget AI memories, read and change the AI provider and embeddings policy (palexplorer-extensions#25). Requires a Palexplorer desktop build that serves `/api/ai/*`.

## [0.1.0-beta.2] — 2026-08-28

### Fixed

- Ship the TypeScript declaration file referenced by the package manifest.
- Align declaration method names and signatures with the current JavaScript API.
- Forward the documented optional `savePath` in transfer download requests.

## [0.1.0-beta.1] — 2026-05-18

### Added

- Initial public beta release.
- 20 API modules: `PalexplorerClient`, `DiscoveryClient`, `AuthAPI`, `IdentityAPI`,
  `PalsAPI`, `GroupsAPI`, `NetworksAPI`, `SharesAPI`, `ShareLinksAPI`, `TransfersAPI`,
  `ChatAPI`, `BroadcastAPI`, `PresenceAPI`, `CommentsAPI`, `AuditAPI`, `SettingsAPI`,
  `WorkspacesAPI`, `BillingAPI`, `CryptoAPI`.
- Zero external runtime dependencies — ESM only.
- TypeScript type definitions (`dist/index.d.ts`).
- 52 passing unit tests across 11 suites.

### Known limitations

- No browser/UMD bundle — Node.js and React Native only.
- Beta API surface — minor breaking changes possible before v0.2.0.
- `CryptoAPI` is a thin wrapper; full E2EE is performed client-side in the desktop app.
