import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { query } from '../config/db.js';

const router = Router();

/** In-app notification feed - the durable mirror of what FCM pushed. */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, order_id, title, body, channel, delivered, read_at, created_at
       FROM ntf_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows.map((r) => ({
    id: r.id, orderId: r.order_id, title: r.title, body: r.body,
    channel: r.channel, delivered: Boolean(r.delivered),
    read: Boolean(r.read_at), createdAt: r.created_at,
  })));
}));

router.post('/read-all', requireAuth, asyncHandler(async (req, res) => {
  await query('UPDATE ntf_notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  res.json({ ok: true });
}));

export default router;
