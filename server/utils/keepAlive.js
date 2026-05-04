// Keep-alive service for Render free tier
// Prevents server from spinning down

import http from 'http';
import https from 'https';

const SERVICE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';
const PING_INTERVAL = 5 * 60 * 1000; // Ping every 5 minutes

function keepAlive() {
  try {
    const url = `${SERVICE_URL}/api/health`;
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;

    client.get(url, (res) => {
      console.log(`✅ Keep-alive ping sent at ${new Date().toISOString()} to ${url}`);
    }).on('error', (err) => {
      console.log(`⚠️  Keep-alive ping failed: ${err.message}`);
    });
  } catch (err) {
    console.log(`⚠️  Keep-alive error: ${err.message}`);
  }
}

// Start keep-alive only when an external URL is configured (Render) or NODE_ENV is production
if (process.env.RENDER_EXTERNAL_URL || process.env.NODE_ENV === 'production') {
  console.log('🔄 Starting keep-alive service...');
  setInterval(keepAlive, PING_INTERVAL);
  keepAlive(); // First ping immediately
}

export default keepAlive;
