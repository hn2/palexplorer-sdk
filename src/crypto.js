export class CryptoAPI {
  constructor(client) { this.client = client; }

  async sign(message, privateKeyHex) {
    let sodium;
    try { sodium = (await import('sodium-native')).default; } catch {
      throw new Error('sodium-native required for crypto operations: npm install sodium-native');
    }
    const sk = Buffer.from(privateKeyHex, 'hex');
    if (sk.length !== 64) throw new RangeError(`privateKey must be 64 bytes, got ${sk.length}`);
    try {
      const msg = Buffer.from(message, 'utf8');
      const sig = Buffer.alloc(sodium.crypto_sign_BYTES);
      sodium.crypto_sign_detached(sig, msg, sk);
      return sig.toString('hex');
    } finally {
      sk.fill(0);
    }
  }

  async verify(message, signatureHex, publicKeyHex) {
    let sodium;
    try { sodium = (await import('sodium-native')).default; } catch {
      throw new Error('sodium-native required for crypto operations: npm install sodium-native');
    }
    const pk = Buffer.from(publicKeyHex, 'hex');
    if (pk.length !== 32) throw new RangeError(`publicKey must be 32 bytes, got ${pk.length}`);
    const msg = Buffer.from(message, 'utf8');
    const sig = Buffer.from(signatureHex, 'hex');
    if (sig.length !== 64) throw new RangeError(`signature must be 64 bytes, got ${sig.length}`);
    return sodium.crypto_sign_verify_detached(sig, msg, pk);
  }
}
