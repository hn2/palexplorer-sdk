# Palexplorer SDK

Official Palexplorer SDK for JavaScript/Node.js.

## Stack
- JavaScript, Node.js 18+
- ES modules (import/export)
- Zero external dependencies

## Testing
- `npm test` (uses `node --test` built-in runner)

## Key Principles
- Public API surface — all changes must maintain backwards compatibility
- Zero-dependency policy — do not add any npm dependencies
- ES modules only — no CommonJS

<important>
- This is a public SDK. Never introduce breaking changes to exported APIs without explicit approval.
- Maintain zero dependencies — do not add any external packages.
- All exports must be stable and well-defined.
</important>
