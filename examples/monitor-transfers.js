import { PalexplorerClient } from '@palexplorer/sdk';

const pal = new PalexplorerClient({
  localServer: 'http://localhost:8585',
  localToken: 'your_local_bearer_token',
});

// Poll transfer stats every 5 seconds
setInterval(async () => {
  try {
    const stats = await pal.transfers.stats();
    const transfers = await pal.transfers.list();
    const active = transfers.filter(t => t.status === 'downloading');

    console.clear();
    console.log('=== Palexplorer Transfer Monitor ===');
    console.log(`Upload: ${(stats.uploadSpeed / 1024).toFixed(1)} KB/s`);
    console.log(`Download: ${(stats.downloadSpeed / 1024).toFixed(1)} KB/s`);
    console.log(`Active: ${active.length} transfers\n`);

    for (const t of active) {
      const pct = ((t.progress || 0) * 100).toFixed(1);
      const bar = '\u2588'.repeat(Math.floor(t.progress * 30)) + '\u2591'.repeat(30 - Math.floor(t.progress * 30));
      console.log(`${t.name}`);
      console.log(`  [${bar}] ${pct}%`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}, 5000);
