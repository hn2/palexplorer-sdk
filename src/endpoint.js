// Local IPC endpoint of the core (hn2/palexplorer#930): a named pipe on Windows, a unix socket elsewhere, published in
// ~/.palexplorer/capability-endpoint.json, which only the current user can read. Node.js only; returns null elsewhere.
const SCHEMA = 'pal.capabilities/v1';

export function readLocalEndpoint(file) {
  try {
    const fs = globalThis.process?.getBuiltinModule?.('node:fs');
    const os = globalThis.process?.getBuiltinModule?.('node:os');
    const path = globalThis.process?.getBuiltinModule?.('node:path');
    if (!fs || !os || !path) return null;
    const endpointFile = file || path.join(os.homedir(), '.palexplorer', 'capability-endpoint.json');
    const data = JSON.parse(fs.readFileSync(endpointFile, 'utf8'));
    if (data?.schema !== SCHEMA || typeof data.socket !== 'string' || !data.socket) return null;
    return data.socket;
  } catch {
    return null;
  }
}
