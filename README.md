# SportHub — Sportswear & Footwear E-commerce

Đồ án môn **Thiết kế thành phần và Kiến trúc hệ thống** — website thương mại điện tử
bán đồ thể thao (giày, quần áo, phụ kiện), thiết kế theo **kiến trúc Microservices** và mô tả bằng **C4 Model**.

Hệ thống gồm 5 thành phần triển khai độc lập (mỗi thư mục = 1 Dockerfile riêng), giao tiếp
bất đồng bộ qua **RabbitMQ (CloudAMQP)**, dùng chung **MySQL (Aiven)**, xác thực bằng
**Firebase Auth** và đẩy thông báo bằng **Firebase Cloud Messaging**.

| Thư mục | Vai trò | Công nghệ | Port |
| --- | --- | --- | --- |
| [`frontend/`](frontend) | Storefront + CMS (SPA) | React 18, Vite, Tailwind, shadcn/ui | 5173 |
| [`api-gateway/`](api-gateway) | API Gateway + Orchestrator + Auth + CMS API | Node.js 22, Express | 8080 |
| [`inventory-service/`](inventory-service) | Quản lý tồn kho, giữ/commit/hoàn kho | Go 1.23 | 9000 |
| [`analytics-service/`](analytics-service) | Thống kê, báo cáo | Python 3.12, FastAPI | 8000 |
| [`notification-service/`](notification-service) | Theo dõi saga + bắn FCM | Node.js 22 | 7000 |
| [`infra/sql/`](infra/sql) | Schema + seed dữ liệu mẫu | MySQL 8 | — |

---

## 1. C4 Model

### 1.1 Level 1 — System Context

```mermaid
graph TB
    customer["👤 Khách hàng<br/>(Trainer)"]
    admin["👤 Quản trị viên<br/>(CMS)"]

    subgraph boundary["SportHub System"]
        sporthub["SportHub<br/>Website bán đồ thể thao<br/>(Microservices)"]
    end

    firebase["Firebase<br/>Auth + Cloud Messaging"]
    rabbit["CloudAMQP<br/>RabbitMQ broker"]
    mysql["Aiven MySQL<br/>Cơ sở dữ liệu"]

    customer -->|"Duyệt sản phẩm, đặt hàng, nhận thông báo (HTTPS)"| sporthub
    admin -->|"Quản lý sản phẩm, kho, xem báo cáo (HTTPS)"| sporthub

    sporthub -->|"Xác thực ID token / gửi push"| firebase
    sporthub -->|"Publish & consume domain events (AMQPS)"| rabbit
    sporthub -->|"Đọc / ghi dữ liệu (TLS)"| mysql
    firebase -.->|"Web push notification"| customer
```

### 1.2 Level 2 — Container

```mermaid
graph TB
    customer["👤 Khách hàng / Quản trị viên"]

    subgraph sporthub["SportHub System"]
        fe["Frontend SPA<br/>[React + Vite + Tailwind + shadcn/ui]<br/>Storefront &amp; CMS<br/>:5173"]
        gw["API Gateway / Orchestrator<br/>[Node.js + Express]<br/>Routing, Auth, CMS, Orders<br/>:8080"]
        inv["Inventory Service<br/>[Go]<br/>Giữ / commit / hoàn kho<br/>:9000"]
        ana["Analytics Service<br/>[Python + FastAPI]<br/>Thống kê &amp; báo cáo<br/>:8000"]
        ntf["Notification Service<br/>[Node.js]<br/>Saga tracker + FCM<br/>:7000"]
    end

    mq["RabbitMQ<br/>topic exchange: pokeshop.events"]
    db[("MySQL — defaultdb<br/>cat_* | inv_* | ana_* | ntf_*")]
    fb["Firebase<br/>Auth + FCM"]

    customer -->|HTTPS| fe
    fe -->|"REST /api/**  (Bearer ID token)"| gw
    fe -->|"đăng nhập / nhận push"| fb

    gw -->|"verifyIdToken"| fb
    gw -->|"HTTP nội bộ: /reports/*"| ana
    gw -->|"HTTP nội bộ: /stock, /restock"| inv

    gw -->|"publish order.*, product.*"| mq
    mq -->|"consume"| inv
    mq -->|"consume"| ana
    mq -->|"consume"| ntf
    inv -->|"publish inventory.*"| mq
    ana -->|"publish analytics.*"| mq
    mq -->|"inventory.*, analytics.*"| gw

    ntf -->|"gửi push"| fb

    gw --> db
    inv --> db
    ana --> db
    ntf --> db
```

> **Nguyên tắc:** Frontend **chỉ** biết một địa chỉ duy nhất là API Gateway.
> Ba service còn lại không expose ra Internet — chúng chỉ nhận việc qua RabbitMQ
> và cung cấp HTTP nội bộ cho gateway gọi.

### 1.3 Level 3 — Component (API Gateway)

```mermaid
graph TB
    subgraph gw["API Gateway (Node.js + Express)"]
        mw["Middleware chain<br/>helmet · cors · rate-limit · morgan"]
        auth["Auth Middleware<br/>requireAuth / requireAdmin / optionalAuth<br/>+ upsert cat_users"]
        valid["Validation<br/>zod schemas"]

        rProduct["Products Router<br/>CRUD + filter + phân trang"]
        rCat["Categories Router"]
        rOrder["Orders Router<br/>khởi tạo saga"]
        rUser["Users Router<br/>/me · role · fcm-token"]
        rAna["Analytics Router (proxy)"]
        rInv["Inventory Router (proxy)"]
        rNtf["Notifications Router"]

        broker["Broker (amqplib)<br/>confirm channel, publish"]
        saga["Saga Consumer<br/>queue gateway.saga<br/>projection trạng thái đơn"]
        proxy["Proxy client (fetch)<br/>timeout + map lỗi upstream"]
        dbp["MySQL Pool (mysql2)"]
    end

    fe["Frontend SPA"] --> mw --> auth --> valid
    valid --> rProduct & rCat & rOrder & rUser & rAna & rInv & rNtf

    rProduct --> broker
    rOrder --> broker
    rAna --> proxy
    rInv --> proxy

    rProduct & rCat & rOrder & rUser & rNtf --> dbp
    saga --> dbp
    auth -->|verifyIdToken| fbadmin["Firebase Admin SDK"]
    broker --> mq["RabbitMQ"]
    mq --> saga
    proxy --> svc["Analytics / Inventory"]
```

### 1.4 Level 3 — Component (các service còn lại)

```mermaid
graph LR
    subgraph inv["Inventory Service (Go)"]
        imq["mq.Broker<br/>consume + publish"]
        ih["handler.Events<br/>reserve / commit / release"]
        irepo["db.Repo<br/>TX + SELECT FOR UPDATE"]
        ihttp["handler.HTTP<br/>/stock /restock /movements"]
        imq --> ih --> irepo
        ihttp --> irepo
    end

    subgraph ana["Analytics Service (FastAPI)"]
        amq["messaging<br/>aio-pika consumer"]
        asvc["services.reports<br/>record / rollup / query"]
        arouter["routers.reports<br/>/reports/*"]
        amq --> asvc
        arouter --> asvc
    end

    subgraph ntf["Notification Service (Node)"]
        nmq["consumers/events<br/>8 routing keys"]
        nsaga["services/saga<br/>ntf_saga_state"]
        nfcm["services/fcm<br/>firebase-admin messaging"]
        nmq --> nsaga --> nfcm
    end
```

### 1.5 Level 4 — Code (mô hình dữ liệu)

```mermaid
erDiagram
    cat_users ||--o{ cat_orders : "đặt"
    cat_orders ||--|{ cat_order_items : "gồm"
    cat_categories ||--o{ cat_products : "phân loại"
    cat_products ||--|| inv_stock : "tồn kho"
    cat_products ||--o{ cat_order_items : "được mua"
    cat_orders ||--o{ inv_reservations : "giữ kho"
    cat_orders ||--o{ ana_sales_facts : "sinh ra"
    cat_orders ||--|| ntf_saga_state : "theo dõi"
    cat_users ||--o{ ntf_notifications : "nhận"

    cat_users {
        string id PK "Firebase UID"
        string email
        string role
        string fcm_token
    }
    cat_products {
        int id PK
        string sku
        string name
        decimal price
        string gender
        string sport
        string status
    }
    cat_orders {
        string id PK
        string user_id FK
        decimal total_amount
        string status
        string fail_reason
    }
    cat_order_items {
        int id PK
        string order_id FK
        int product_id FK
        int quantity
        decimal unit_price
    }
    inv_stock {
        int product_id PK
        string sku
        int on_hand
        int reserved
    }
    inv_reservations {
        string order_id PK
        int product_id PK
        int quantity
        string state
    }
    inv_movements {
        bigint id PK
        int product_id
        string kind
        int quantity
    }
    ana_sales_facts {
        bigint id PK
        string order_id
        int product_id
        int quantity
        decimal line_total
    }
    ana_daily_rollup {
        date day PK
        int orders_count
        decimal revenue
    }
    ntf_saga_state {
        string order_id PK
        string user_id
        json steps_json
        string status
    }
    ntf_notifications {
        bigint id PK
        string user_id
        string title
        bool delivered
    }
```

Mỗi service chỉ **ghi** vào nhóm bảng do nó sở hữu (`cat_*`, `inv_*`, `ana_*`, `ntf_*`) —
đây là ranh giới "schema per service" trên cùng một MySQL instance (chấp nhận đánh đổi
để phù hợp quy mô đồ án; ranh giới nghiệp vụ vẫn được giữ nguyên).

---

## 2. Luồng nghiệp vụ chính — Saga đặt hàng

Đặt hàng là một **distributed transaction** chạy theo mô hình *choreography saga*.
Đơn hàng chỉ được xác nhận khi **tất cả** các bước đều commit; nếu một bước hỏng,
các bước trước đó được bù trừ (compensating transaction).

```mermaid
sequenceDiagram
    autonumber
    participant U as Khách hàng
    participant FE as Frontend
    participant GW as API Gateway
    participant MQ as RabbitMQ
    participant INV as Inventory (Go)
    participant ANA as Analytics (FastAPI)
    participant NTF as Notification
    participant FCM as Firebase FCM

    U->>FE: Bấm "Place order"
    FE->>GW: POST /api/orders (Bearer token)
    GW->>GW: verify token, tạo cat_orders = pending
    GW-->>FE: 202 Accepted (orderId)
    GW->>MQ: publish order.created

    MQ->>NTF: order.created
    NTF->>NTF: mở saga (ntf_saga_state = in_progress)

    MQ->>INV: order.created
    INV->>INV: TX: SELECT FOR UPDATE, reserved += qty
    alt Đủ hàng
        INV->>MQ: publish inventory.reserved (step=inventory, committed)
        MQ->>GW: inventory.reserved -> order = reserved
        MQ->>NTF: ghi nhận bước inventory
        MQ->>ANA: inventory.reserved
        ANA->>ANA: ghi ana_sales_facts + rollup
        ANA->>MQ: publish analytics.recorded (step=analytics, committed)
        MQ->>GW: analytics.recorded -> order = confirmed
        MQ->>INV: analytics.recorded
        INV->>INV: TX: on_hand -= qty, reserved -= qty
        INV->>MQ: publish inventory.committed (step=inventory-commit)
        MQ->>NTF: ghi nhận bước cuối
        NTF->>NTF: đủ 3/3 bước -> saga = completed
        NTF->>FCM: send("Order confirmed 🎉")
        FCM-->>U: Web push
    else Hết hàng
        INV->>MQ: publish inventory.failed (reason)
        MQ->>GW: order = failed + fail_reason
        MQ->>NTF: saga = failed
        NTF->>FCM: send("Order could not be completed")
        FCM-->>U: Web push
    end
```

### Luồng bù trừ (huỷ đơn)

```mermaid
sequenceDiagram
    participant U as Khách hàng
    participant GW as API Gateway
    participant MQ as RabbitMQ
    participant INV as Inventory
    participant ANA as Analytics
    participant NTF as Notification

    U->>GW: POST /api/orders/:id/cancel
    GW->>GW: cat_orders.status = cancelled
    GW->>MQ: publish order.cancelled
    MQ->>INV: hoàn kho (reserved -= qty, state = released)
    INV->>MQ: inventory.released
    MQ->>ANA: xoá ana_sales_facts của đơn
    ANA->>MQ: analytics.reverted
    MQ->>NTF: thông báo "Order cancelled"
```

### Luồng CMS (thêm/sửa/xoá sản phẩm)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as CMS
    participant GW as API Gateway
    participant MQ as RabbitMQ
    participant INV as Inventory

    A->>FE: Tạo sản phẩm + tồn kho ban đầu
    FE->>GW: POST /api/products (admin token)
    GW->>GW: ghi cat_products
    GW->>MQ: publish product.created {productId, sku, initialStock}
    MQ->>INV: tạo dòng inv_stock tương ứng
    GW-->>FE: 201 Created
```

---

## 3. Catalog sự kiện (RabbitMQ)

Exchange: **`pokeshop.events`** — kiểu `topic`, `durable`.
Tất cả message dùng chung envelope:

```json
{
  "eventId": "order.created-1757062353-ab12cd",
  "type": "order.created",
  "source": "api-gateway",
  "occurredAt": "2026-09-04T09:12:33.000Z",
  "correlationId": "ORD-x7Kd93mLp01",
  "data": { "...": "payload riêng của từng sự kiện" }
}
```

| Routing key | Publisher | Consumer(s) | Ý nghĩa |
| --- | --- | --- | --- |
| `order.created` | API Gateway | Inventory, Notification | Bắt đầu saga |
| `order.cancelled` | API Gateway | Inventory, Analytics, Notification | Bù trừ |
| `product.created` / `.updated` / `.deleted` | API Gateway | Inventory | Đồng bộ dòng tồn kho |
| `inventory.reserved` | Inventory | Gateway, Analytics, Notification | Giữ kho thành công |
| `inventory.failed` | Inventory | Gateway, Notification | Không đủ hàng |
| `inventory.committed` | Inventory | Notification | Trừ kho thật xong |
| `inventory.released` | Inventory | Notification | Đã hoàn kho |
| `analytics.recorded` | Analytics | Gateway, Inventory, Notification | Ghi nhận thống kê xong |
| `analytics.reverted` | Analytics | Notification | Đã gỡ số liệu |

| Queue | Chủ sở hữu | Binding |
| --- | --- | --- |
| `inventory.commands` | Inventory | `order.created`, `order.cancelled`, `analytics.recorded`, `product.*` |
| `analytics.events` | Analytics | `inventory.reserved`, `order.cancelled` |
| `notification.events` | Notification | 8 key ở trên |
| `gateway.saga` | API Gateway | `inventory.reserved`, `inventory.failed`, `analytics.recorded` |

**Độ tin cậy:** publish `persistent` + confirm channel, queue `durable`, `prefetch=10`,
ack thủ công. Lỗi nghiệp vụ (hết hàng) được publish rồi ack — retry vô nghĩa.
Lỗi hạ tầng thì `nack(requeue=false)` để không kẹt hàng đợi.
**Idempotency:** khoá `(order_id, product_id)` trên `inv_reservations` và
`INSERT IGNORE` trên `ana_sales_facts` khiến message lặp không gây sai số liệu.

---

## 3.1. Mức độ event-driven của từng service

Hệ thống theo hướng **event-driven cho mọi thao tác ghi**, còn **đọc thì gọi HTTP đồng bộ** —
đây là ranh giới kiểu CQRS: lệnh (command) đi qua RabbitMQ, truy vấn (query) đi thẳng.

| Service | Publish event | Consume event | HTTP đồng bộ | Mức độ |
| --- | --- | --- | --- | --- |
| **API Gateway** | `order.*`, `product.*` | queue `gateway.saga` | nhận REST từ FE; gọi Analytics/Inventory để **đọc** | Hybrid (edge service) |
| **Inventory (Go)** | `inventory.*` | queue `inventory.commands` | chỉ phục vụ gateway: đọc tồn kho + `POST /restock` | Event-driven cho nghiệp vụ đơn hàng |
| **Analytics (FastAPI)** | `analytics.*` | queue `analytics.events` | chỉ đọc báo cáo `/reports/*` | Event-driven hoàn toàn ở phía ghi |
| **Notification (Node)** | — | queue `notification.events` | chỉ endpoint quan sát `/sagas`, `/health` | **Thuần event-driven** |

Ba điểm **không** phải event-driven, và lý do:

1. **Frontend → Gateway là REST đồng bộ.** Trình duyệt cần phản hồi ngay; đặt hàng
   trả `202 Accepted` rồi phần còn lại mới chạy bất đồng bộ.
2. **Gateway → Analytics / Inventory khi đọc.** Báo cáo và số tồn kho là *truy vấn*,
   không phải *lệnh*. Đẩy qua message queue chỉ để lấy dữ liệu về sẽ phải tự chế
   request/reply + correlation id — phức tạp hơn mà không được gì.
3. **`POST /inventory/restock` là lệnh ghi đồng bộ.** Đây là ngoại lệ có chủ đích:
   admin cần biết ngay kết quả nhập kho. Muốn thuần event-driven thì đổi thành
   publish `inventory.restock.requested` và cho CMS chờ event phản hồi.

Không service nào gọi HTTP trực tiếp sang service khác ngoài gateway — mọi liên lạc
**giữa các service nghiệp vụ** đều đi qua RabbitMQ.

## 3.2. Sơ đồ luồng message

### Bản đồ publish / subscribe

```mermaid
flowchart LR
    subgraph producers["Publisher"]
        GW["API Gateway"]
        INV["Inventory<br/>(Go)"]
        ANA["Analytics<br/>(FastAPI)"]
    end

    EX{{"Topic Exchange<br/><b>pokeshop.events</b>"}}

    subgraph queues["Queue (durable)"]
        QI["inventory.commands"]
        QA["analytics.events"]
        QN["notification.events"]
        QG["gateway.saga"]
    end

    subgraph consumers["Consumer"]
        CINV["Inventory"]
        CANA["Analytics"]
        CNTF["Notification"]
        CGW["API Gateway"]
    end

    GW -->|"order.created<br/>order.cancelled<br/>product.created/updated/deleted"| EX
    INV -->|"inventory.reserved<br/>inventory.failed<br/>inventory.committed<br/>inventory.released"| EX
    ANA -->|"analytics.recorded<br/>analytics.reverted"| EX

    EX -->|"order.created · order.cancelled<br/>analytics.recorded · product.*"| QI
    EX -->|"inventory.reserved · order.cancelled"| QA
    EX -->|"tất cả 9 routing key"| QN
    EX -->|"inventory.reserved · inventory.failed<br/>analytics.recorded"| QG

    QI --> CINV
    QA --> CANA
    QN --> CNTF
    QG --> CGW

    CNTF -->|"FCM push"| FCM["Firebase<br/>Cloud Messaging"]
```

### Thứ tự message trong một đơn hàng thành công

```mermaid
flowchart TD
    A["FE: POST /api/orders"] --> B["Gateway: ghi cat_orders = pending<br/>trả 202 Accepted"]
    B --> E1(["📨 order.created"])

    E1 --> N1["Notification: mở saga<br/>steps = {}"]
    E1 --> I1["Inventory: TX giữ kho<br/>reserved += qty"]

    I1 --> E2(["📨 inventory.reserved"])
    E2 --> G1["Gateway: order = reserved"]
    E2 --> N2["Notification: steps.inventory = committed<br/>(1/3)"]
    E2 --> A1["Analytics: ghi ana_sales_facts<br/>+ cập nhật rollup"]

    A1 --> E3(["📨 analytics.recorded"])
    E3 --> G2["Gateway: order = confirmed"]
    E3 --> N3["Notification: steps.analytics = committed<br/>(2/3)"]
    E3 --> I2["Inventory: TX trừ kho thật<br/>on_hand -= qty, reserved -= qty"]

    I2 --> E4(["📨 inventory.committed"])
    E4 --> N4["Notification: steps.inventory-commit = committed<br/><b>3/3 → saga completed</b>"]
    N4 --> P["🔔 FCM push 'Order confirmed'<br/>+ ghi ntf_notifications"]

    style E1 fill:#dbeafe,stroke:#3b82f6
    style E2 fill:#dbeafe,stroke:#3b82f6
    style E3 fill:#dbeafe,stroke:#3b82f6
    style E4 fill:#dbeafe,stroke:#3b82f6
    style P fill:#dcfce7,stroke:#22c55e
```

### Luồng message khi thất bại và khi bù trừ

```mermaid
flowchart TD
    subgraph fail["Hết hàng — dừng ngay ở bước 1"]
        F1(["📨 order.created"]) --> F2["Inventory: thiếu tồn kho<br/>ROLLBACK transaction"]
        F2 --> F3(["📨 inventory.failed<br/>reason: insufficient stock"])
        F3 --> F4["Gateway: order = failed<br/>+ fail_reason"]
        F3 --> F5["Notification: saga = failed"]
        F5 --> F6["🔔 push 'Order could not be completed'"]
    end

    subgraph cancel["Khách huỷ đơn — bù trừ ngược"]
        C1["FE: POST /orders/:id/cancel"] --> C2["Gateway: order = cancelled"]
        C2 --> C3(["📨 order.cancelled"])
        C3 --> C4["Inventory: reserved -= qty<br/>reservation = released"]
        C3 --> C5["Analytics: xoá ana_sales_facts"]
        C3 --> C6["Notification: đóng saga (im lặng)<br/>+ 🔔 push 'Order cancelled'"]
        C4 --> C7(["📨 inventory.released"])
        C5 --> C8(["📨 analytics.reverted"])
    end

    style F3 fill:#fee2e2,stroke:#ef4444
    style C3 fill:#fef3c7,stroke:#f59e0b
    style C7 fill:#fef3c7,stroke:#f59e0b
    style C8 fill:#fef3c7,stroke:#f59e0b
```

### Ranh giới đồng bộ / bất đồng bộ

```mermaid
flowchart LR
    FE["Frontend SPA"]
    GW["API Gateway"]
    INV["Inventory"]
    ANA["Analytics"]
    NTF["Notification"]
    MQ{{"RabbitMQ"}}
    FCM["Firebase FCM"]

    FE -->|"REST đồng bộ<br/>(đặt hàng trả 202)"| GW
    GW -.->|"HTTP đọc: /reports/*"| ANA
    GW -.->|"HTTP đọc: /stock<br/>+ POST /restock"| INV

    GW ==>|"publish"| MQ
    MQ ==>|"consume"| INV
    MQ ==>|"consume"| ANA
    MQ ==>|"consume"| NTF
    INV ==>|"publish"| MQ
    ANA ==>|"publish"| MQ
    MQ ==>|"consume"| GW

    NTF -->|"push"| FCM
    FCM -.->|"web push"| FE

    linkStyle 0,1,2 stroke:#f59e0b,stroke-width:2px
    linkStyle 3,4,5,6,7,8,9 stroke:#3b82f6,stroke-width:3px
```

> ━━ **xanh, nét đậm** = bất đồng bộ qua RabbitMQ (mọi thao tác ghi nghiệp vụ)
> ┄┄ **cam, nét đứt** = HTTP đồng bộ (truy vấn đọc + REST cho trình duyệt)

### Vòng đời trạng thái đơn hàng (do event dẫn dắt)

```mermaid
stateDiagram-v2
    [*] --> pending: POST /api/orders<br/>(publish order.created)
    pending --> reserved: inventory.reserved
    pending --> failed: inventory.failed
    reserved --> confirmed: analytics.recorded
    pending --> cancelled: order.cancelled
    reserved --> cancelled: order.cancelled
    failed --> pending: admin replay<br/>(publish lại order.created)
    confirmed --> [*]
    failed --> [*]
    cancelled --> [*]
```

## 4. Deployment

```mermaid
graph TB
    subgraph host["Docker host (mỗi service 1 container độc lập)"]
        c1["sporthub-frontend<br/>nginx:80 -> 5173"]
        c2["sporthub-api-gateway<br/>node:8080"]
        c3["sporthub-inventory-service<br/>go:9000"]
        c4["sporthub-analytics-service<br/>uvicorn:8000"]
        c5["sporthub-notification-service<br/>node:7000"]
    end

    subgraph cloud["Dịch vụ đám mây"]
        amqp["CloudAMQP<br/>armadillo.rmq.cloudamqp.com:5671"]
        aiven["Aiven MySQL<br/>...aivencloud.com:18287"]
        fbase["Firebase<br/>Auth + FCM"]
    end

    c1 --> c2
    c2 --> c3 & c4
    c2 & c3 & c4 & c5 --> amqp
    c2 & c3 & c4 & c5 --> aiven
    c2 & c5 --> fbase
    c1 --> fbase
```

Mỗi thư mục có `Dockerfile` riêng, `.env.example` riêng, build/run độc lập:

```bash
docker build -t sporthub/inventory-service ./inventory-service
docker run --rm -p 9000:9000 --env-file inventory-service/.env sporthub/inventory-service
```

`docker-compose.yml` ở thư mục gốc chỉ là tiện ích chạy cả 5 cùng lúc — không có
container nào dùng chung image hay Dockerfile.

---

## 5. Chạy dự án

### 5.1 Chuẩn bị

```bash
make setup     # copy .env.example -> .env cho cả 5 thư mục
make seed      # tạo bảng trong MySQL cloud + nạp dữ liệu mẫu
make reseed    # xoá catalogue cũ, tạo lại schema và nạp lại dữ liệu mẫu
```

Hoặc thủ công:

```bash
cd api-gateway && cp .env.example .env && npm install && npm run migrate -- --seed
```

### 5.2 Chạy bằng Docker (khuyến nghị)

```bash
make build && make up      # hoặc: docker compose build && docker compose up -d
make health                # kiểm tra 4 service backend
```

- Storefront: <http://localhost:5173>
- CMS: <http://localhost:5173/cms>
- Gateway: <http://localhost:8080/health>
- FastAPI docs: <http://localhost:8000/docs>
- Saga inspector: <http://localhost:7000/sagas>

### 5.3 Chạy từng service ở chế độ dev

```bash
cd api-gateway           && npm install && npm run dev      # :8080
cd inventory-service     && go mod tidy && go run .         # :9000
cd analytics-service     && pip install -r requirements.txt && uvicorn app.main:app --reload  # :8000
cd notification-service  && npm install && npm run dev      # :7000
cd frontend              && npm install && npm run dev      # :5173
```

### 5.4 Thử luồng saga bằng curl

```bash
# đăng nhập dev (khi Firebase còn là placeholder)
TOKEN="dev:demo-customer:customer"

curl -s localhost:8080/api/products | head -c 400

curl -s -X POST localhost:8080/api/orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":4,"quantity":2}]}'

curl -s localhost:7000/sagas | head -c 400     # theo dõi saga
```

---

## 6. Cấu hình

Thông tin hạ tầng đã điền sẵn trong các file `.env.example`:

| Thành phần | Giá trị |
| --- | --- |
| MySQL | `mysql-c65cf31-lua-ae9f.f.aivencloud.com:18287` · db `defaultdb` · user `avnadmin` · SSL bắt buộc |
| RabbitMQ | `amqps://kebmlpzn:***@armadillo.rmq.cloudamqp.com/kebmlpzn` |
| Firebase | Project `local-ai-6b086` — Web SDK + service-account **đã cấu hình**. Còn thiếu: `VITE_FIREBASE_VAPID_KEY` |

### Firebase

Project: **`local-ai-6b086`**.

**Frontend.** `frontend/.env` và `frontend/public/firebase-messaging-sw.js`
đã có web config. Còn thiếu duy nhất `VITE_FIREBASE_VAPID_KEY`
(Console → Project settings → Cloud Messaging → *Web Push certificates* → Key pair) —
thiếu key này thì trình duyệt không lấy được FCM token, push web sẽ không chạy.

**Gateway + Notification Service — đã cấu hình.** Service-account nằm ở
`secrets/firebase-service-account.json` (không commit, xem [`secrets/README.md`](secrets/README.md)),
được mount vào container qua `docker-compose.yml`:

```
FIREBASE_SERVICE_ACCOUNT_PATH=/run/secrets/firebase-service-account.json
FIREBASE_PROJECT_ID=local-ai-6b086
```

`curl localhost:8080/health` trả `"firebase":"ready"` là đúng.
Không cần `databaseURL` — dự án chỉ dùng Auth + FCM, không dùng Realtime Database.

Thứ tự xác thực ở gateway: token `dev:<uid>:<role>` được chấp nhận **trước** (chỉ khi
`AUTH_DEV_BYPASS=true`), còn lại verify bằng Firebase Admin. **Đặt `AUTH_DEV_BYPASS=false`
trước khi triển khai thật** — để `true` nghĩa là bất kỳ ai cũng mạo danh được admin.

> **Tài khoản demo:** khi `AUTH_DEV_BYPASS=true`, token `Bearer dev:demo-admin:admin`
> và `dev:demo-customer:customer` dùng để demo saga/CMS mà không cần tạo user Firebase.
> Thông báo luôn được ghi vào `ntf_notifications` (chuông thông báo trên frontend)
> trước khi đẩy qua FCM, nên không mất thông báo nếu push lỗi.
> **Không bao giờ bật `AUTH_DEV_BYPASS` ở môi trường production.**

---

## 7. API (qua API Gateway)

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/health` | công khai | Trạng thái MySQL / RabbitMQ / Firebase |
| GET | `/api/products` | công khai | Lọc `q, category, gender, sport, minPrice, maxPrice, sort, page, limit` |
| GET | `/api/products/facets` | công khai | Danh sách môn thể thao để lọc |
| GET | `/api/products/:idOrSlug` | công khai | Chi tiết sản phẩm |
| POST · PUT · DELETE | `/api/products[/:id]` | admin | CMS — phát `product.*` |
| GET | `/api/categories` | công khai | Danh mục |
| POST · PUT · DELETE | `/api/categories[/:id]` | admin | CMS |
| POST | `/api/orders` | user | Đặt hàng → `202` + phát `order.created` |
| GET | `/api/orders`, `/api/orders/:id` | user | Admin xem tất cả |
| POST | `/api/orders/:id/cancel` | user | Bù trừ saga |
| POST | `/api/orders/:id/retry` | admin | Phát lại saga bị kẹt |
| GET | `/api/users/me` | user | Đồng bộ hồ sơ từ Firebase |
| PUT | `/api/users/me/fcm-token` | user | Đăng ký token push |
| GET | `/api/users` · PUT `/api/users/:id/role` | admin | Quản lý người dùng |
| GET | `/api/analytics/{overview,revenue,top-products,gender-mix}` | admin | Proxy → FastAPI |
| GET | `/api/inventory/stock/:productId` | công khai | Proxy → Go |
| GET | `/api/inventory/{stock,movements}` · POST `/api/inventory/restock` | admin | Proxy → Go |
| GET | `/api/notifications` · POST `/api/notifications/read-all` | user | Feed thông báo |

---

## 8. Quyết định thiết kế & đánh đổi

| Quyết định | Lý do | Đánh đổi |
| --- | --- | --- |
| Gateway kiêm orchestrator | Một điểm vào duy nhất, dễ đặt auth/rate-limit; FE chỉ cần biết 1 origin | Gateway là điểm nghẽn tiềm tàng |
| Choreography saga thay vì 2PC | MySQL cloud không hỗ trợ XA qua nhiều service; loose coupling | Nhất quán *cuối cùng* (eventual) |
| Đặt hàng trả `202 Accepted` | Không chặn người dùng chờ giữ kho | FE phải poll hoặc chờ push |
| Dùng chung 1 MySQL, tách theo tiền tố bảng | Đủ để thể hiện ranh giới service, hợp quy mô đồ án | Không cô lập lỗi ở tầng DB |
| Ngôn ngữ khác nhau cho từng service (Node/Go/Python) | Go mạnh về concurrency cho tồn kho, Python mạnh về phân tích dữ liệu | Chi phí vận hành đa runtime |
| Notification là nơi duy nhất quyết định "xong" | Tách logic hoàn tất saga khỏi nghiệp vụ | Thêm một service phải luôn sống |
| Xoá mềm sản phẩm (archive) | Giữ toàn vẹn lịch sử đơn hàng | Bảng lớn dần |

## 9. Cấu trúc thư mục

```
hcmute-design-pattern/
├── README.md                  # tài liệu kiến trúc tổng hợp (file này)
├── docker-compose.yml         # tiện ích chạy cả 5 container
├── Makefile                   # setup / migrate / build / up / health
├── infra/sql/                 # init.sql + seed.sql
├── frontend/                  # React + Vite + Tailwind + shadcn/ui  (Dockerfile riêng)
├── api-gateway/               # Node.js + Express                    (Dockerfile riêng)
├── inventory-service/         # Go                                   (Dockerfile riêng)
├── analytics-service/         # Python + FastAPI                     (Dockerfile riêng)
└── notification-service/      # Node.js + firebase-admin             (Dockerfile riêng)
```

Mỗi thư mục service có README riêng mô tả sự kiện, endpoint và cách chạy.
