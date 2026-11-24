import crypto from 'node:crypto';
import { PalexplorerError } from './errors.js';

const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const toBuffer = (v) => (Buffer.isBuffer(v) ? v : Buffer.from(String(v || ''), 'hex'));

// Headers the server asks for on key-owned routes (palexplorer-server#355): x-timestamp (ms epoch) and x-signature
// (hex Ed25519 over `${action}:${publicKey}:${timestamp}`). `identity` is { publicKey, privateKey }; privateKey is the
// 64-byte Ed25519 secret key (seed then public key) or the 32-byte seed, as bytes or hex.
export function ownershipHeaders(identity, action, publicKey, now = Date.now()) {
  if (!identity?.privateKey) {
    throw new PalexplorerError(`${action} needs the identity key to sign the request: pass { identity: { publicKey, privateKey } } to the client`, 401, {});
  }
  const secret = toBuffer(identity.privateKey);
  if (secret.length !== 32 && secret.length !== 64) throw new TypeError('identity.privateKey must be a 32-byte seed or a 64-byte Ed25519 secret key');
  const own = toBuffer(identity.publicKey).toString('hex');
  if (own !== String(publicKey).toLowerCase()) {
    throw new PalexplorerError(`${action} can only be asked for the identity's own public key`, 401, {});
  }
  const key = crypto.createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, secret.subarray(0, 32)]), format: 'der', type: 'pkcs8' });
  const timestamp = String(now);
  const signature = crypto.sign(null, Buffer.from(`${action}:${publicKey}:${timestamp}`), key).toString('hex');
  return { 'x-timestamp': timestamp, 'x-signature': signature };
}
