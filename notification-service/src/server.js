import express from 'express';
import { config } from './config.js';
import { pool } from './db.js';
import { initFirebase, isFirebaseReady, notifyUser } from './services/fcm.js';
import { getSaga, listSagas } from './services/saga.js';
import { startConsumer } from './consumers/events.js';

initFirebase();

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  const health = { service: config.serviceName, status: 'ok', mysql: 'down', firebase: isFirebaseReady() ? 'ready' : 'placeholder' };
  try { await pool.query('SELECT 1'); health.mysql = 'up'; } catch { health.status = 'degraded'; }
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

/** Saga inspector - used by the CMS "system health" screen and for demos. */
app.get('/sagas', async (req, res) => res.json(await listSagas(Number(req.query.limit || 50))));

app.get('/sagas/:orderId', async (req, res) => {
  const saga = await getSaga(req.params.orderId);
  if (!saga) return res.status(404).json({ message: 'saga not found' });
  res.json(saga);
});

/** Manual test hook: push a notification without running a whole order. */
app.post('/test-push', async (req, res) => {
  const { userId, title = 'SportHub test', body = 'Hello from the Notification Service' } = req.body || {};
  if (!userId) return res.status(422).json({ message: 'userId is required' });
  res.json(await notifyUser({ userId, orderId: null, title, body, data: { type: 'test' } }));
});

app.listen(config.port, () => console.log(`[notification] listening on :${config.port}`));
startConsumer().catch((e) => console.error('[mq] initial start failed:', e.message));

const shutdown = async () => { await pool.end().catch(() => {}); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
