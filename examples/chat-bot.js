import { PalexplorerClient } from '@palexplorer/sdk';

const pal = new PalexplorerClient({
  apiKey: 'pk_pro_your_key_here',
  discoveryServer: 'https://discovery.palexplorer.com',
});

const MY_HANDLE = 'mybot';
const MY_DEVICE_ID = 'bot-server-1';

// Simple auto-reply bot
async function pollAndReply() {
  try {
    const messages = await pal.chat.receive({ handle: MY_HANDLE, deviceId: MY_DEVICE_ID });

    for (const msg of messages) {
      if (msg.payload?.type !== 'chat') continue;

      const from = msg.fromHandle;
      const text = msg.payload.text;
      console.log(`[${from}]: ${text}`);

      // Auto-reply
      let reply;
      if (text.toLowerCase().includes('hello')) {
        reply = `Hey @${from}! How can I help?`;
      } else if (text.toLowerCase().includes('status')) {
        reply = `All systems operational. Uptime: ${process.uptime().toFixed(0)}s`;
      } else {
        reply = `Got your message: "${text.slice(0, 50)}"`;
      }

      await pal.chat.send({ to: from, text: reply });
      console.log(`[bot → ${from}]: ${reply}`);
    }
  } catch (err) {
    if (err.status !== 404) console.error('Poll error:', err.message);
  }
}

// Keep device online
setInterval(() => {
  pal.presence.heartbeat({ handle: MY_HANDLE, deviceId: MY_DEVICE_ID }).catch(() => {});
}, 60000);

// Poll every 5 seconds
console.log(`Bot @${MY_HANDLE} started. Polling for messages...`);
setInterval(pollAndReply, 5000);
pollAndReply();
