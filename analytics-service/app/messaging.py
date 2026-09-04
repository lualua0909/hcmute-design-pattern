"""RabbitMQ consumer/publisher for the Analytics Service (aio-pika)."""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

import aio_pika

from .config import settings
from .services import reports

log = logging.getLogger("analytics.mq")

# Saga step 2: analytics only records an order once inventory has held the stock.
ROUTING_KEYS = ["inventory.reserved", "order.cancelled"]

_channel: aio_pika.abc.AbstractChannel | None = None
_exchange: aio_pika.abc.AbstractExchange | None = None


async def publish(routing_key: str, correlation_id: str, data: dict) -> None:
    if _exchange is None:
        log.warning("publish skipped, broker not ready: %s", routing_key)
        return

    event = {
        "eventId": f"{routing_key}-{uuid.uuid4().hex[:12]}",
        "type": routing_key,
        "source": settings.service_name,
        "occurredAt": datetime.now(timezone.utc).isoformat(),
        "correlationId": correlation_id,
        "data": data,
    }
    await _exchange.publish(
        aio_pika.Message(
            body=json.dumps(event).encode(),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            message_id=event["eventId"],
        ),
        routing_key=routing_key,
    )
    log.info("published %s %s", routing_key, correlation_id)


async def _handle(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process(requeue=False):
        event = json.loads(message.body.decode())
        event_type = event.get("type")
        data = event.get("data") or {}
        order_id = event.get("correlationId") or data.get("orderId")

        if event_type == "inventory.reserved":
            written = await asyncio.to_thread(
                reports.record_order, order_id, data.get("userId", ""), data.get("items", [])
            )
            log.info("recorded %s (%s fact rows)", order_id, written)
            await publish("analytics.recorded", order_id, {
                "orderId": order_id,
                "userId": data.get("userId"),
                "step": "analytics",
                "status": "committed",
                "factRows": written,
            })

        elif event_type == "order.cancelled":
            removed = await asyncio.to_thread(reports.remove_order, order_id)
            log.info("reverted %s (%s fact rows)", order_id, removed)
            await publish("analytics.reverted", order_id, {
                "orderId": order_id,
                "userId": data.get("userId"),
                "step": "analytics",
                "status": "compensated",
            })


async def start_consumer() -> aio_pika.abc.AbstractRobustConnection:
    """Robust connection: aio-pika reconnects and re-declares on its own."""
    global _channel, _exchange

    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    _channel = await connection.channel()
    await _channel.set_qos(prefetch_count=10)

    _exchange = await _channel.declare_exchange(
        settings.rabbitmq_exchange, aio_pika.ExchangeType.TOPIC, durable=True
    )
    queue = await _channel.declare_queue(settings.rabbitmq_queue, durable=True)
    for key in ROUTING_KEYS:
        await queue.bind(_exchange, routing_key=key)

    await queue.consume(_handle)
    log.info("consuming %s keys=%s", settings.rabbitmq_queue, ROUTING_KEYS)
    return connection
