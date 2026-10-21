# Triển khai Picket trên một VPS

Phát hành/nghiệm thu hiện hành: [PROJECT_STATUS.md](../docs/PROJECT_STATUS.md). Landing static đang phục vụ Android **1.0.4/code 5**; [triển khai/checksum/rollback](../docs/migration/ANDROID_RELEASE_1_0_4_20261022.md). Đợt này chỉ đổi landing/download/manifest, không recreate container API/web/OCR. Các số audit và phiên bản ghi theo ngày phía dưới là checkpoint lịch sử, không phải chứng nhận bảo mật hiện tại; cần audit lại theo lockfile trước một đợt triển khai mới.

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

> Security gate ngày 10/10/2026: web đang dùng Next.js 16.4.0 và audit dependency
> production bằng 0. Next.js đã thông báo sẽ có bản vá bảo mật ngoài lịch vào
> 14/10/2026, vì vậy phải nâng lên bản vá được công bố rồi chạy lại audit/build
> trước khi mở DNS production: <https://nextjs.org/blog>.

`npm audit` đầy đủ hiện vẫn báo advisory `braces` trong chuỗi ESLint chỉ dùng
lúc phát triển; advisory chưa có patched version và package này không nằm trong
standalone runtime. CI chặn theo `npm audit --omit=dev`; đồng thời vẫn phải theo
dõi và nâng `eslint-config-next` ngay khi upstream phát hành bản đã vá.

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

Điền giá trị thật vào `deploy/.env.production`. `SUPABASE_SECRET_KEY` chỉ được
Compose truyền vào `ocr-worker`; API, web và OCR provider không nhận secret này.
Không commit file `.env.production`.

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
