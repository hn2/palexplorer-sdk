import { PalexplorerClient } from '@palexplorer/sdk';

const pal = new PalexplorerClient({
  apiKey: 'pk_pro_your_key_here',
  localServer: 'http://localhost:8585',
  localToken: 'your_local_bearer_token',
});

// Check identity
const me = await pal.identity.whoami();
console.log('Identity:', me);

// List shares
const shares = await pal.shares.list();
console.log(`You have ${shares.length} shares`);

// Check if a pal is online
const status = await pal.presence.check('@alice');
console.log(`Alice is ${status.online ? 'online' : 'offline'}`);
if (status.devices) {
  for (const d of status.devices) {
    console.log(`  ${d.deviceName}: ${d.status} (last seen: ${d.lastSeen})`);
  }
}

// Get transfer stats
const stats = await pal.transfers.stats();
console.log(`Upload: ${(stats.uploadSpeed / 1024).toFixed(1)} KB/s`);
console.log(`Download: ${(stats.downloadSpeed / 1024).toFixed(1)} KB/s`);
