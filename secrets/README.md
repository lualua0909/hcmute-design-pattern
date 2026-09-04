# secrets/

Chứa **`firebase-service-account.json`** — private key của Firebase Admin SDK
(project `local-ai-6b086`, client `firebase-adminsdk-fbsvc@local-ai-6b086.iam.gserviceaccount.com`).

File này **không được commit** (đã chặn trong `.gitignore`) và **không được đưa lên**
bất kỳ nơi công khai nào — ai có nó là có toàn quyền trên Firebase project.
Nếu lỡ lộ: Console → Project settings → Service accounts → xoá key cũ, tạo key mới.

## Đã cấu hình sẵn

`docker-compose.yml` mount file này read-only vào `api-gateway` và
`notification-service` tại `/run/secrets/firebase-service-account.json`;
hai file `.env` tương ứng đã trỏ `FIREBASE_SERVICE_ACCOUNT_PATH` tới đó.

Kiểm tra: `curl localhost:8080/health` → `"firebase":"ready"`.

## Nếu cần tạo lại

Firebase Console → ⚙ Project settings → **Service accounts** →
*Generate new private key* → lưu đè vào `secrets/firebase-service-account.json` →
`docker compose up -d --force-recreate api-gateway notification-service`.

Chạy dev không dùng Docker: trỏ `FIREBASE_SERVICE_ACCOUNT_PATH` tới đường dẫn tuyệt đối,
hoặc dán nguyên JSON một dòng vào `FIREBASE_SERVICE_ACCOUNT_JSON=`.
