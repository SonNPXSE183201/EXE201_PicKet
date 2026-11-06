# Web + landing production — 22/10/2026 (Asia/Saigon)

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Theo phê duyệt rõ ràng của chủ sở hữu, đã push nhánh `feat/picket-platform-ocr` lên GitHub và triển khai Next.js web cloud/admin cùng landing có nút **Đăng nhập**. Runtime source: `699356093b79bd0e032bee99d195ea569b6e6e1f`.

- Landing: https://picket.51-79-207-154.sslip.io/
- Login: https://picket.51-79-207-154.sslip.io/login
- Admin: https://picket.51-79-207-154.sslip.io/admin
- Image: `picket-web:web-20261022-6993560`, manifest list `sha256:626c33eaa06dcc47629e7b31639270bf3d0caba49e8c379caa4ceb02419e36ef`.
- Source/rollback: `/opt/picket/releases/web-20261022-6993560`.

Chỉ recreate `picket-web-1`. Landing thay atomically đúng index.html và style.css; không thay APK, manifest, Caddyfile, API, OCR, schema hoặc mobile. ID/thời điểm khởi động/restart count của API/OCR/Caddy trước/sau giống nhau. Web mới chạy, restart count 0 tại kiểm tra chốt. Compose production trỏ riêng web tới image immutable và source release tương ứng.

## Bằng chứng

| Gate | Kết quả |
| --- | --- |
| Trước triển khai | Web lint/typecheck, 50/50 test; landing 10/10 test PASS |
| Docker public assets | Dockerfile cũ thiếu public; regression RED `c887d84`, sửa một dòng COPY và GREEN `6993560`. Mỗi commit một file |
| Build Linux | Docker build trên VPS thành công; Next 16.4.0 compile/typecheck/prerender đạt |
| Dependency | Audit omit-dev: 0 vulnerabilities. Audit toàn bộ: 5 high trong chuỗi ESLint/dev; không audit fix force. eslint-config-next và braces không có tại đường dẫn node_modules của runtime được kiểm tra |
| Candidate và production | Cùng preflight đạt: login/PNG 200, 12 static asset 200, dashboard chuyển login, export anonymous 401; logo HTTPS khớp bytes source |
| Landing HTTPS | 3 link Đăng nhập; 320/390/768/1440px không tràn; click header mở login HTTPS thật |
| User QA HTTPS | Login vào dashboard; 4 trang dashboard/transactions/notifications/data × 320/390/1440 = 12/12 không tràn/error boundary; export 200/đúng 3 giao dịch; user mở admin bị trả dashboard |
| Admin QA HTTPS | Login vào admin; admin/users/settings × 320/390/1440 = 9/9 không tràn/error boundary; cả 6 URL user về admin; export 403 |
| API/APK | API health 200; APK 1.0.4/code 5 không đổi, SHA-256 ee02a07682fbcb8abfadf9605ae663c45a15398ce7d82e9412508ac740f18fc7; HTTPS range 206/1024 byte |
| Dọn QA | 4 tài khoản ngẫu nhiên của 2 helper trong lượt này đã xóa, kiểm kê Auth độc lập còn 0. Không đổi owner admin, không tạo ảnh QA. Candidate container đã xóa |

Ảnh local đã xem: output/playwright/production-landing-390.png và production-admin-390.png; giữ thêm production-user-1440.png. Không commit ảnh/credential/token. Smoke production không thay thế toàn bộ 152 ca viewport local, nghiệm thu điện thoại thật hoặc mọi mutation. Không đổi bảo trì/khóa/cấp gói người dùng thật.

Lượt helper đầu trả 404 không được tính login PASS; đã tạo helper khác và kiểm tra browser HTTPS thật. Cleanup helper mới đóng kết nối trước phản hồi, nhưng kiểm kê Auth độc lập xác nhận không còn tài khoản QA. SELECT profiles bằng service role bị từ chối; không cấp thêm quyền bảng. Cleanup cặp cũ chỉ dùng đúng email QA ngẫu nhiên và hai timestamp Auth đã ghi nhận, không xóa theo pattern rộng.

## Rollback

Image cũ giữ tag picket-web:rollback-web-20261022-6993560. Nếu chủ sở hữu duyệt rollback:

```bash
cd /opt/picket
cp -p releases/web-20261022-6993560/compose.before.yml compose.production.yml
docker compose -p picket --env-file deploy/.env.production \
  -f compose.production.yml \
  -f releases/web-20261022-6993560/web-6993560.rollback.yml \
  up -d --no-deps --no-build web
tar -xf releases/web-20261022-6993560/landing.before.tar -C apps/landing/dist
```

Không rollback database: đợt này không đổi schema. Không xóa APK hay image cũ. Source archive SHA-256 a0a11d650784b0a28fdddb012d422f173aef7bcc99fc8bf9432a0e8d5d6d9804; landing archive b24d8e6745dbc0729cc09c23e6d6324715e782be470774eeacd14bb4fddbd990, đã so hash trên VPS trước giải nén.

Các file còn thay đổi được commit riêng từng file và push; commit cũ giữ nguyên, không force-push. Guest/offline web ngoài phạm vi đã duyệt. Play Billing, điện thoại thật, OCR provider web E2E và global settings staging vẫn chưa nghiệm thu; deployment không biến các gate đó thành PASS.
