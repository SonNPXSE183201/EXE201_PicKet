# Kiểm tra PayOS/Auth/RBAC — 04/11/2026

Cập nhật production: đã deploy API/web/worker, áp migration, xác nhận webhook PayOS, kiểm checkout và toàn bộ chu kỳ PIN trên web thật. Đã nghiệm thu [tiền thật và cấp Plus cho đơn #1000000001](PAYOS_LIVE_PAYMENT_ACCEPTANCE_20261104.md). PayOS/PIN/Play Billing đang bật. Xem [báo cáo nghiệm thu production](PAYOS_PRODUCTION_DEPLOYMENT_20261104.md); các bảng bên dưới giữ kết quả kiểm thử source và mốc preflight trước đó.

Phạm vi theo [báo cáo triển khai](PAYOS_AUTH_RBAC_IMPLEMENTATION_20261104.md). Các thay đổi có trong working tree; không commit/push/deploy hoặc áp SQL production trong lượt này.

## Kết quả

| Kiểm tra | Kết quả | Lệnh/bằng chứng |
|---|---|---|
| Web production | PASS | `npm run build --prefix web`; Next compile và generate 47 pages thành công |
| API production | PASS | `dart pub global run dart_frog_cli:dart_frog build`, sau đó `dart compile exe build/bin/server.dart -o build/picket-api-qa.exe` trong `apps/api` |
| Types | PASS | `npm run typecheck --prefix apps/mobile`; Next build/typecheck cho web |
| Lint/analyze | PASS | Mobile Expo ESLint, web ESLint, `dart analyze` không có lỗi/cảnh báo ở lần kiểm tra cuối |
| Mobile hồi quy | PASS | `npm run test:mobile`: **1.044/1.044**; bổ sung chạy lại auth locale và billing channel sau khi thêm bản dịch PayOS |
| Web unit | PASS | `npm run test:auth --prefix web`: **59/59** |
| Dart API | PASS | `dart test --coverage=coverage`: **167/167**; bộ PayOS/PIN focused **18/18** |
| DB | PASS | `npm run test:db`: các test hiện có và **15 suite SQL** qua PGlite; gồm suite PayOS/Auth/RBAC mới |
| Worker | PASS | `python -m unittest discover -s deploy/admin-worker -p 'test_*.py'`: **12/12** |
| Compose | PASS | `docker compose -f compose.production.yml config --no-interpolate --quiet`; không in secret hoặc khởi động service |
| Play bundle | PASS | Expo Android export + source map: có `play-billing-screen.tsx`, không có `payos-billing-screen.tsx` |
| APK trực tiếp bundle | PASS | Expo Android export + source map: có `payos-billing-screen.tsx`, không có `play-billing-screen.tsx` |
| UI | PASS trong dev mock | Playwright 390×844 và desktop: billing, doanh thu, phân quyền, PIN; sửa tràn ô lọc và tách nút/gói thanh toán trên mobile |
| Diff | PASS | `git diff --check`; giữ nguyên thay đổi không liên quan có sẵn trong workspace |

Export JavaScript không phải build hoặc nghiệm thu APK native. Không cài lên thiết bị/emulator; không đụng production package. Ảnh chụp và source-map/build tạm được dọn sau kiểm tra, không đưa vào asset ứng dụng.

## TDD và những điều test chứng minh

RED ban đầu đã được chạy: thiếu PayOS client/golden signature API; thiếu crypto cho PIN; SQL thiếu payment/permission functions; policy cũ từ chối user có quyền quản trị dùng mobile/web cá nhân. Sau triển khai các test tương ứng GREEN. Các kiểm thử hồi quy cũ được cập nhật theo yêu cầu mới; test khôi phục/mua Play chuyển sang đường dẫn feature mới, không bị bỏ.

| Bảo đảm | Test |
|---|---|
| Chữ ký trùng official vectors, phản hồi giả không được tin | `apps/api/test/payos_client_test.dart` |
| Request dùng giá server, retry giữ orderCode, receipt còn nhận khi tắt checkout mới | `apps/api/test/payos_service_test.dart` |
| Token mã hóa không dùng được với browser/key khác | `apps/api/test/quick_login_crypto_test.dart` |
| Enrollment gần đây, xoay refresh đúng user/session, PIN sai không gọi refresh, limiter/revoke | `apps/api/test/quick_login_service_test.dart` và suite SQL |
| Giá được duyệt, quyền user/group, deny, revision, ownership, receipt/grant idempotency, PIN lock/relock/revoke | `supabase/tests/payos-auth-permissions.sql` |
| Play resolver chọn adapter riêng | `apps/mobile/src/features/billing/billing-channel.test.ts` và hai Android exports |
| User có quyền portal giữ app cá nhân | `phone-login.test.ts`, `phone-and-permissions.test.mjs`, `workspace-policy.test.mjs` và suite SQL |

Coverage dòng đo từ Dart VM JSON, chỉ cho các module mới được liệt kê, không phải tỷ lệ toàn repository:

| Module | Coverage |
|---|---:|
| payos_client.dart | 91,1% |
| payos_service.dart | 96,1% |
| quick_login_crypto.dart | 100% |
| quick_login_service.dart | 98,1% |

## Giới hạn nghiệm thu

Cập nhật preflight: đã backup và khôi phục bản sao production vào Supabase PostgreSQL 17.11 cô lập, chạy migration cùng SQL test thành công, đối chiếu nội dung 86 bảng cũ không đổi. Container thử nghiệm đã xóa. Đã bổ sung test RED/GREEN chặn tạo checkout từ đơn reserve khi cờ PayOS tắt; tổng API hiện **168/168**, PayOS/PIN **19/19**, `dart analyze` qua. Xem [backup và runbook rollout](PAYOS_PRODUCTION_PREFLIGHT_20261104.md). Production chưa nhận migration hoặc image mới.

Cập nhật tương thích đăng nhập cùng ngày: form web/mobile đã nhận email hoặc SĐT, giữ Google. RED đã chạy khi helper credentials chưa tồn tại; GREEN qua 64 test Auth mobile và 60 test web, typecheck/lint cả hai ứng dụng. Test integration chạy `AuthProvider.signIn()` thật với transport mock: email/phone gửi đúng một identifier, không signup, mật khẩu không bị trim, lỗi provider được giữ. Playwright trên form web thật ở desktop/390×844 đã chặn toàn bộ password request bằng mock, xác nhận email payload, phone payload, invalid identifier không gọi Auth và nút Google vẫn có. Không thử password trên tài khoản production. Helper coverage dòng 94,29%, nhánh 90% bằng Node test coverage; đây không phải coverage toàn repo.

- Lượt production sau đó đã dùng credentials thật để xác nhận webhook và tạo/refresh/hủy checkout; chưa chuyển tiền. Provider/Auth transport unit test vẫn dùng mock và không thay cho nghiệm thu receipt/cấp gói bằng tiền thật.
- Đã chạy migration/advisors production và kiểm cookie/refresh PIN qua trình duyệt thật, xem báo cáo deploy. Advisors còn 29 WARN, không có ERROR. PGlite không có `pg_cron`; migration cron cũ vẫn được báo SKIP, không coi là đã kiểm lịch production.
- Chưa tích hợp SMS/OTP, chưa xác minh/gắn SĐT hàng loạt cho user email-only. Form hiện đã giữ email tương thích; chỉ bỏ email sau khi có quy trình chuyển tài khoản được kiểm chứng.
- PIN đã bật sau nghiệm thu khóa, sai/đúng, refresh, khóa lại và logout bằng tài khoản QA trên production; không mở hoặc đổi phiên của người dùng thật để thử.
- Không có auto-refund, prorating hoặc auto-renew PayOS. Doanh thu hiện là tiền thực nhận PayOS, không phải lợi nhuận/net sau hoàn tiền hoặc tổng earnings Play.

API/web/worker đã chạy production, một khoản tiền thật và [phân quyền/MFA trên portal](RBAC_PRODUCTION_ACCEPTANCE_20261104.md) đã được xác minh. Cập nhật RBAC có 16 suite SQL và 61 test web qua; còn APK native mới.
