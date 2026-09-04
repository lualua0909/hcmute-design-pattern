import fs from 'node:fs';
import admin from 'firebase-admin';
import { config } from '../config.js';
import { query } from '../db.js';

let app = null;

export function initFirebase() {
  if (app) return app;
  let credential = null;

  if (config.firebase.serviceAccountJson.trim()) {
    credential = admin.credential.cert(JSON.parse(config.firebase.serviceAccountJson));
  } else if (config.firebase.serviceAccountPath && fs.existsSync(config.firebase.serviceAccountPath)) {
    credential = admin.credential.cert(
      JSON.parse(fs.readFileSync(config.firebase.serviceAccountPath, 'utf8'))
    );
  }

  if (!credential) {
    console.warn('[fcm] no service account - notifications persist to MySQL only');
    return null;
  }

  app = admin.initializeApp({ credential, projectId: config.firebase.projectId || undefined });
  console.log('[fcm] firebase admin initialised');
  return app;
}

export const isFirebaseReady = () => app !== null;

/**
 * Persists the notification, then pushes it through FCM when the user has a
 * registered browser token. The DB row is the source of truth for the in-app
 * feed, so a missing Firebase config never loses a notification.
 */
export async function notifyUser({ userId, orderId, title, body, data = {} }) {
  const rows = await query('SELECT fcm_token FROM cat_users WHERE id = ?', [userId]);
  const token = rows[0]?.fcm_token || null;

  const insert = await query(
    `INSERT INTO ntf_notifications (user_id, order_id, title, body, channel, delivered)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [userId, orderId, title, body, token && isFirebaseReady() ? 'fcm' : 'inapp']
  );

  if (!token || !isFirebaseReady()) {
    console.log('[fcm] stored in-app only for', userId, token ? '(firebase not configured)' : '(no token)');
    return { delivered: false, reason: token ? 'firebase-not-configured' : 'no-token' };
  }

  try {
    const messageId = await admin.messaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries({ orderId: orderId ?? '', ...data }).map(([k, v]) => [k, String(v)])
      ),
      webpush: { fcmOptions: { link: orderId ? `/orders/${orderId}` : '/' } },
    });
    await query('UPDATE ntf_notifications SET delivered = 1 WHERE id = ?', [insert.insertId]);
    console.log('[fcm] pushed', messageId, 'to', userId);
    return { delivered: true, messageId };
  } catch (err) {
    await query('UPDATE ntf_notifications SET error = ? WHERE id = ?',
      [String(err.message).slice(0, 512), insert.insertId]);

    // A stale browser token should be dropped, not retried forever.
    if (String(err.code || '').includes('registration-token-not-registered')) {
      await query('UPDATE cat_users SET fcm_token = NULL WHERE id = ?', [userId]);
    }
    console.error('[fcm] push failed:', err.message);
    return { delivered: false, reason: err.message };
  }
}
