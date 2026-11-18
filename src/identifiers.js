// Canonical SHA-256 (64 lowercase hex) and optional enterprise SHA-384 (96 lowercase hex) identifier
// validation and address-free response normalization at Palexplorer SDK boundaries (hn2/palexplorer-sdk#31).

export const SHA256_ID_RE = /^[0-9a-f]{64}$/;
export const SHA384_ID_RE = /^[0-9a-f]{96}$/;

const BANNED_PREFIX_RE = /^(?:blake2[bs]?|blake3|sha1|md5|btih):/i;
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

export function isSha256Id(value) {
  return typeof value === 'string' && SHA256_ID_RE.test(value);
}

export function isCanonicalId(value, { allowSha384 = false } = {}) {
  if (typeof value !== 'string') return false;
  if (SHA256_ID_RE.test(value)) return true;
  if (allowSha384 && SHA384_ID_RE.test(value)) return true;
  return false;
}

export function assertCanonicalId(value, name = 'id', { allowSha384 = false } = {}) {
  if (typeof value !== 'string' || !value) {
    throw new TypeError(`${name} must be a lowercase SHA-256 hex string (64 characters)`);
  }
  if (BANNED_PREFIX_RE.test(value)) {
    throw new TypeError(`${name} uses a forbidden hash algorithm; only SHA-256 (or enterprise SHA-384) is allowed`);
  }
  if (!isCanonicalId(value, { allowSha384 })) {
    throw new TypeError(
      allowSha384
        ? `${name} must be a lowercase SHA-256 (64 hex) or enterprise SHA-384 (96 hex) identifier`
        : `${name} must be a lowercase SHA-256 hex string (64 characters)`
    );
  }
  return value;
}

export function assertSafeTransferRef(value, name = 'transferRef') {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  if (BANNED_PREFIX_RE.test(value) || BTIH_MAGNET_RE.test(value)) {
    throw new TypeError(`${name} uses a forbidden legacy hash (btih/SHA-1/MD5/BLAKE); use PAL/3 SHA-256 identifiers`);
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
