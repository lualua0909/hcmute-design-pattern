import amqp from 'amqplib';
import { config } from '../config.js';
import { cancelSaga, recordStep, startSaga } from '../services/saga.js';
import { notifyUser } from '../services/fcm.js';

/**
 * Every service publishes here when it finishes a unit of work.
 * `order.created` opens the saga; the `*.step` events settle it.
 */
const KEYS = [
  'order.created',
  'inventory.reserved',
  'inventory.failed',
  'inventory.committed',
  'inventory.released',
  'analytics.recorded',
  'analytics.reverted',
  'order.cancelled',
];

async function handle(event) {
  const data = event.data || {};
  const orderId = event.correlationId || data.orderId;
  if (!orderId) return;

  if (event.type === 'order.created') {
    await startSaga(orderId, data.userId, {
      totalAmount: data.totalAmount,
      itemCount: (data.items || []).reduce((n, i) => n + i.quantity, 0),
    });
    return;
  }

  if (event.type === 'order.cancelled') {
    await cancelSaga(orderId);
    await notifyUser({
      userId: data.userId,
      orderId,
      title: 'Order cancelled',
      body: `Order ${orderId} has been cancelled and the reserved cards were released.`,
      data: { type: 'order_cancelled', status: 'cancelled' },
    });
    return;
  }

  // Generic step report: { step, status, reason }
  await recordStep(orderId, {
    userId: data.userId,
    step: data.step || event.type.split('.')[0],
    status: data.status || 'committed',
    reason: data.reason,
  });
}

export async function startConsumer() {
  const connection = await amqp.connect(config.rabbit.url);
  const channel = await connection.createChannel();

  await channel.assertExchange(config.rabbit.exchange, 'topic', { durable: true });
  await channel.assertQueue(config.rabbit.queue, { durable: true });
  for (const key of KEYS) await channel.bindQueue(config.rabbit.queue, config.rabbit.exchange, key);
  await channel.prefetch(10);

  connection.on('close', () => {
    console.warn('[mq] connection closed, retrying in 5s');
    setTimeout(() => startConsumer().catch((e) => console.error('[mq]', e.message)), 5000);
  });

  await channel.consume(config.rabbit.queue, async (msg) => {
    if (!msg) return;
    try {
      await handle(JSON.parse(msg.content.toString()));
      channel.ack(msg);
    } catch (err) {
      console.error('[mq] handler failed:', err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log('[mq] consuming', config.rabbit.queue, KEYS.join(', '));
  return connection;
}
