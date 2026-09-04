# API Gateway / Orchestrator (Node.js + Express)

Single entry point for the SPA. Owns identity, catalog, orders; verifies Firebase
ID tokens; starts the order saga on RabbitMQ; proxies reporting and stock queries
to the Analytics and Inventory services.

## Run

```bash
cp .env.example .env
npm install
npm run migrate -- --seed   # creates tables in the shared MySQL and loads demo data
npm start                   # http://localhost:8080
```

Docker (standalone, no compose):

```bash
docker build -t pokeshop/api-gateway .
docker run --rm -p 8080:8080 --env-file .env pokeshop/api-gateway
```

## Endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | – | MySQL + RabbitMQ + Firebase status |
| GET | `/api/products` | optional | filters: `q, category, rarity, minPrice, maxPrice, sort, page, limit` |
| GET | `/api/products/:idOrSlug` | optional | |
| POST/PUT/DELETE | `/api/products[/:id]` | admin | CMS; emits `product.*` |
| GET | `/api/categories` | – | |
| POST/PUT/DELETE | `/api/categories[/:id]` | admin | |
| POST | `/api/orders` | user | 202 Accepted, emits `order.created` |
| GET | `/api/orders`, `/api/orders/:id` | user | admins see all |
| POST | `/api/orders/:id/cancel` | user | compensation, emits `order.cancelled` |
| POST | `/api/orders/:id/retry` | admin | replays a stuck saga |
| GET | `/api/users/me` | user | upserts the Firebase user |
| PUT | `/api/users/me/fcm-token` | user | registers the browser push token |
| GET | `/api/users`, PUT `/api/users/:id/role` | admin | |
| GET | `/api/analytics/*` | admin | proxied to FastAPI |
| GET | `/api/inventory/stock/:productId` | – | proxied to Go |
| POST | `/api/inventory/restock` | admin | proxied to Go |
| GET | `/api/notifications` | user | in-app feed |

## Auth

Production: `Authorization: Bearer <firebase-id-token>`, verified by Firebase Admin.

Placeholder phase (`AUTH_DEV_BYPASS=true`, no service account yet):
`Authorization: Bearer dev:<uid>:<role>` — e.g. `dev:demo-admin:admin`.
Turn the flag off as soon as real credentials are in place.
