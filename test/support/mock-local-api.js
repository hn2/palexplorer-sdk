import { PalexplorerClient, PalexplorerError } from '../../src/client.js';

PalexplorerClient.prototype.fetchLocal = async function(path, options = {}) {
  const response = await fetch(`https://local-unit.invalid${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...(this.localToken ? { Authorization: `Bearer ${this.localToken}` } : {}), ...options.headers },
  });
  let body;
  try { body = await response.json(); } catch { throw new PalexplorerError('Invalid JSON', response.status, { notJson: true }); }
  if (!response.ok) throw new PalexplorerError(body.error || 'API error', response.status, body);
  return body;
};
