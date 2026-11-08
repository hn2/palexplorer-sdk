import { PalexplorerError } from './errors.js';

export function unsupported(method) {
  throw new PalexplorerError(`${method} is not supported: the local daemon exposes no matching route`, 501, { unsupported: true });
}
