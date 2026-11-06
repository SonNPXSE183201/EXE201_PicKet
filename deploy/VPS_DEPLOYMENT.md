# Triển khai Picket trên một VPS

<!-- current-project-status -->
Trạng thái triển khai và nghiệm thu cập nhật 01/11/2026: [PROJECT_STATUS](../docs/PROJECT_STATUS.md) · [readback store](../docs/migration/STORE_RELEASE_READBACK_20261101.md) · [web production report](../.artifacts/picket-web-prod-20261101/DEPLOYMENT.md). Lần deploy web mới nhất chỉ thay web container; API, database và OCR không đổi.

**Checkpoint web ngày 22/10/2026 (lịch sử):** image `picket-web:web-20261022-6993560`, source/build context ở `/opt/picket/releases/web-20261022-6993560/source`. Đợt mới hơn 01/11 dùng `picket-web:web-20261101-responsive-839e5cb-01`; xem report hiện hành ở trên. Giữ báo cáo [web production 22/10](../docs/migration/WEB_PRODUCTION_20261022.md) làm bằng chứng của rollout cũ.

Phát hành/nghiệm thu hiện hành: [PROJECT_STATUS.md](../docs/PROJECT_STATUS.md). Landing static đang phục vụ Android **1.0.14/code 28**; manifest và URL APK đã được đọc lại 01/11 ([bằng chứng](../docs/migration/STORE_RELEASE_READBACK_20261101.md)). Phần hướng dẫn và các phiên bản bên dưới ghi theo ngày là checkpoint lịch sử, không phải trạng thái production mới nhất. Trước mỗi lần triển khai, kiểm lại source, lockfile và artifact hiện hành.

Increment API riêng ngày 21/10: migrations `202610210003`/`202610210004` và image `picket-api:transaction-attempt-20261021` đã triển khai theo phê duyệt. Source dùng để build giữ ở `/opt/picket/releases/transaction-attempt-20261021`, không ghi đè cây `/opt/picket/apps/api`; không rebuild cây cũ khi triển khai tiếp. Image rollback được giữ, nhưng không tháo SQL fence sau khi đã xác nhận bỏ yêu cầu. Xem [báo cáo rollout/rollback](../docs/migration/RECEIPT_ATTEMPT_RECOVERY_TDD_20261021.md).

Stack production gồm Caddy (HTTPS), Next.js, Dart Frog, OCR worker và
PP-OCRv5 mobile chạy CPU. Supabase/Postgres/Auth/Storage vẫn là managed service,
không chạy trên VPS này.

## Cấu hình tối thiểu

- Ubuntu 24.04 LTS, 4 vCPU, 8 GB RAM, 80 GB NVMe.
- Docker Engine cùng Docker Compose plugin.
- Hai DNS record trỏ về VPS: một cho web và một cho API.
- Mở inbound TCP `80`, TCP/UDP `443`; không mở `3000`, `8000`, `8080`.
- Swap 2-4 GB chỉ để chống OOM đột ngột, không coi là RAM cho OCR.

> Ghi chú bảo mật ngày 10/10/2026 đã lỗi thời: site đã mở production và Next.js/dependency đã được cập nhật sau checkpoint đó. Báo cáo deploy web 01/11 ghi build, test, lint và `npm audit --omit=dev` hiện hành. Trước một rollout tiếp theo, chạy lại các kiểm tra trên lockfile của chính source sắp phát hành; không dùng số phiên bản trong checkpoint cũ làm security gate.

Các ghi chú audit đầy đủ bên dưới là kết quả theo thời điểm. `npm audit --omit=dev` trong report web 01/11 không có vulnerability; điều này không thay cho lần audit mới trước một release khác.

Compose giới hạn PP-OCR ở 2.25 CPU, 4 GB RAM và một inference đồng thời. Web,
API và Caddy vẫn còn tài nguyên để phản hồi khi OCR đang chạy. Đây là cấu hình
MVP lưu lượng thấp; nếu hàng đợi OCR tăng liên tục thì tách riêng provider/worker
hoặc chuyển fallback sang serverless GPU.

## 1. Chuẩn bị Supabase và DNS

1. Giữ nguyên migrations production đã push.
2. Tạo `A` record cho `app.example.com` và `api.example.com` về IP VPS.
3. Trong Supabase Authentication > URL Configuration:
   - Site URL: `https://app.example.com`
   - Redirect URL: `https://app.example.com/auth/callback`
   - Giữ callback deep link mobile hiện có.
4. Google OAuth vẫn dùng callback của Supabase:
   `https://PROJECT_REF.supabase.co/auth/v1/callback`.
   Giá trị cần điền trong Google Console, Supabase Dashboard và cách kiểm thử
   web/Android nằm ở [GOOGLE_OAUTH_SETUP.md](../docs/migration/GOOGLE_OAUTH_SETUP.md).

## 2. Tạo cấu hình bí mật

Trên VPS, clone/copy source rồi chạy:

```bash
cd /opt/picket
cp deploy/.env.production.example deploy/.env.production
chmod 600 deploy/.env.production
openssl rand -hex 32
```

Điền giá trị thật vào `deploy/.env.production`. Compose truyền
`SUPABASE_SECRET_KEY` cho Dart API thực hiện PayOS/PIN/quản trị và các worker
backend cần quyền server. Web/Expo và OCR provider không nhận secret này.
Không commit file `.env.production`. Nếu VPS đã có file thật, giữ cấu hình đang
chạy và chỉ bổ sung các biến mới; không ghi đè bằng file local chưa điền đầy đủ.

Các giá trị `REPLACE_ME` trong file mẫu cố ý không hợp lệ. API/worker sẽ thoát
ngay nếu bạn quên thay key, thay vì khởi động với cấu hình production giả.

## 3. Kiểm tra và khởi động

```bash
docker compose --env-file deploy/.env.production \
  -f compose.production.yml config --quiet

docker compose --env-file deploy/.env.production \
  -f compose.production.yml build

docker compose --env-file deploy/.env.production \
  -f compose.production.yml up -d

docker compose --env-file deploy/.env.production \
  -f compose.production.yml ps
```

Build OCR lần đầu lâu vì tải PaddlePaddle và hai model mobile vào image. Theo
dõi trạng thái mà không in biến môi trường:

```bash
docker compose -f compose.production.yml logs -f --tail=100 \
  caddy web api ocr-provider ocr-worker
```

Khi chạy ổn, `docker compose ps` phải cho thấy `web`, `api`, `ocr-provider` và
`ocr-worker` ở trạng thái `Up`; provider chuyển sang `healthy` sau khi nạp hai
model. Nếu API restart, kiểm tra trước tiên `SUPABASE_PUBLISHABLE_KEY` và
`ALLOWED_ORIGINS`. Nếu worker restart, kiểm tra `SUPABASE_SECRET_KEY`, token OCR
và log lease job.

## 4. Smoke test

Từ máy Windows phát triển:

```powershell
.\deploy\smoke.ps1 `
  -WebUrl https://app.example.com `
  -ApiUrl https://api.example.com
```

Sau đó thực hiện E2E bằng tài khoản test: đăng nhập Google/email, tạo giao dịch,
chụp hóa đơn, buộc dùng cloud fallback, kiểm tra receipt rồi đăng xuất/đăng nhập
lại. Chỉ bật `EXPO_PUBLIC_OCR_FALLBACK_ENABLED=true` trong APK demo sau khi bước
này đạt.

## 5. Vận hành và rollback

```bash
docker compose --env-file deploy/.env.production \
  -f compose.production.yml pull
docker compose --env-file deploy/.env.production \
  -f compose.production.yml up -d --build --remove-orphans
docker compose -f compose.production.yml ps
docker stats --no-stream
```

Giữ image/tag ổn định trước mỗi lần nâng cấp để rollback. Dữ liệu người dùng ở
Supabase nên rollback container không rollback database migration; migration
production phải luôn backward-compatible trong cửa sổ rollback.

### Triển khai bằng image từ GHCR

Workflow `Publish production images` chạy thủ công hoặc khi push tag `v*` và
đẩy bốn image `picket-web`, `picket-api`, `picket-ocr-worker` và
`picket-ocr-provider` lên GitHub Container Registry. Trước lần chạy đầu, cấu
hình ba repository variables `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`
và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; đây đều là cấu hình public được đóng
vào bundle web, không dùng Supabase secret key.

Trên VPS, đặt bốn biến `PICKET_*_IMAGE` trong `deploy/.env.production` theo đúng
tag immutable, đăng nhập GHCR nếu package chưa public, rồi cập nhật mà không
build lại trên VPS:

```bash
docker compose --env-file deploy/.env.production -f compose.production.yml pull web api ocr-worker ocr-provider
docker compose --env-file deploy/.env.production -f compose.production.yml up -d --no-build web api ocr-provider ocr-worker
docker compose -f compose.production.yml ps
```

Không dùng tag `latest` cho production. Tag phiên bản giúp rollback bằng cách
đổi lại bốn biến image và chạy lại `pull`/`up -d --no-build`.

Worker profile `admin` có thể ghim riêng bằng `PICKET_ADMIN_WORKER_IMAGE`.
Lượt PayOS/PIN ngày 04/11 đã deploy API/web/worker theo tag riêng và giữ Play
Billing; xem [bằng chứng, backup và lưu ý rollback phiên PIN](../docs/PAYOS_PRODUCTION_DEPLOYMENT_20261104.md).
