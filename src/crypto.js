export class CryptoAPI {
  constructor(client) { this.client = client; }

  async sign(message, privateKeyHex) {
    let sodium;
    try { sodium = (await import('sodium-native')).default; } catch {
      throw new Error('sodium-native required for crypto operations: npm install sodium-native');
    }
    const sk = Buffer.from(privateKeyHex, 'hex');
    const msg = Buffer.from(message, 'utf8');
    const sig = Buffer.alloc(sodium.crypto_sign_BYTES);
    sodium.crypto_sign_detached(sig, msg, sk);
    return sig.toString('hex');
  }

  async verify(message, signatureHex, publicKeyHex) {
    let sodium;
    try { sodium = (await import('sodium-native')).default; } catch {
      throw new Error('sodium-native required for crypto operations: npm install sodium-native');
    }
    const pk = Buffer.from(publicKeyHex, 'hex');
    const msg = Buffer.from(message, 'utf8');
    const sig = Buffer.from(signatureHex, 'hex');
    return sodium.crypto_sign_verify_detached(sig, msg, pk);
  }
}
