import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { pool, query } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { publish } from '../services/broker.js';

const router = Router();

const createSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(50),
  })).min(1).max(20),
  note: z.string().max(500).optional(),
});

async function loadOrder(orderId) {
  const [order] = await query('SELECT * FROM cat_orders WHERE id = ?', [orderId]);
  if (!order) return null;
  const items = await query('SELECT * FROM cat_order_items WHERE order_id = ?', [orderId]);
  return {
    id: order.id,
    userId: order.user_id,
    totalAmount: Number(order.total_amount),
    status: order.status,
    failReason: order.fail_reason,
    createdAt: order.created_at,
    items: items.map((i) => ({
      productId: i.product_id, sku: i.sku, name: i.name,
      unitPrice: Number(i.unit_price), quantity: i.quantity,
    })),
  };
}

/**
 * POST /api/orders - starts the choreographed saga.
 * The gateway only writes a `pending` order; stock is authoritative in the
 * Inventory Service, so the order is confirmed asynchronously.
 */
router.post('/', requireAuth, validate(createSchema), asyncHandler(async (req, res) => {
  const orderId = `ORD-${nanoid(12)}`;
  const ids = req.body.items.map((i) => i.productId);
  const placeholders = ids.map(() => '?').join(',');

  const products = await query(
    `SELECT id, sku, name, price, status FROM cat_products WHERE id IN (${placeholders})`, ids
  );
  if (products.length !== ids.length) throw new HttpError(400, 'one or more products do not exist');
  const unavailable = products.find((p) => p.status !== 'published');
  if (unavailable) throw new HttpError(400, `product ${unavailable.sku} is not purchasable`);

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = req.body.items.map((i) => {
    const p = byId.get(i.productId);
    return { productId: p.id, sku: p.sku, name: p.name, unitPrice: Number(p.price), quantity: i.quantity };
  });
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'INSERT INTO cat_orders (id, user_id, total_amount, status) VALUES (?, ?, ?, ?)',
      [orderId, req.user.id, total.toFixed(2), 'pending']
    );
    for (const l of lines) {
      await conn.execute(
        `INSERT INTO cat_order_items (order_id, product_id, sku, name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, l.productId, l.sku, l.name, l.unitPrice, l.quantity]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Saga step 1: ask Inventory to reserve. Analytics + Notification react downstream.
  await publish('order.created', {
    orderId,
    userId: req.user.id,
    userEmail: req.user.email,
    totalAmount: total,
    items: lines,
    note: req.body.note ?? null,
  }, { correlationId: orderId });

  res.status(202).json({
    ...(await loadOrder(orderId)),
    message: 'order accepted - inventory reservation in progress',
  });
}));

/** GET /api/orders - caller's own orders (admins see everything). */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const rows = isAdmin
    ? await query('SELECT * FROM cat_orders ORDER BY created_at DESC LIMIT 100')
    : await query('SELECT * FROM cat_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [req.user.id]);
  res.json(await Promise.all(rows.map((r) => loadOrder(r.id))));
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (!order) throw new HttpError(404, 'order not found');
  if (order.userId !== req.user.id && req.user.role !== 'admin') throw new HttpError(403, 'not your order');
  res.json(order);
}));

/** POST /api/orders/:id/cancel - compensating transaction, releases the reservation. */
router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (!order) throw new HttpError(404, 'order not found');
  if (order.userId !== req.user.id && req.user.role !== 'admin') throw new HttpError(403, 'not your order');
  if (['cancelled', 'failed'].includes(order.status)) return res.json(order);

  await query("UPDATE cat_orders SET status = 'cancelled' WHERE id = ?", [order.id]);
  await publish('order.cancelled', { orderId: order.id, userId: order.userId, items: order.items },
    { correlationId: order.id });

  res.json(await loadOrder(order.id));
}));

/** Admin: replay a stuck saga. */
router.post('/:id/retry', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (!order) throw new HttpError(404, 'order not found');
  await query("UPDATE cat_orders SET status = 'pending', fail_reason = NULL WHERE id = ?", [order.id]);
  await publish('order.created', {
    orderId: order.id, userId: order.userId, userEmail: null,
    totalAmount: order.totalAmount, items: order.items, replay: true,
  }, { correlationId: order.id });
  res.json({ ok: true, orderId: order.id });
}));

export default router;
