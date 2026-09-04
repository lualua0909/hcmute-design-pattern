import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

const router = Router();
const schema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
});

router.get('/', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT c.id, c.name, c.slug, COUNT(p.id) AS product_count
       FROM cat_categories c
       LEFT JOIN cat_products p ON p.category_id = c.id AND p.status = 'published'
      GROUP BY c.id ORDER BY c.name`
  );
  res.json(rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, productCount: Number(r.product_count) })));
}));

router.post('/', requireAuth, requireAdmin, validate(schema), asyncHandler(async (req, res) => {
  const result = await query('INSERT INTO cat_categories (name, slug) VALUES (?, ?)', [req.body.name, req.body.slug]);
  res.status(201).json({ id: result.insertId, ...req.body });
}));

router.put('/:id', requireAuth, requireAdmin, validate(schema), asyncHandler(async (req, res) => {
  const result = await query('UPDATE cat_categories SET name = ?, slug = ? WHERE id = ?',
    [req.body.name, req.body.slug, Number(req.params.id)]);
  if (!result.affectedRows) throw new HttpError(404, 'category not found');
  res.json({ id: Number(req.params.id), ...req.body });
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM cat_categories WHERE id = ?', [Number(req.params.id)]);
  if (!result.affectedRows) throw new HttpError(404, 'category not found');
  res.json({ ok: true });
}));

export default router;
