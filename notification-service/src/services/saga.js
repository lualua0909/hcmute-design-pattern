import { config } from '../config.js';
import { query } from '../db.js';
import { notifyUser } from './fcm.js';

/**
 * Distributed-transaction tracker.
 *
 * Each service reports the outcome of its own step. The customer is only
 * notified of success once EVERY required step is committed; any failed or
 * compensated step ends the saga as failed and triggers a failure push.
 */
const REQUIRED = config.requiredSteps;

// Nội dung push gửi cho khách hàng là tiếng Việt, tiền tệ VND.
const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export async function startSaga(orderId, userId, meta = {}) {
  await query(
    `INSERT INTO ntf_saga_state (order_id, user_id, steps_json, status)
     VALUES (?, ?, CAST(? AS JSON), 'in_progress')
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
    [orderId, userId, JSON.stringify({ meta, steps: {} })]
  );
}

async function loadSaga(orderId) {
  const rows = await query('SELECT * FROM ntf_saga_state WHERE order_id = ?', [orderId]);
  if (!rows.length) return null;
  const state = typeof rows[0].steps_json === 'string' ? JSON.parse(rows[0].steps_json) : rows[0].steps_json;
  return { orderId, userId: rows[0].user_id, status: rows[0].status, meta: state.meta ?? {}, steps: state.steps ?? {} };
}

/**
 * Records one step outcome and settles the saga when possible.
 * status: 'committed' | 'failed' | 'compensated'
 */
export async function recordStep(orderId, { userId, step, status, reason, meta }) {
  if (!orderId || !step) return null;

  let saga = await loadSaga(orderId);
  if (!saga) {
    await startSaga(orderId, userId || 'unknown', meta || {});
    saga = await loadSaga(orderId);
  }
  if (saga.status !== 'in_progress') return saga; // already settled - ignore late events

  saga.steps[step] = { status, reason: reason ?? null, at: new Date().toISOString() };
  const effectiveUser = saga.userId !== 'unknown' ? saga.userId : (userId || 'unknown');

  const failed = Object.entries(saga.steps).find(([, v]) => v.status === 'failed' || v.status === 'compensated');
  const allCommitted = REQUIRED.every((name) => saga.steps[name]?.status === 'committed');
  const nextStatus = failed ? 'failed' : allCommitted ? 'completed' : 'in_progress';

  await query(
    `UPDATE ntf_saga_state SET steps_json = CAST(? AS JSON), status = ?, user_id = ? WHERE order_id = ?`,
    [JSON.stringify({ meta: saga.meta ?? {}, steps: saga.steps }), nextStatus, effectiveUser, orderId]
  );
  console.log('[saga]', orderId, step, status, '=>', nextStatus,
    `(${Object.keys(saga.steps).length}/${REQUIRED.length})`);

  if (nextStatus === 'completed') {
    const total = saga.meta?.totalAmount;
    await notifyUser({
      userId: effectiveUser,
      orderId,
      title: 'Đơn hàng đã được xác nhận 🎉',
      body: total
        ? `Đơn ${orderId} tại SportHub đã được xác nhận. Tổng tiền ${VND.format(Number(total))}.`
        : `Đơn ${orderId} tại SportHub đã được xác nhận.`,
      data: { type: 'order_confirmed', status: 'confirmed' },
    });
  } else if (nextStatus === 'failed' && failed[1].status === 'failed') {
    // 'compensated' steps come from a cancel the customer already saw a
    // notification for - only a genuine failure gets the rollback push.
    const info = failed[1];
    await notifyUser({
      userId: effectiveUser,
      orderId,
      title: 'Không thể hoàn tất đơn hàng',
      body: info.reason
        ? `Đơn ${orderId} đã được hoàn tác: ${info.reason}`
        : `Đơn ${orderId} đã được hoàn tác, bạn không bị trừ tiền.`,
      data: { type: 'order_failed', status: 'failed' },
    });
  }

  return { ...saga, status: nextStatus };
}

export async function getSaga(orderId) {
  return loadSaga(orderId);
}

export async function listSagas(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const rows = await query(
    `SELECT order_id, user_id, status, created_at, updated_at
       FROM ntf_saga_state ORDER BY created_at DESC LIMIT ${safeLimit}`
  );
  return rows.map((r) => ({
    orderId: r.order_id, userId: r.user_id, status: r.status,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

/** Settles the saga after a customer-initiated cancel: no extra push. */
export async function cancelSaga(orderId) {
  await query(
    "UPDATE ntf_saga_state SET status = 'failed' WHERE order_id = ? AND status = 'in_progress'",
    [orderId]
  );
}
