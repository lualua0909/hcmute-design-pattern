import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { forward } from '../services/proxy.js';

const BASE = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8000';
const router = Router();

// Every reporting endpoint is admin-only and proxied to the FastAPI service.
router.use(requireAuth, requireAdmin);

router.get('/overview', asyncHandler(async (req, res) =>
  res.json(await forward(BASE, `/reports/overview?days=${Number(req.query.days || 30)}`))));

router.get('/revenue', asyncHandler(async (req, res) =>
  res.json(await forward(BASE, `/reports/revenue?days=${Number(req.query.days || 30)}`))));

router.get('/top-products', asyncHandler(async (req, res) =>
  res.json(await forward(BASE, `/reports/top-products?limit=${Number(req.query.limit || 10)}&days=${Number(req.query.days || 30)}`))));

router.get('/rarity-mix', asyncHandler(async (req, res) =>
  res.json(await forward(BASE, `/reports/rarity-mix?days=${Number(req.query.days || 30)}`))));

router.post('/rebuild', asyncHandler(async (req, res) =>
  res.json(await forward(BASE, '/reports/rebuild', { method: 'POST', body: {} }))));

export default router;
