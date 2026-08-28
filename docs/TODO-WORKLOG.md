# TODO / Maintenance Worklog

Working log of TODOs, discovered issues, and fixes for `@palexplorer/sdk`.
Started 2026-07-06.

## Sources checked

- Grep for `TODO|FIXME|HACK|XXX` (case-insensitive) across the repo — no real
  markers found. Only hits were a placeholder license key string
  (`README.md:454`, `XXXX-YYYY-ZZZZ`) and normal English words ("pending"
  as an enum value, `privateKeyHex`/`publicKeyHex` variable names).
- `gh issue list` on `hn2/palexplorer-sdk` — **0 open issues**.
- `npm test` — 57/57 passing before any changes.
- `docs/BETA-STATUS.md` (dated 2026-07-05, one day old) — described "Gaps"
  and "Nice-to-Have" items, used as the main lead for pending work.

## Discovered items

| # | Item | Location | Status |
|---|------|----------|--------|
| 1 | `transfers.download()` silently drops `savePath` | `src/transfers.js:8` | **Fixed** |
| 2 | `dist/index.d.ts` massively out of sync with real JS API (wrong method names/signatures for nearly every module) | `dist/index.d.ts` | **Fixed** |
| 3 | BETA-STATUS.md claims "no README examples" for billing/crypto/shareLinks/networks/broadcast | `docs/BETA-STATUS.md:33` | **False alarm** — README already documents all 5 with examples |
| 4 | BETA-STATUS.md claims examples "potentially stale" | `docs/BETA-STATUS.md:32` | **False alarm** — verified, all 4 examples match current API |
| 5 | BETA-STATUS.md describes client as having "auto-connect and event emitter" | `docs/BETA-STATUS.md:15` | **Doc-only inaccuracy**, not a code bug — left as-is, out of scope to rewrite doc prose further |
| 6 | `CryptoAPI` dynamically imports `sodium-native`, which is not in `dependencies` (project has zero-dependency policy) | `src/crypto.js:5,20` | **By design** — intentional optional peer dependency pattern (throws a clear install error if missing); not a bug |

### 1. `transfers.download()` dropped `savePath` (fixed)

`src/transfers.js` destructured `{ magnet, name, encryptedShareKey }` in
`download()`, silently discarding `savePath` even though:
- `docs/openapi.yaml:295` documents `savePath` as a valid request field,
- `README.md:229,238` documents and demonstrates `savePath` usage,
- `test/apis.test.js:35` already passed `savePath` in its test call,
  but only asserted `magnet`/`name`, so the drop went undetected.

**Fix**: added `savePath` to the destructured params and the JSON body in
`src/transfers.js:8-13`. Also strengthened `test/apis.test.js:35-40` to
assert `body.savePath === '/tmp'` so this can't silently regress again.

Risk: none — additive, non-breaking (new field is optional and was
already part of the documented contract).

Verified: `npm test` → 57/57 passing after fix.

### 2. `dist/index.d.ts` out of sync with implementation (fixed)

The shipped TypeScript definitions (`dist/index.d.ts`, referenced by
`package.json` `types` field and `exports.types`) did not match the actual
runtime API at all. Examples of the drift:

- `AuthAPI.login()` typed as `(handle: string, password: string)` — actual
  signature is `({ username, password, totpCode? })`.
- `ChatAPI` typed with `list()`/`send(peerHandle, message, options)` —
  actual methods are `send({ to, text })` / `receive({ handle, deviceId? })`.
- `TransfersAPI` typed with `get()`/`start()` — actual methods are
  `list()`, `download()`, `stats()`, `pause()`, `resume()`, `cancel()`,
  `files()`, `downloadSelected()`.
- `BillingAPI` typed with `subscription()`/`usage()`/`portal()` — actual
  methods are `status()`, `validate()`, `createCheckout()`,
  `createPortalSession()`, `activateLicense()`, `deactivateLicense()`.
- Similar mismatches across `CryptoAPI`, `GroupsAPI`, `CommentsAPI`,
  `BroadcastAPI`, `AuditAPI`, `SettingsAPI`, `WorkspacesAPI`, `PalsAPI`,
  `ShareLinksAPI`, `NetworksAPI`.

This means any TypeScript consumer of `@palexplorer/sdk` gets autocomplete
and type-checking that does not correspond to what the runtime actually
does — calls that type-check would throw at runtime, and real methods
would appear as type errors.

Root cause: `test/exports.test.js` only asserts that `dist/index.d.ts`
*exists* (`existsSync`), never that its contents match `src/`. `dist/` is
also gitignored (confirmed via `.gitignore` + `git ls-files dist/` →
empty), so this drift wasn't visible in `git diff` / PR review either —
it's a local build artifact that also happens to be what's included in
the published npm tarball per `package.json` `files`.

**Fix**: rewrote `dist/index.d.ts` from scratch, reading every module in
`src/*.js` and typing each method's real name, parameters, and return
shape.

Risk: low — types-only change, does not affect runtime `src/` behavior,
and no test previously depended on the old (wrong) content.

Verified: `npm test` → 57/57 passing after rewrite. No local `tsc` was
available to typecheck the `.d.ts` directly (and the project has an
explicit zero-dependency policy, so `typescript` was deliberately **not**
installed as a devDependency to check this) — verification was done by
manual line-by-line comparison against each `src/*.js` module plus a
brace-balance sanity check.

**Follow-up (deferred, not done here)**: consider a lightweight CI check
that fails if `dist/index.d.ts` doesn't export a method name for every
method defined in the corresponding `src/*.js` class, to prevent this
drift from recurring silently. Not implemented — would require either
adding a devDependency (contradicts zero-dependency policy for runtime,
though devDependencies are technically separate) or a hand-rolled parser,
which is a design decision (out of scope for this incremental pass).

### 3 & 4. BETA-STATUS.md "Gaps" section is stale (no fix needed)

Checked both claimed gaps against the actual repo state:
- README.md already has full sections with runnable code examples for
  `BillingAPI` (line 439), `CryptoAPI` (312), `ShareLinksAPI` (465),
  `NetworksAPI` (489), and `BroadcastAPI` (186).
- All 4 files in `examples/` (`quickstart.js`, `share-file.js`,
  `monitor-transfers.js`, `chat-bot.js`) were checked line-by-line against
  the real method signatures in `src/*.js` and syntax-checked with
  `node --check` — all pass, none are stale.

No code or doc change made for these two items beyond noting them here;
rewriting `docs/BETA-STATUS.md` prose was judged out of scope (it's a
status snapshot doc, not something this pass was asked to maintain), but
flagging so a future BETA-STATUS.md refresh can drop these two "Gaps"
bullets and the "auto-connect and event emitter" line.

## Deferred / blocked (not attempted)

- Nothing required credential rotation or cross-repo coordination with
  `@palexplorer/shared` — no integration issues with that package were
  found in this pass.
- No open GitHub issues existed to work from, and none were opened, since
  no bug/feature reached the bar of "needs an issue" beyond the two direct
  fixes above (which were small enough to fix in place per the task's
  "lowest-risk items first" instruction; still, see note below).
- `docs/BETA-STATUS.md` prose inaccuracies (item 5 above) — left as-is,
  documented but not edited.

## Test results

- Before any changes: `npm test` → 57 tests, 57 pass, 0 fail.
- After fix #1 (`transfers.download` savePath): 57 tests, 57 pass (test
  count unchanged — strengthened an existing assertion rather than adding
  a new test).
- After fix #2 (`dist/index.d.ts` rewrite): 57 tests, 57 pass.
- Final state: **57/57 passing**, no regressions.

## Files changed

- `src/transfers.js` — added `savePath` pass-through in `download()`.
- `test/apis.test.js` — added assertion that `savePath` is included in the
  download request body.
- `dist/index.d.ts` — full rewrite to match actual `src/*.js` API surface
  (gitignored/untracked file, but shipped in the npm tarball).
- `docs/TODO-WORKLOG.md` — this file (new).

No commits were made — all changes are uncommitted working-tree edits per
task instructions.
