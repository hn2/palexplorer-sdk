# Changelog

All notable changes to `@palexplorer/sdk` will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
