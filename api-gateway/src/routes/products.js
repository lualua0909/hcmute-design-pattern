import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { publish } from '../services/broker.js';

const router = Router();

const productSchema = z.object({
  sku: z.string().min(3).max(64),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().url().max(512).optional().nullable(),
  price: z.number().nonnegative(),
  categoryId: z.number().int().positive().optional().nullable(),
  gender: z.enum(['men', 'women', 'kids', 'unisex']).default('unisex'),
  sport: z.string().max(120).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  stock: z.number().int().min(0).optional(),
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  category: z.coerce.number().int().positive().optional(),
  gender: z.string().optional(),
  sport: z.string().optional(),
  status: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
});

const SORTS = {
  newest: 'p.created_at DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  name: 'p.name ASC',
};

const mapProduct = (r) => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  slug: r.slug,
  description: r.description,
  imageUrl: r.image_url,
  price: Number(r.price),
  categoryId: r.category_id,
  categoryName: r.category_name ?? null,
  gender: r.gender,
  sport: r.sport,
  status: r.status,
  stock: r.on_hand === null || r.on_hand === undefined ? 0 : Number(r.on_hand) - Number(r.reserved || 0),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** GET /api/products - public catalog listing with filters + pagination. */
router.get('/', validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { q, category, gender, sport, status, minPrice, maxPrice, sort, page, limit } = req.query;
  const where = [];
  const params = [];

  // Anonymous/customer traffic only ever sees published rows.
  if (status && req.user?.role === 'admin') { where.push('p.status = ?'); params.push(status); }
  else if (!req.user || req.user.role !== 'admin') where.push("p.status = 'published'");

  if (q) { where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.sport LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (category) { where.push('p.category_id = ?'); params.push(category); }
  if (gender) { where.push('p.gender = ?'); params.push(gender); }
  if (sport) { where.push('p.sport = ?'); params.push(sport); }
  if (minPrice !== undefined) { where.push('p.price >= ?'); params.push(minPrice); }
  if (maxPrice !== undefined) { where.push('p.price <= ?'); params.push(maxPrice); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const rows = await query(
    `SELECT p.*, c.name AS category_name, s.on_hand, s.reserved
       FROM cat_products p
       LEFT JOIN cat_categories c ON c.id = p.category_id
       LEFT JOIN inv_stock s ON s.product_id = p.id
       ${whereSql}
       ORDER BY ${SORTS[sort]}
       LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM cat_products p ${whereSql}`, params);

  res.json({
    items: rows.map(mapProduct),
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  });
}));

/** GET /api/products/facets - distinct sports, for the storefront filter bar. */
router.get('/facets', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT sport, COUNT(*) AS count
       FROM cat_products
      WHERE status = 'published' AND sport IS NOT NULL
      GROUP BY sport
      ORDER BY sport`
  );
  res.json({ sports: rows.map((r) => ({ sport: r.sport, count: Number(r.count) })) });
}));

/** GET /api/products/:idOrSlug */
router.get('/:idOrSlug', asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const byId = /^\d+$/.test(idOrSlug);
  const rows = await query(
    `SELECT p.*, c.name AS category_name, s.on_hand, s.reserved
       FROM cat_products p
       LEFT JOIN cat_categories c ON c.id = p.category_id
       LEFT JOIN inv_stock s ON s.product_id = p.id
      WHERE ${byId ? 'p.id = ?' : 'p.slug = ?'}`,
    [idOrSlug]
  );
  if (!rows.length) throw new HttpError(404, 'product not found');
  res.json(mapProduct(rows[0]));
}));

// ---------------- CMS (admin only) ----------------

/** POST /api/products - create product, then ask Inventory to open a stock row. */
router.post('/', requireAuth, requireAdmin, validate(productSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const dup = await query('SELECT id FROM cat_products WHERE sku = ? OR slug = ?', [b.sku, b.slug]);
  if (dup.length) throw new HttpError(409, 'sku or slug already exists');

  const result = await query(
    `INSERT INTO cat_products
       (sku, name, slug, description, image_url, price, category_id, gender, sport, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.sku, b.name, b.slug, b.description ?? null, b.imageUrl ?? null, b.price,
     b.categoryId ?? null, b.gender, b.sport ?? null, b.status]
  );

  await publish('product.created', {
    productId: result.insertId, sku: b.sku, name: b.name,
    initialStock: b.stock ?? 0, actorId: req.user.id,
  }, { correlationId: `product-${result.insertId}` });

  const rows = await query('SELECT * FROM cat_products WHERE id = ?', [result.insertId]);
  res.status(201).json(mapProduct(rows[0]));
}));

/** PUT /api/products/:id */
router.put('/:id', requireAuth, requireAdmin, validate(productSchema.partial()), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await query('SELECT * FROM cat_products WHERE id = ?', [id]);
  if (!existing.length) throw new HttpError(404, 'product not found');

  const columns = {
    sku: 'sku', name: 'name', slug: 'slug', description: 'description', imageUrl: 'image_url',
    price: 'price', categoryId: 'category_id', gender: 'gender', sport: 'sport', status: 'status',
  };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (req.body[key] !== undefined) { sets.push(`${column} = ?`); params.push(req.body[key]); }
  }
  if (sets.length) {
    params.push(id);
    await query(`UPDATE cat_products SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  await publish('product.updated', {
    productId: id, sku: req.body.sku ?? existing[0].sku,
    stock: req.body.stock, actorId: req.user.id,
  }, { correlationId: `product-${id}` });

  const rows = await query('SELECT * FROM cat_products WHERE id = ?', [id]);
  res.json(mapProduct(rows[0]));
}));

/** DELETE /api/products/:id - soft delete (archive) keeps order history intact. */
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query('SELECT * FROM cat_products WHERE id = ?', [id]);
  if (!rows.length) throw new HttpError(404, 'product not found');

  const hard = req.query.hard === 'true';
  if (hard) await query('DELETE FROM cat_products WHERE id = ?', [id]);
  else await query("UPDATE cat_products SET status = 'archived' WHERE id = ?", [id]);

  await publish('product.deleted', { productId: id, sku: rows[0].sku, hard, actorId: req.user.id },
    { correlationId: `product-${id}` });

  res.json({ ok: true, id, mode: hard ? 'hard' : 'archived' });
}));

export default router;
