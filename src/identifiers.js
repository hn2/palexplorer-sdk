// Canonical PAL/3 SHA-384 (96 lowercase hex) identifier validation and address-free response
// normalization at Palexplorer SDK boundaries (PAL/3.0 §14.5, hn2/palexplorer-sdk#40).

export const SHA384_ID_RE = /^[0-9a-f]{96}$/;
export const SHA256_ID_RE = /^[0-9a-f]{64}$/;
export const ED25519_PUBLIC_KEY_RE = /^[0-9a-f]{64}$/;

const BANNED_PREFIX_RE = /^(?:blake2[bs]?|blake3|sha[0-9]*|md5|btih):/i;
const BTIH_MAGNET_RE = /\bxt=urn:btih:/i;
const PEER_ADDRESS_FIELDS = new Set([
  'ip',
  'port',
  'pal3Host',
  'pal3Port',
  'serveUrl',
  'directAddress',
  'externalAddress',
  'localIp',
  'remoteAddress',
  'remotePort',
  'endpoint',
  'endpoints',
]);

export function isSha384Id(value) {
  return typeof value === 'string' && SHA384_ID_RE.test(value);
}

export function isSha256Id(value) {
  return typeof value === 'string' && SHA256_ID_RE.test(value);
}

export function isCanonicalId(value, { allowLegacySha256 = false } = {}) {
  if (typeof value !== 'string') return false;
  if (SHA384_ID_RE.test(value)) return true;
  if (allowLegacySha256 && SHA256_ID_RE.test(value)) return true;
  return false;
}

export function assertCanonicalId(value, name = 'id', { allowLegacySha256 = false } = {}) {
  if (typeof value !== 'string' || !value) {
    throw new TypeError(`${name} must be a lowercase SHA-384 hex string (96 characters)`);
  }
  if (BANNED_PREFIX_RE.test(value)) {
    throw new TypeError(`${name} uses a forbidden hash algorithm; only PAL/3 SHA-384 (96 hex) identifiers are allowed`);
  }
  if (!isCanonicalId(value, { allowLegacySha256 })) {
    throw new TypeError(
      allowLegacySha256
        ? `${name} must be a lowercase SHA-384 (96 hex) or legacy SHA-256 (64 hex) identifier`
        : `${name} must be a lowercase SHA-384 hex string (96 characters)`
    );
  }
  return value;
}

export function assertEd25519PublicKey(value, name = 'publicKey') {
  if (typeof value !== 'string' || !value) {
    throw new TypeError(`${name} must be a 64-hex Ed25519 public key or 96-hex SHA-384 peer identifier`);
  }
  if (BANNED_PREFIX_RE.test(value)) {
    throw new TypeError(`${name} uses a forbidden hash algorithm`);
  }
  if (!ED25519_PUBLIC_KEY_RE.test(value) && !SHA384_ID_RE.test(value)) {
    throw new TypeError(`${name} must be a 64-hex Ed25519 public key or 96-hex SHA-384 peer identifier`);
  }
  return value;
}

export function assertSafeTransferRef(value, name = 'transferRef') {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  if (BTIH_MAGNET_RE.test(value) || BANNED_PREFIX_RE.test(value)) {
    throw new TypeError(`${name} uses a forbidden legacy hash (btih/SHA-1/MD5/BLAKE/SHA-256); use PAL/3 SHA-384 identifiers`);
  }
  return value;
}

export function sanitizeTransportResponse(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeTransportResponse);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (PEER_ADDRESS_FIELDS.has(k)) continue;
    out[k] = sanitizeTransportResponse(v);
  }
  return out;
}
