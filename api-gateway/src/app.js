import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { optionalAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { getChannel } from './services/broker.js';
import { pool } from './config/db.js';
import { isFirebaseReady } from './config/firebase.js';

import products from './routes/products.js';
import categories from './routes/categories.js';
import orders from './routes/orders.js';
import users from './routes/users.js';
import analytics from './routes/analytics.js';
import inventory from './routes/inventory.js';
import notifications from './routes/notifications.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin.includes('*') ? true : config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  app.get('/health', async (req, res) => {
    const health = { service: 'api-gateway', status: 'ok', mysql: 'down', rabbitmq: 'down', firebase: isFirebaseReady() ? 'ready' : 'placeholder' };
    try { await pool.query('SELECT 1'); health.mysql = 'up'; } catch { /* reported as down */ }
    try { await getChannel(); health.rabbitmq = 'up'; } catch { /* reported as down */ }
    if (health.mysql !== 'up') health.status = 'degraded';
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  });

  // Catalog reads are public, but an admin token unlocks draft/archived rows.
  app.use('/api/products', optionalAuth, products);
  app.use('/api/categories', categories);
  app.use('/api/orders', orders);
  app.use('/api/users', users);
  app.use('/api/analytics', analytics);
  app.use('/api/inventory', inventory);
  app.use('/api/notifications', notifications);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
