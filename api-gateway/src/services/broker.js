import amqp from 'amqplib';
import { config } from '../config/env.js';

/**
 * Thin publisher around a single shared topic exchange.
 * Reconnects with backoff so a CloudAMQP blip does not kill the gateway.
 */
let connection = null;
let channel = null;
let connecting = null;

async function connect() {
  connection = await amqp.connect(config.rabbit.url);
  connection.on('error', (e) => console.error('[mq] connection error', e.message));
  connection.on('close', () => {
    console.warn('[mq] connection closed, retrying in 5s');
    connection = null;
    channel = null;
    setTimeout(() => { connecting = null; getChannel().catch(() => {}); }, 5000);
  });

  channel = await connection.createConfirmChannel();
  await channel.assertExchange(config.rabbit.exchange, 'topic', { durable: true });
  console.log('[mq] connected, exchange =', config.rabbit.exchange);
  return channel;
}

export function getChannel() {
  if (channel) return Promise.resolve(channel);
  if (!connecting) connecting = connect().catch((e) => { connecting = null; throw e; });
  return connecting;
}

/** Publish a domain event. routingKey e.g. "order.created". */
export async function publish(routingKey, payload, opts = {}) {
  const ch = await getChannel();
  const event = {
    eventId: `${routingKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: routingKey,
    source: 'api-gateway',
    occurredAt: new Date().toISOString(),
    correlationId: opts.correlationId || payload?.orderId || null,
    data: payload,
  };
  ch.publish(
    config.rabbit.exchange,
    routingKey,
    Buffer.from(JSON.stringify(event)),
    { persistent: true, contentType: 'application/json', messageId: event.eventId }
  );
  await ch.waitForConfirms();
  console.log('[mq] published', routingKey, event.correlationId ?? '');
  return event;
}

export async function closeBroker() {
  try { await channel?.close(); } catch { /* already closed */ }
  try { await connection?.close(); } catch { /* already closed */ }
}
