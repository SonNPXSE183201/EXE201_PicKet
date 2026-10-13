# Picket API

Dart Frog REST façade for the Next.js and Expo clients. It keeps Supabase Auth,
RLS and Storage while the finance compatibility contract is persisted in the
15 normalized domain tables.

## Local development

Set the variables shown in `.env.example`, then run:

```powershell
dart_frog dev
```

Endpoints:

- `GET /health`
- `GET /v1/me`
- `POST /v1/onboarding`
- `GET /v1/entitlements`
- `POST /v1/billing/google-play/verify` (Google Play subscription token; authenticated user only)
- `GET /v1/admin/overview?page=0` (staff only; every view is audited)
- `POST /v1/admin/users/{id}/actions` (staff only; exact confirmation and audit)
- `PATCH /v1/profile`
- `PATCH /v1/preferences`
- `GET /v1/export`
- `POST /v1/import` (validate/dry-run a Picket export)
- `PUT /v1/import` (restore after exact `RESTORE` confirmation)
- `DELETE /v1/account` (yêu cầu đăng nhập lại trong 5 phút gần nhất)
- `GET /v1/finance/snapshot`
- `PUT /v1/finance/snapshot`
- `GET/POST /v1/accounts`
- `GET/POST /v1/categories`
- `GET/POST /v1/budgets`
- `GET/POST /v1/transactions`

Finance endpoints require the user's Supabase access token. The API verifies the
token with Supabase Auth and forwards the same token to PostgREST, preserving the
owner RLS. Onboarding creates profile, preferences and the first wallet in one
database transaction. The `/v1/finance/snapshot` URL remains a compatibility
contract, but its load/save RPCs read and write normalized tables.

Import accepts only `picket-export-v1` files with schema version 1 and finance
payload version 2. Clients must validate first, obtain the current snapshot
revision, and send that revision with exact `RESTORE` confirmation. A concurrent
change returns a conflict and the normalized save RPC rolls back the whole write.
Request bodies are limited to 11 MB.

Google Play billing goes through the Dart API. The public API validates the
product allow-list, authenticates the caller and forwards only the product ID
and purchase token with that user's JWT to the private verifier. The mobile
client must finish a transaction only after this endpoint returns
`verified: true`. The current verifier is the Supabase `verify-purchase` Edge
Function, so production also requires `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and
the four matching subscription products in Google Play Console. No service
account credential is stored in the Dart public API or mobile application.

Mọi endpoint tạo account, category, budget và transaction yêu cầu header
`Idempotency-Key` (8–128 ký tự transport-safe). Retry cùng user, operation và
key trả lại resource đã tạo thay vì chèn bản ghi trùng, nên Expo có thể lưu
request vào SQLite khi mất mạng hoặc mất response.

## Production container và HTTPS

API có Dockerfile multi-stage tại thư mục này. Builder pin Dart `3.12.0` và
Dart Frog CLI `1.2.14`; runtime là image `scratch` chỉ chứa AOT executable và
public assets, chạy bằng user không đặc quyền `65532:65532`.

Tạo file `.env.production` từ `.env.production.example` và điền giá trị thật.
File thật bị gitignore. Public API chỉ nhận Supabase publishable/anon key; không
đưa `sb_secret_*` hoặc service-role JWT vào container này. OCR worker phải deploy
riêng vì worker mới cần server secret.

```powershell
cd apps/api
docker build -t picket-api:local .
docker run --rm --env-file .env.production -p 8080:8080 picket-api:local
```

Nền tảng container cần:

- public HTTPS endpoint và managed TLS;
- chuyển traffic vào biến `PORT` (mặc định `8080`);
- health check HTTP `GET /health`;
- bốn biến bắt buộc `APP_ENV=production`, `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY`, `ALLOWED_ORIGINS`;
- `ALLOWED_ORIGINS` chỉ chứa origin HTTPS của Next.js, phân cách bằng dấu phẩy,
  không có path và không dùng `*`.

Production fail-fast trước khi mở cổng nếu Supabase URL/key hoặc CORS không an
toàn. `/health` là liveness endpoint; endpoint nghiệp vụ vẫn xác minh Supabase
access token và giữ RLS. Sau khi deploy, đặt URL HTTPS nhận được vào
`NEXT_PUBLIC_API_URL` và `EXPO_PUBLIC_API_URL`, chạy mobile
`npm run release:preflight`, rồi mới build APK phát hành.

## OCR fallback worker

The OCR worker is a separate Dart process. It must not share its environment
with the public API because it uses a Supabase server secret. Copy the variable
names from `.env.worker.example`, deploy a private PP-OCR endpoint, then run one
iteration for a smoke test:

```powershell
dart run bin/ocr_worker.dart --once
```

Run without `--once` for continuous polling. The worker claims jobs with a
five-minute lease, retries transient failures at most three times, posts receipt
images to `OCR_PROVIDER_URL` as multipart field `file`, and expects JSON fields
`rawText`, `merchant`, `amount`, `date`, `confidence`, and optional `lines`.
Expired job results are cleared and their private Storage objects are deleted
with an acknowledgement so a failed cleanup can safely retry.

For current `sb_secret_...` keys the worker sends the credential only in the
`apikey` header. Legacy service-role JWTs additionally use `Authorization`.
Never pass an `sb_secret_...` key as a bearer token.
