-- ============================================================
-- PokeShop - Shared MySQL schema (Aiven cloud, db: defaultdb)
-- Table prefix = logical schema boundary per service.
--   cat_*  -> owned by API Gateway (catalog + users + orders)
--   inv_*  -> owned by Inventory Service (Go)
--   ana_*  -> owned by Analytics Service (FastAPI)
--   ntf_*  -> owned by Notification Service (Node)
-- Only the owning service writes its own tables.
-- ============================================================

-- ---------- Catalog / Identity / Orders (API Gateway) ----------
CREATE TABLE IF NOT EXISTS cat_users (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,  -- Firebase UID
  email         VARCHAR(255) NOT NULL,
  display_name  VARCHAR(255) NULL,
  photo_url     VARCHAR(512) NULL,
  role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  fcm_token     VARCHAR(512) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cat_categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(120) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cat_products (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  sku          VARCHAR(64)  NOT NULL,
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL,
  description  TEXT NULL,
  image_url    VARCHAR(512) NULL,
  price        DECIMAL(12,2) NOT NULL DEFAULT 0,
  category_id  INT NULL,
  rarity       ENUM('common','uncommon','rare','holo_rare','ultra_rare','secret_rare') NOT NULL DEFAULT 'common',
  card_set     VARCHAR(120) NULL,
  status       ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_products_sku  (sku),
  UNIQUE KEY uq_cat_products_slug (slug),
  KEY idx_cat_products_category (category_id),
  CONSTRAINT fk_cat_products_category FOREIGN KEY (category_id) REFERENCES cat_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cat_orders (
  id           VARCHAR(64) NOT NULL PRIMARY KEY,     -- also the saga correlation id
  user_id      VARCHAR(64) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status       ENUM('pending','reserved','confirmed','failed','cancelled') NOT NULL DEFAULT 'pending',
  fail_reason  VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cat_orders_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cat_order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    VARCHAR(64) NOT NULL,
  product_id  INT NOT NULL,
  sku         VARCHAR(64) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  unit_price  DECIMAL(12,2) NOT NULL,
  quantity    INT NOT NULL,
  KEY idx_cat_order_items_order (order_id),
  CONSTRAINT fk_cat_order_items_order FOREIGN KEY (order_id) REFERENCES cat_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Inventory (Go service) ----------
CREATE TABLE IF NOT EXISTS inv_stock (
  product_id  INT NOT NULL PRIMARY KEY,
  sku         VARCHAR(64) NOT NULL,
  on_hand     INT NOT NULL DEFAULT 0,
  reserved    INT NOT NULL DEFAULT 0,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inv_stock_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inv_movements (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  order_id    VARCHAR(64) NULL,
  kind        ENUM('reserve','release','commit','restock','adjust') NOT NULL,
  quantity    INT NOT NULL,
  note        VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_inv_movements_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Idempotency guard: one reservation per (order, product)
CREATE TABLE IF NOT EXISTS inv_reservations (
  order_id    VARCHAR(64) NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL,
  state       ENUM('held','committed','released') NOT NULL DEFAULT 'held',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Analytics (FastAPI service) ----------
CREATE TABLE IF NOT EXISTS ana_sales_facts (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id     VARCHAR(64) NOT NULL,
  user_id      VARCHAR(64) NOT NULL,
  product_id   INT NOT NULL,
  sku          VARCHAR(64) NOT NULL,
  quantity     INT NOT NULL,
  unit_price   DECIMAL(12,2) NOT NULL,
  line_total   DECIMAL(12,2) NOT NULL,
  occurred_at  DATETIME NOT NULL,
  UNIQUE KEY uq_ana_fact (order_id, product_id),
  KEY idx_ana_facts_time (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ana_daily_rollup (
  day          DATE NOT NULL PRIMARY KEY,
  orders_count INT NOT NULL DEFAULT 0,
  items_sold   INT NOT NULL DEFAULT 0,
  revenue      DECIMAL(14,2) NOT NULL DEFAULT 0,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Notification (Node service) ----------
-- Saga tracker: notification pushes only when every step committed.
CREATE TABLE IF NOT EXISTS ntf_saga_state (
  order_id     VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id      VARCHAR(64) NOT NULL,
  steps_json   JSON NOT NULL,
  status       ENUM('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ntf_notifications (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL,
  order_id    VARCHAR(64) NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NULL,
  channel     ENUM('fcm','inapp') NOT NULL DEFAULT 'fcm',
  delivered   TINYINT(1) NOT NULL DEFAULT 0,
  error       VARCHAR(512) NULL,
  read_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ntf_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
