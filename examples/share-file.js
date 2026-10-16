import { PalexplorerClient } from '@palexplorer/sdk';

const pal = new PalexplorerClient({
  apiKey: 'pk_pro_your_key_here',
  localServer: 'http://localhost:8585',
  localToken: 'your_local_bearer_token',
});

// Create a private share
const share = await pal.shares.create({
  path: '/path/to/folder',
  visibility: 'private',
  recipients: ['@alice', '@bob'],
});
console.log('Share created:', share);

// List all shares
const shares = await pal.shares.list();
for (const s of shares) {
  console.log(`${s.name} — ${s.visibility} — ${s.recipients?.length || 0} recipients`);
}

// Revoke a share
await pal.shares.remove(share.id);
console.log('Share revoked');
