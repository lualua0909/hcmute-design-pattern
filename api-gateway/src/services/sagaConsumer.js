import amqp from 'amqplib';
import { config } from '../config/env.js';
import { query } from '../config/db.js';

/**
 * The gateway owns the order aggregate, so it listens to the downstream saga
 * steps and projects them onto cat_orders.status.
 *   inventory.reserved  -> reserved
 *   inventory.failed    -> failed  (compensation: nothing else has run yet)
 *   analytics.recorded  -> confirmed (last step of the happy path)
 */
const QUEUE = 'gateway.saga';
const KEYS = ['inventory.reserved', 'inventory.failed', 'analytics.recorded'];

export async function startSagaConsumer() {
  const connection = await amqp.connect(config.rabbit.url);
  const channel = await connection.createChannel();

  await channel.assertExchange(config.rabbit.exchange, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  for (const key of KEYS) await channel.bindQueue(QUEUE, config.rabbit.exchange, key);
  await channel.prefetch(10);

  connection.on('close', () => {
    console.warn('[saga] consumer connection closed, retrying in 5s');
    setTimeout(() => startSagaConsumer().catch((e) => console.error('[saga]', e.message)), 5000);
  });

  await channel.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      const orderId = event.correlationId || event.data?.orderId;
      if (!orderId) return channel.ack(msg);

      if (event.type === 'inventory.reserved') {
        await query("UPDATE cat_orders SET status = 'reserved' WHERE id = ? AND status = 'pending'", [orderId]);
      } else if (event.type === 'inventory.failed') {
        await query("UPDATE cat_orders SET status = 'failed', fail_reason = ? WHERE id = ?",
          [String(event.data?.reason || 'inventory rejected').slice(0, 255), orderId]);
      } else if (event.type === 'analytics.recorded') {
        await query("UPDATE cat_orders SET status = 'confirmed' WHERE id = ? AND status IN ('pending','reserved')", [orderId]);
      }

      console.log('[saga]', event.type, orderId);
      channel.ack(msg);
    } catch (err) {
      console.error('[saga] handler failed', err.message);
      channel.nack(msg, false, false); // drop poison messages instead of hot-looping
    }
  });

  console.log('[saga] consuming', QUEUE);
}
