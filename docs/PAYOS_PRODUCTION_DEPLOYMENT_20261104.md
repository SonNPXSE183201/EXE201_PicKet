# PayOS, PIN và phân quyền — production 04/11/2026

Đã triển khai API, web và worker lên VPS; áp migration `20261103173421_payos_auth_permissions.sql`. Sau [nghiệm thu RBAC/MFA và sửa lỗi revision](RBAC_PRODUCTION_ACCEPTANCE_20261104.md), production hiện có **53 migration**. **PayOS, PIN web và Google Play Billing đều đang bật.** Chủ dự án đã tự thanh toán thật đơn #1000000001, 19.000đ; provider/webhook/receipt/grant/doanh thu đã đối chiếu thành công theo [báo cáo nghiệm thu](PAYOS_LIVE_PAYMENT_ACCEPTANCE_20261104.md). Chưa gửi SMS/OTP hoặc build/upload APK/AAB mới.

## Release đang chạy

- Web: `picket-web:rbac-mfa-20261103t204838z` — https://app.picketfinance.com; cập nhật sau nghiệm thu MFA của user được ủy quyền.
- API: `picket-api:payos-20261103t194746z` — https://api.picketfinance.com.
- Worker: `picket-admin-worker:payos-20261103t194746z`; chạy đối soát qua mạng Docker nội bộ.
- Webhook: `https://api.picketfinance.com/v1/billing/payos/webhook`; PayOS `/confirm-webhook` trả HTTP 200, code `00`, đúng tài khoản nhận đã cấu hình.
- `PAYOS_ENABLED=true`, `QUICK_LOGIN_ENABLED=true`, `GOOGLE_PLAY_BILLING_ENABLED=true` trên VPS. File local `deploy/.env.production` cũng đã đồng bộ ba cờ này và ba image tag. File dev `apps/api/.env` không bị bật theo.

Key chỉ được chuyển qua SSH và lưu trong file env riêng; không đưa vào Git, image web hoặc báo cáo. Đã thêm `PICKET_ADMIN_WORKER_IMAGE` vào Compose để ghim image worker. OCR worker/provider và Caddy giữ nguyên image và thời điểm khởi động; không thay cấu hình OAuth hoặc các track Google Play.

## Nghiệm thu đã chạy

| Phần | Kết quả trên production |
|---|---|
| Đăng nhập mật khẩu | Tạo tài khoản QA tạm, đăng nhập bằng email/mật khẩu qua Supabase thật; profile API trả 200 |
| Web thật | Playwright đăng nhập qua form, nhận cookie Auth, vào `/billing`, thấy giá Plus/Pro và đơn đã hủy; nút Google vẫn có |
| Giá PayOS | Plus tháng 19.000đ, Plus năm 199.000đ, Pro tháng 39.000đ, Pro năm 499.000đ |
| Tắt mua mới | Trước khi bật, API tạo checkout trả 503, danh mục mua được ẩn |
| Checkout thật, không chuyển tiền | Tạo link Plus tháng 19.000đ bằng API production; retry cùng khóa giữ một đơn; refresh xác minh trạng thái; hủy trên PayOS và DB trả `cancelled` |
| Webhook | Chữ ký sai trả 400; chữ ký đúng cho mã đơn không tồn tại trả 200, không tạo receipt hoặc entitlement; PayOS xác nhận webhook thành công |
| Quyền quản trị | User thường gọi doanh thu và log thanh toán đều trả 403; gọi không có token trả 401 |
| PIN web thật | Bật PIN, khóa phiên, thử sai, mở đúng, khóa lại bằng binding đã lưu, mở lần hai rồi đăng xuất đều qua |
| Cookie PIN | Cookie thiết bị `HttpOnly`, `Secure`, `SameSite=Strict`; khóa xóa cookie Auth, mở khôi phục cookie phiên, logout xóa cookie Auth và thiết bị |
| Worker | Gọi hàm đối soát trong container worker qua `http://api:8080`: 0 đơn cần xử lý, 0 lỗi; secret worker/API khớp |
| Google Play | Cờ backend vẫn true; `/v1/billing/availability` với phiên QA vẫn báo `newPurchasesEnabled=true` |
| Smoke | Web/API health, Auth 401, CORS và TLS security headers qua `deploy/smoke.ps1` |

Lần chạy PIN đầu tiên gặp redirect onboarding của tài khoản QA mới; đã hoàn tất onboarding riêng cho QA, rồi nghiệm thu toàn bộ chu kỳ PIN thành công. Không sửa hoặc bỏ kiểm tra onboarding trong ứng dụng. Một lần gọi `/confirm-webhook` bằng Python từ VPS trả 403; gọi từ local xác nhận thành công. Probe từ VPS với User-Agent Dart được PayOS trả JSON hợp lệ; tạo/refresh/hủy checkout thực tế từ Dart API cũng thành công.

Tài khoản QA, ví onboarding và phiên Auth đã được xóa. Đơn QA chỉ được dọn sau khi xác nhận đã hủy, đúng UUID/user/idempotency key, không có receipt hay entitlement. SQL cleanup có chốt kiểm tra trước khi xóa event và đơn. Không xóa bản ghi tiền thật. Cuối nghiệm thu: **13 user, 0 đơn PayOS, 0 receipt, 0 grant PayOS, 0 PIN binding và 0 user QA còn lại**. Những con số này là thời điểm kiểm tra, không phải giới hạn vận hành.

## Backup và bằng chứng

Release VPS: `/opt/picket/deploy/releases/payos-20261103T194746Z/`.

- `database-before.dump`: backup ngay trước migration, **1.168.588 byte**, `pg_restore --list` qua, đã tải về local và so SHA-256.
- SHA-256: `4d61aea0334181c700b45027a64ac26d4f617773ed58d054ddbce597b374477d`.
- `env.before`, `compose.before.yml`: cấu hình trước rollout; các file chứa dữ liệu riêng có quyền `0600`, thư mục release `0700`.
- Image cũ có tag giữ lại `before-payos-20261103t194746z` cho API/web/worker.
- Giữ `migration.applied.sql`, `compose.deployed.yml`, log build và metadata release trên VPS. Tên timestamp theo UTC ngày 03/11; báo cáo dùng ngày Việt Nam 04/11.
- Bằng chứng local: `.artifacts/payos-production-rollout-20261104/`, gồm manifest backup, kết quả CLI/advisors, `browser-result.json`, `browser-pin-result.json`, `qa-checkout-result.json`, `final-database.json`, `final-audit.json`.

Browser QA đã đóng; file mật khẩu/PIN tạm và snapshot/log UI đã dọn. Không tạo ảnh test mới. Backup logic không chứa nội dung file/ảnh Storage; xem [báo cáo diễn tập khôi phục](PAYOS_PRODUCTION_PREFLIGHT_20261104.md).

## Advisors và phần còn cần nghiệm thu

Security advisors trước migration: 22 WARN; sau migration: 29 WARN, **không có ERROR**. Bảy cảnh báo mới là RPC `SECURITY DEFINER` được cấp execute cho `authenticated`: `payment_customer`, `payment_dashboard`, `payment_orders`, `payment_reserve`, `permission_group_update`, `permission_list`, `permission_update`. Đã đối chiếu: customer/reserve yêu cầu account active và phạm vi owner; dashboard/orders yêu cầu quyền riêng; quản lý quyền yêu cầu `permissions.manage`, mutation cần MFA/lý do. Chốt deny/self-escalation/revision/tenant được kiểm trên bản sao production. `anon` không execute RPC mới; client không đọc được PIN vault hoặc gọi RPC ghi nhận tiền dành cho server. **Không coi advisors đã sạch cảnh báo.** Cảnh báo có sẵn về bảo vệ mật khẩu rò rỉ không được tự đổi cấu hình trong lượt này.

Các giới hạn còn lại:

- Đã nghiệm thu giao dịch thật #1000000001: webhook HTTP 200, receipt 19.000đ, một grant Plus và doanh thu được ghi nhận. Chưa phát lại webhook thật; chống trùng đã kiểm trên bản sao SQL. Xem [bằng chứng tiền thật](PAYOS_LIVE_PAYMENT_ACCEPTANCE_20261104.md).
- Đã nghiệm thu cấp quyền tạm từ owner/MFA, quản lý nhóm/quyền qua QA operator có MFA thật và luồng thu hồi quyền bằng API/web production; các tài khoản QA đã dọn. Xem [báo cáo RBAC/MFA](RBAC_PRODUCTION_ACCEPTANCE_20261104.md).
- Nút Google và cấu hình OAuth được giữ; không đăng nhập thay chủ tài khoản Google để nghiệm thu OAuth tương tác trong lượt này.
- SMS/Zalo OTP, đăng ký/khôi phục/đổi SĐT có OTP tiếp tục hoãn. Email/mật khẩu cũ vẫn dùng; không auto-confirm SĐT người dùng thật.
- Mobile mới ở mức source/export kiểm kênh thanh toán; chưa cài APK QA mới hoặc upload Play. Google Play tiếp tục dùng Billing; PayOS dành cho web và APK trực tiếp khi phát hành đúng kênh.

## Dừng hoặc rollback

Tắt `PAYOS_ENABLED` để dừng tạo checkout; giữ key và handler webhook/đối soát cho đơn đã mở. Tắt PIN chỉ ngăn thao tác PIN mới; **không tự mở các session đang khóa**, nên cần xử lý session/binding trước khi hạ API/web cũ. Không copy đè `env.before` để rollback sau khi đã bán gói hoặc có người dùng PIN. Ưu tiên sửa tiến, giữ schema/grant và phiên được bảo vệ. Không restore đè backup DB lên dữ liệu production mới.
