# Analytics Service (Python + FastAPI)

Saga step 2. Consumes `inventory.reserved`, writes immutable fact rows, refreshes
the daily rollup, then publishes `analytics.recorded` — the event that both
Inventory (commit stock) and Notification (fan-out) are waiting for.

## Events

| Consumes | Publishes |
| --- | --- |
| `inventory.reserved` | `analytics.recorded` |
| `order.cancelled` | `analytics.reverted` |

Queue: `analytics.events` (durable, prefetch 10).
`INSERT IGNORE` on `(order_id, product_id)` makes redelivery harmless.

## HTTP (internal, called by the gateway only)

`GET /health` · `GET /reports/overview?days=30` · `GET /reports/revenue?days=30` ·
`GET /reports/top-products?limit=10&days=30` · `GET /reports/gender-mix?days=30` ·
`POST /reports/rebuild`

Interactive docs: `http://localhost:8000/docs`

## Run

```bash
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

docker build -t sporthub/analytics-service .
docker run --rm -p 8000:8000 --env-file .env sporthub/analytics-service
```
