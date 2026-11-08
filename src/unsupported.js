import { PalexplorerError } from './errors.js';

export function unsupported(method) {
  throw new PalexplorerError(`${method} is not supported: the stock local daemon exposes no matching route (pass localRoutes: 'extended' when your daemon serves it)`, 501, { unsupported: true });
}

export function routeOr(client, method, run) {
  if (client.localRoutes === 'extended') return run();
  return unsupported(method);
}
