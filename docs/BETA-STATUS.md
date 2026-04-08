# palexplorer-sdk — Beta Status

## Version & Status

- **Version**: 0.1.0
- **Status**: Pre-beta — all modules implemented, 7 unstaged changes, not yet published to npm
- **Modules**: 21 JS modules, zero runtime dependencies
- **Tests**: 52 passing (11 suites), 100%
- **Git**: Ahead of origin by 1 commit, 7 unstaged changes

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

---

## Gaps

- **7 unstaged changes** — working tree is dirty; changes not committed or pushed
- **Not published to npm** — version 0.1.0 has never been published; no beta release exists
- **No TypeScript types**: No `.d.ts` files or JSDoc type exports; consumers get no IDE autocomplete
- **Examples potentially stale**: 4 example files exist but have not been verified against current module APIs
- **No README usage examples** for the newer modules (billing, crypto, shareLinks, networks, broadcast)
- **Not pushed to origin** — remote is behind

---

## Beta Blockers

1. **Commit and push the 7 unstaged changes** — remote must be in sync before any publish
2. **Publish to npm** — at minimum a `0.1.0-beta.1` tag so desktop and mobile can depend on it by version
3. **Verify examples** — all 4 example files must run cleanly against the current module surface
4. **Sync README** — top-level README must list all 18+ sub-modules with at least one usage snippet each

---

## Nice-to-Have

- TypeScript declaration files (`.d.ts`) — either hand-authored or generated via JSDoc + tsc
- Automated example smoke tests in CI
- Changelog (`CHANGELOG.md`) tracking breaking changes per minor version
- Browser bundle (ESM + UMD) built via Rollup or esbuild for web consumer use cases
- API versioning strategy documented before 1.0.0 to avoid breaking changes hitting consumers
