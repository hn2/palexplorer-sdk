# palexplorer-sdk — Beta Status

## Version & Status

- **Version**: 0.1.0-beta.1
- **Status**: Published beta — clean tree, published to npm
- **Modules**: 21 JS modules, zero runtime dependencies
- **Tests**: 57 passing (node --test), 100%
- **Git**: Up to date with origin/master, working tree clean

---

## Implemented

- **PalexplorerClient**: Top-level client with auto-connect and event emitter
- **DiscoveryClient**: Discovery server handshake and peer resolution
- **18+ API sub-modules**:
  - auth, identity, pals, groups, networks
  - shares, shareLinks, transfers
  - chat, broadcast, presence
  - comments, audit, settings, workspaces
  - billing, crypto
- **Zero dependencies**: Ships with no npm dependencies, fully self-contained
- **TypeScript types**: `dist/index.d.ts` shipped alongside the package
- **Published to npm**: `@palexplorer/sdk@0.1.0-beta.1` live on the npm registry
- **CI**: GitHub Actions workflow running tests on push

---

## Gaps

- **Examples potentially stale**: 4 example files exist but have not been re-verified against the current module APIs since the beta release
- **No README usage examples** for the newer modules (billing, crypto, shareLinks, networks, broadcast)

---

## Beta Blockers

_None outstanding — package is published and beta-ready._

---

## Nice-to-Have

- Verify all 4 example files run cleanly against the current module surface
- Automated example smoke tests in CI
- Browser bundle (ESM + UMD) built via Rollup or esbuild for web consumer use cases
- API versioning strategy documented before 1.0.0 to avoid breaking changes hitting consumers
