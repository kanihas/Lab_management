// Keep-alive service for Render free tier
// Prevents server from spinning down

import https from 'https';

const SERVICE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';
const PING_INTERVAL = 5 * 60 * 1000; // Ping every 5 minutes

function keepAlive() {
  const url = `${SERVICE_URL}/api/health`;

  https
    .get(url, (res) => {
      console.log(`✅ Keep-alive ping sent at ${new Date().toISOString()}`);
    })
    .on('error', (err) => {
      console.log(`⚠️  Keep-alive ping failed: ${err.message}`);
    });
}

// Start keep-alive only in production (Render)
if (process.env.NODE_ENV === 'production') {
  console.log('🔄 Starting keep-alive service...');
  setInterval(keepAlive, PING_INTERVAL);
  keepAlive(); // First ping immediately
}

export default keepAlive;
