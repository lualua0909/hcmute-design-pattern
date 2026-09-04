# Frontend (React + Vite + Tailwind + shadcn/ui)

Storefront **and** CMS in one SPA. It talks to exactly one backend — the API
Gateway — and never to Inventory, Analytics or Notification directly.

## Structure

```
src/
  components/ui/   shadcn/ui primitives (button, card, dialog, table, select…)
  components/      ProductCard, NotificationBell, StatusBadge, EmptyState
  hooks/           useAuth (Firebase + dev fallback), useCart (localStorage)
  layouts/         ShopLayout (storefront), AdminLayout (CMS)
  pages/           Home, Products, ProductDetail, Cart, Orders, Login
  pages/cms/       Dashboard, ProductsAdmin, InventoryAdmin, OrdersAdmin, AnalyticsAdmin, UsersAdmin
  lib/             api.js (typed-ish client), firebase.js, utils.js
```

## Routes

Storefront: `/` · `/products` · `/products/:slug` · `/cart` · `/orders` · `/login`
CMS (admin only): `/cms` · `/cms/products` · `/cms/inventory` · `/cms/orders` · `/cms/analytics` · `/cms/users`

## Auth

`VITE_FIREBASE_*` are PLACEHOLDERS. While they are empty the login page offers
the gateway's dev sign-in (`demo-customer` / `demo-admin`) so the CMS and the
whole saga stay demoable. Filling the keys switches the app to real Firebase Auth
plus FCM browser push automatically — no code change.

## Run

```bash
cp .env.example .env
npm install
npm run dev                    # http://localhost:5173

docker build -t pokeshop/frontend --build-arg VITE_API_BASE_URL=http://localhost:8080 .
docker run --rm -p 5173:80 pokeshop/frontend
```
