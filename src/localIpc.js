import { PalexplorerError } from './errors.js';

export const LOCAL_IPC_SCHEMA = 'pal.local-ipc/v1';
const MAX_FRAME = 128 * 1024;
const MAX_BODY = 16 * 1024 * 1024;

export function isLocalPipe(value) {
  return typeof value === 'string' && /^\\\\\.\\pipe\\[a-zA-Z0-9._-]{1,200}$/.test(value);
}

async function assertTrustedSocket(value) {
  const path = await import('node:path');
  if (process.platform === 'win32') {
    if (!isLocalPipe(value)) throw new PalexplorerError('Only a local Windows named pipe is allowed', 0, {});
    return;
  }
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) throw new PalexplorerError('An absolute local socket is required', 0, {});
  const fs = await import('node:fs');
  const st = fs.lstatSync(value);
  const parent = fs.statSync(path.dirname(value));
  if (!st.isSocket() || st.uid !== process.getuid() || parent.uid !== process.getuid() || (parent.mode & 0o022) !== 0) {
    throw new PalexplorerError('The IPC socket and its directory must belong to the current user', 0, {});
  }
}

function frame(value) {
  const body = Buffer.from(JSON.stringify(value));
  if (body.length > 17 * 1024 * 1024) throw new PalexplorerError('IPC request is too large', 413, {});
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(body.length);
  return Buffer.concat([header, body]);
}

export async function requestLocalIpc(socketPath, path, { method = 'GET', body, token, timeoutMs, signal }) {
  if (typeof token !== 'string' || !token) throw new PalexplorerError('A local IPC token is required', 401, {});
  if (body !== undefined && typeof body !== 'string') throw new TypeError('Local IPC bodies must be JSON strings');
  if (body && Buffer.byteLength(body) > MAX_BODY) throw new PalexplorerError('IPC request is too large', 413, {});
  await assertTrustedSocket(socketPath);
  const net = await import('node:net');
  if (signal?.aborted) throw signal.reason || new Error('Operation aborted');
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let settled = false, ready = false, headers = false, status = 0, size = 0;
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
    socket.once('connect', () => socket.write(frame({ kind: 'auth', schema: LOCAL_IPC_SCHEMA, token })));
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
          if (!ready) {
            if (value.kind !== 'ready' || value.schema !== LOCAL_IPC_SCHEMA) throw new Error('Unsupported local IPC protocol');
            ready = true;
            socket.write(frame({ kind: 'request', method, path, ...(body === undefined ? {} : { body }) }));
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
