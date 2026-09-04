# Inventory Service (Go)

Sole owner of stock. Reserves on `order.created`, commits on `analytics.recorded`,
releases on `order.cancelled`. Every mutation is one MySQL transaction with
`SELECT ... FOR UPDATE`, so two concurrent orders cannot oversell the same card.

## Events

| Consumes | Publishes |
| --- | --- |
| `order.created` | `inventory.reserved` / `inventory.failed` |
| `analytics.recorded` | `inventory.committed` |
| `order.cancelled` | `inventory.released` |
| `product.created`, `product.updated`, `product.deleted` | – |

Queue: `inventory.commands` (durable, prefetch 10, manual ack).
Business rejections (`insufficient stock`) publish `inventory.failed` and ack —
retrying would never succeed. Infrastructure errors nack so nothing is lost.

## HTTP (internal, called by the gateway only)

`GET /health` · `GET /stock` · `GET /stock/{productId}` · `POST /restock` · `GET /movements?limit=50`

## Run

```bash
cp .env.example .env
go mod tidy && go run .          # http://localhost:9000

docker build -t sporthub/inventory-service .
docker run --rm -p 9000:9000 --env-file .env sporthub/inventory-service
```
