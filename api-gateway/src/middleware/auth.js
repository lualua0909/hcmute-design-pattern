import { query } from '../config/db.js';
import { config } from '../config/env.js';
import { isFirebaseReady, verifyIdToken } from '../config/firebase.js';
import { HttpError } from './error.js';

/**
 * Resolves the caller from a Firebase ID token.
 * Falls back to "Bearer dev:<uid>:<role>" when AUTH_DEV_BYPASS is on and
 * Firebase credentials have not been provided yet (placeholder phase).
 */
async function resolveToken(token) {
  // Explicit dev token, only while the flag is on. Checked first so the demo
  // accounts keep working after Firebase Admin is configured.
  if (config.authDevBypass && token.startsWith('dev:')) {
    const [, uid, role = 'customer'] = token.split(':');
    if (!uid) throw new HttpError(401, 'invalid dev token');
    return { uid, email: `${uid}@dev.local`, name: uid, picture: null, devRole: role };
  }

  if (isFirebaseReady()) {
    const decoded = await verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || `${decoded.uid}@unknown.local`,
      name: decoded.name || null,
      picture: decoded.picture || null,
    };
  }
  throw new HttpError(503, 'auth backend not configured');
}

/** Upsert the Firebase user into cat_users and return the DB row. */
async function upsertUser(profile) {
  const isAdminEmail = config.adminEmails.includes((profile.email || '').toLowerCase());
  const role = profile.devRole === 'admin' || isAdminEmail ? 'admin' : 'customer';

  await query(
    `INSERT INTO cat_users (id, email, display_name, photo_url, role)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       display_name = COALESCE(VALUES(display_name), display_name),
       photo_url = COALESCE(VALUES(photo_url), photo_url),
       role = IF(? = 'admin', 'admin', role)`,
    [profile.uid, profile.email, profile.name, profile.picture, role, role]
  );

  const rows = await query('SELECT * FROM cat_users WHERE id = ?', [profile.uid]);
  return rows[0];
}

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new HttpError(401, 'missing bearer token');

    const profile = await resolveToken(token);
    req.user = await upsertUser(profile);
    next();
  } catch (err) {
    next(err.status ? err : new HttpError(401, 'invalid or expired token'));
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'admin role required'));
  next();
};

/** Attaches req.user when a token is present, but never rejects. */
export const optionalAuth = async (req, res, next) => {
  if (!req.headers.authorization) return next();
  try {
    const profile = await resolveToken(req.headers.authorization.slice(7).trim());
    req.user = await upsertUser(profile);
  } catch {
    req.user = null;
  }
  next();
};
