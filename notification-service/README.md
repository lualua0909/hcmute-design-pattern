# Notification Service (Node.js + Firebase Cloud Messaging)

The saga's completion tracker. It subscribes to every step event, keeps the
per-order state in `ntf_saga_state`, and only pushes "Order confirmed" once
**all** required steps report `committed`.

`REQUIRED_STEPS=inventory,analytics,inventory-commit`

Any step reporting `failed` or `compensated` settles the saga as failed and
sends a rollback notification instead.

## Events consumed

`order.created` (opens the saga) · `inventory.reserved` · `inventory.failed` ·
`inventory.committed` · `inventory.released` · `analytics.recorded` ·
`analytics.reverted` · `order.cancelled`

Queue: `notification.events` (durable, prefetch 10).

## HTTP

`GET /health` · `GET /sagas?limit=50` · `GET /sagas/:orderId` · `POST /test-push`

## Delivery

Notifications are written to `ntf_notifications` first, then pushed via FCM to
the token stored on `cat_users.fcm_token`. With the Firebase placeholder still
empty the service degrades to in-app only — nothing is lost. Tokens rejected as
`registration-token-not-registered` are cleared automatically.

## Run

```bash
cp .env.example .env
npm install
npm start                       # http://localhost:7000

docker build -t sporthub/notification-service .
docker run --rm -p 7000:7000 --env-file .env sporthub/notification-service
```
