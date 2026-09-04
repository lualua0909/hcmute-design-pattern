import { createApp } from './app.js';
import { config } from './config/env.js';
import { initFirebase } from './config/firebase.js';
import { startSagaConsumer } from './services/sagaConsumer.js';
import { closeBroker, getChannel } from './services/broker.js';
import { pool } from './config/db.js';

initFirebase();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[gateway] listening on :${config.port} (${config.nodeEnv})`);
});

// Messaging failures must not block HTTP traffic - retry in the background.
getChannel().catch((e) => console.error('[mq] initial connect failed:', e.message));
startSagaConsumer().catch((e) => console.error('[saga] initial start failed:', e.message));

const shutdown = async (signal) => {
  console.log(`[gateway] ${signal} received, shutting down`);
  server.close();
  await closeBroker();
  await pool.end().catch(() => {});
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
