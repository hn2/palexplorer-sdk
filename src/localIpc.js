import { PalexplorerError } from './errors.js';

export const LOCAL_IPC_SCHEMA = 'pal.local-ipc/v1';
const MAX_FRAME = 128 * 1024;
const MAX_BODY = 16 * 1024 * 1024;

export function isLocalPipe(value) {
  return typeof value === 'string' && /^\\\\\.\\pipe\\[a-zA-Z0-9._-]{1,200}$/.test(value);
}

const MAX_HEADERS = 16;

function requestHeaders(headers) {
  if (headers === undefined) return undefined;
  if (!headers || typeof headers !== 'object' || Array.isArray(headers) || Object.keys(headers).length > MAX_HEADERS) throw new TypeError('Local IPC headers must be a small object');
  for (const [name, value] of Object.entries(headers)) {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(name) || typeof value !== 'string' || value.length > 256) throw new TypeError('Invalid local IPC header ' + name);
  }
  return headers;
}

// Every directory above the socket must belong to the current user or root and must not be writable by others,
// unless it is sticky (like /tmp), so nobody can swap the path between this check and the connect.
export function assertTrustedAncestors(socketPath, fs, path, uid) {
  let dir = path.dirname(socketPath);
  for (;;) {
    const st = fs.statSync(dir);
    const sticky = (st.mode & 0o1000) !== 0;
    if ((st.uid !== uid && st.uid !== 0) || ((st.mode & 0o022) !== 0 && !sticky)) {
      throw new PalexplorerError('Every directory above the IPC socket must be owned by you or root and closed to other users', 0, {});
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

async function assertTrustedSocket(value) {
  const path = await import('node:path');
  if (process.platform === 'win32') {
    if (!isLocalPipe(value)) throw new PalexplorerError('Only a local Windows named pipe is allowed', 0, {});
    return value;
  }
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) throw new PalexplorerError('An absolute local socket is required', 0, {});
  const fs = await import('node:fs');
  const st = fs.lstatSync(value);
  const parent = fs.statSync(path.dirname(value));
  if (!st.isSocket() || st.uid !== process.getuid() || parent.uid !== process.getuid() || (parent.mode & 0o022) !== 0) {
    throw new PalexplorerError('The IPC socket and its directory must belong to the current user', 0, {});
  }
  const real = fs.realpathSync(value);
  assertTrustedAncestors(real, fs, path, process.getuid());
  return real;
}

function frame(value) {
  const body = Buffer.from(JSON.stringify(value));
  if (body.length > 17 * 1024 * 1024) throw new PalexplorerError('IPC request is too large', 413, {});
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(body.length);
  return Buffer.concat([header, body]);
}

export async function requestLocalIpc(socketPath, path, { method = 'GET', body, token, timeoutMs, signal, headers: extraHeaders, secret }) {
  if (typeof token !== 'string' || !token) throw new PalexplorerError('A local IPC token is required', 401, {});
  if (body !== undefined && typeof body !== 'string') throw new TypeError('Local IPC bodies must be JSON strings');
  if (body && Buffer.byteLength(body) > MAX_BODY) throw new PalexplorerError('IPC request is too large', 413, {});
  const headerMap = requestHeaders(extraHeaders);
  if (secret !== undefined && (typeof secret !== 'string' || !/^[0-9a-f]{64}$/.test(secret))) throw new TypeError('The local IPC secret must be 64 hex characters');
  const trustedPath = await assertTrustedSocket(socketPath);
  const net = await import('node:net');
  const crypto = await import('node:crypto');
  const clientNonce = crypto.randomBytes(16).toString('hex');
  if (signal?.aborted) throw signal.reason || new Error('Operation aborted');
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(trustedPath);
    let settled = false, ready = false, challenged = !secret, headers = false, status = 0, size = 0;
    let pending = Buffer.alloc(0);
    const chunks = [];
    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      socket.destroy();
      if (err) reject(err); else resolve(value);
    };
    const abort = () => finish(signal.reason || new Error('Operation aborted'));
    const timer = setTimeout(() => finish(new Error('Local IPC request timed out')), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    socket.on('error', (err) => finish(err));
    socket.on('close', () => { if (!settled) finish(new Error('Local IPC connection closed before a complete response')); });
    socket.once('connect', () => socket.write(frame(secret
      ? { kind: 'hello', schema: LOCAL_IPC_SCHEMA, nonce: clientNonce }
      : { kind: 'auth', schema: LOCAL_IPC_SCHEMA, token })));
    socket.on('data', (chunk) => {
      try {
        if (pending.length + chunk.length > MAX_FRAME * 2) throw new Error('IPC response buffer exceeded');
        pending = Buffer.concat([pending, chunk]);
        while (pending.length >= 4) {
          const length = pending.readUInt32BE();
          if (!length || length > MAX_FRAME) throw new Error('Invalid IPC response length');
          if (pending.length < length + 4) break;
          const value = JSON.parse(pending.subarray(4, length + 4).toString('utf8'));
          pending = pending.subarray(length + 4);
          if (value.kind === 'error') throw new PalexplorerError(value.error || 'IPC rejected', value.status || 500, {});
          if (!challenged) {
            // The token is sent only to a server that proves it holds the endpoint secret.
            if (value.kind !== 'challenge' || typeof value.nonce !== 'string' || typeof value.proof !== 'string' || !/^[0-9a-f]{32,64}$/.test(value.nonce)) throw new Error('Local IPC server did not prove its identity');
            const expected = crypto.createHmac('sha256', secret).update('pal-ipc-server/v1' + String.fromCharCode(0) + clientNonce + String.fromCharCode(0) + value.nonce).digest();
            const actual = Buffer.from(value.proof, 'hex');
            if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('Local IPC server did not prove its identity');
            challenged = true;
            socket.write(frame({ kind: 'auth', schema: LOCAL_IPC_SCHEMA, token }));
          } else if (!ready) {
            if (value.kind !== 'ready' || value.schema !== LOCAL_IPC_SCHEMA) throw new Error('Unsupported local IPC protocol');
            ready = true;
            socket.write(frame({ kind: 'request', method, path, ...(headerMap ? { headers: headerMap } : {}), ...(body === undefined ? {} : { body }) }));
          } else if (value.kind === 'headers' && !headers) {
            if (!Number.isInteger(value.status) || value.status < 100 || value.status > 599) throw new Error('Invalid IPC response status');
            headers = true;
            status = value.status;
          } else if (value.kind === 'data' && headers && typeof value.body === 'string') {
            const data = Buffer.from(value.body, 'base64');
            size += data.length;
            if (size > MAX_BODY) throw new Error('IPC response is too large');
            chunks.push(data);
          } else if (value.kind === 'end' && headers) {
            let parsed;
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new PalexplorerError(`${path} returned a malformed or empty response over IPC`, status, { notJson: true }); }
            finish(null, { status, body: parsed });
          } else throw new Error('Unexpected IPC response frame');
          if (settled) return;
        }
      } catch (err) { finish(err); }
    });
  });
}
