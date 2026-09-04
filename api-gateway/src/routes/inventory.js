import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import { forward } from '../services/proxy.js';

const BASE = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:9000';
const router = Router();

/** Public: available quantity for one product. */
router.get('/stock/:productId', asyncHandler(async (req, res) =>
  res.json(await forward(BASE, `/stock/${Number(req.params.productId)}`))));

router.get('/stock', requireAuth, requireAdmin, asyncHandler(async (req, res) =>
  res.json(await forward(BASE, '/stock'))));

router.post('/restock',
  requireAuth,
  requireAdmin,
  validate(z.object({
    productId: z.number().int().positive(),
    sku: z.string().min(1),
    quantity: z.number().int().min(1),
  })),
  asyncHandler(async (req, res) => res.json(await forward(BASE, '/restock', { method: 'POST', body: req.body })))
);

router.get('/movements', requireAuth, requireAdmin, asyncHandler(async (req, res) =>
  res.json(await forward(BASE, `/movements?limit=${Number(req.query.limit || 50)}`))));

export default router;
