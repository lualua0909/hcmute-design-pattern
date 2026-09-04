import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

const router = Router();

const mapUser = (r) => ({
  id: r.id, email: r.email, displayName: r.display_name,
  photoUrl: r.photo_url, role: r.role, hasFcmToken: Boolean(r.fcm_token),
  createdAt: r.created_at,
});

/** GET /api/users/me - also the "login sync" endpoint the SPA calls after Firebase sign-in. */
router.get('/me', requireAuth, asyncHandler(async (req, res) => res.json(mapUser(req.user))));

/** PUT /api/users/me/fcm-token - browser push registration token. */
router.put('/me/fcm-token',
  requireAuth,
  validate(z.object({ token: z.string().min(10).max(512) })),
  asyncHandler(async (req, res) => {
    await query('UPDATE cat_users SET fcm_token = ? WHERE id = ?', [req.body.token, req.user.id]);
    res.json({ ok: true });
  })
);

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM cat_users ORDER BY created_at DESC LIMIT 200');
  res.json(rows.map(mapUser));
}));

router.put('/:id/role',
  requireAuth,
  requireAdmin,
  validate(z.object({ role: z.enum(['customer', 'admin']) })),
  asyncHandler(async (req, res) => {
    const result = await query('UPDATE cat_users SET role = ? WHERE id = ?', [req.body.role, req.params.id]);
    if (!result.affectedRows) throw new HttpError(404, 'user not found');
    res.json({ ok: true });
  })
);

export default router;
