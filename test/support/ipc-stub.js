import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export async function startIpcStub(handler) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pal-sdk-ipc-'));
  fs.chmodSync(dir, 0o700);
  const socketPath = process.platform === 'win32' ? `\\\\.\\pipe\\pal-sdk-${randomBytes(12).toString('hex')}` : path.join(dir, 'core.sock');
  const frame = value => {
    const body = Buffer.from(JSON.stringify(value));
    const header = Buffer.alloc(4); header.writeUInt32BE(body.length);
    return Buffer.concat([header, body]);
  };
  const requests = [], sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
    let pending = Buffer.alloc(0), token;
    socket.on('data', chunk => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= 4 && pending.length >= pending.readUInt32BE() + 4) {
        const length = pending.readUInt32BE();
        const message = JSON.parse(pending.subarray(4, 4 + length)); pending = pending.subarray(4 + length);
        if (message.kind === 'auth') { token = message.token; socket.write(frame({ kind: 'ready', schema: 'pal.local-ipc/v1' })); continue; }
        const req = { method: message.method, url: message.path, auth: `Bearer ${token}`, body: message.body ? JSON.parse(message.body) : null };
        requests.push(req);
        let status = 200;
        const res = {
          writeHead(code) { status = code; },
          end(body = '') { socket.write(frame({ kind: 'headers', status })); if (body) socket.write(frame({ kind: 'data', body: Buffer.from(body).toString('base64') })); socket.end(frame({ kind: 'end' })); },
          raw(value) { socket.write(value); }, destroy() { socket.destroy(); },
        };
        handler(req, res);
      }
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(socketPath, resolve); });
  return { server, socketPath, requests, dir, close: async () => { for (const s of sockets) s.destroy(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); } };
}
