# Admin platform và xác thực web — báo cáo 28/10/2026

## Trạng thái

Admin web, ba trang xác thực, API, worker và 51 migration đã triển khai production. Bố cục admin đã sửa theo góp ý mới nhất về sidebar, thẻ, dropdown và bộ lọc. **Chưa đóng toàn bộ nghiệm thu**: APKPure đang khóa gửi phiên bản mới do bản 1.0.6 chờ duyệt; kiểm thử đăng nhập staff/user online trên native và thiết lập MFA bằng tài khoản owner thật chưa được xác nhận. Không coi fixture là bằng chứng cho các bước này.

## Phần đã triển khai

| Khu vực | Kết quả |
| --- | --- |
| Admin web | 18 khu vực: tổng quan, người dùng, acquisition, engagement, billing, OCR, sức khỏe, sự cố, phiên bản, nội dung, hỗ trợ, đối tác, nguồn dữ liệu, audit, nhân sự/quyền, cấu hình, MFA và export |
| Người dùng | Tìm/lọc/sắp xếp/phân trang, metadata và timeline; khóa/mở, thu hồi phiên, hỗ trợ reset; không mở nội dung giao dịch tài chính riêng tư |
| Phân quyền | Owner/operations/support/analyst/content; kiểm quyền mới phía SQL/API; mutation cần MFA aal2, lý do, idempotency và kiểm phiên bản; bảo vệ owner cuối |
| Audit | Trước/sau đã redaction; đọc danh sách/chi tiết user và staff cũng ghi audit, không lưu email hoặc chuỗi tìm kiếm |
| Vận hành | Ticket, incident, release, nội dung draft/review độc lập/publish; job xuất CSV có thời hạn và chống công thức CSV; cấu hình có kiểm quyền |
| Số liệu | Phân biệt click tải, HTTP phục vụ APK, hoạt động có đồng ý và dữ liệu Play; thiếu nguồn hiển thị N/A; tách test purchase và purchase chưa xác định |
| Web Auth | Login/register/forgot-password đồng bộ Paper, liên kết về landing, password visibility, trạng thái chờ/lỗi, cooldown; recovery fragment được xóa khỏi URL và reset xong đăng xuất phiên |
| Email | Không trả lời công khai email nào đã có tài khoản; đăng ký trùng và quên mật khẩu dùng thông báo trung tính để tránh dò tài khoản. Xác minh quyền sở hữu email vẫn bắt buộc |
| Mobile | Chặn staff trước khi mở provider dữ liệu; kiểm lại khi foreground/token đổi; route admin cũ bị gỡ. Allowance offline chỉ cho user thường đã xác minh, tối đa 24 giờ |
| Privacy | Telemetry mobile mặc định tắt; landing chỉ gửi khi đồng ý; log bỏ IP/query/header; raw tối đa 90 ngày, aggregate tối đa 13 tháng, export 1 giờ |

Nội dung bài học offline vẫn nằm trong bundle mobile; CMS hiện quản lý quy trình và liên kết phiên bản đáp án cloud, không tự thay toàn bộ giáo trình trên thiết bị.

## UI/UX theo PICKET-DESIGN

- Giữ nền cream, chữ ink và plum của landing, font Nunito; card dùng lilac/peach/mint dịu, panel và filter nền ấm.
- Sidebar desktop 272 px, nhãn một dòng, nhóm điều hướng thu gọn; scrollbar được ẩn nhưng vẫn cuộn bằng wheel/keyboard. Mobile có menu điều hướng riêng.
- Menu tài khoản chỉ còn bảo mật/MFA và đăng xuất, rộng 238 px; bỏ menu lớn chứa lại toàn bộ module.
- Input/select/button đồng bộ chiều cao 42 px, focus rõ; KPI gọn, grid đổi theo viewport, filter không liên quan được ẩn.
- Đã kiểm 18 khu vực ở 1440/768/390/360 px: **72 lượt đạt**, không tràn ngang hoặc page error. Có 36 ảnh desktop/mobile của layout cuối.

Ảnh và kết quả nằm tại `.artifacts/admin-auth-20261028/index.html`, `admin-ui-final-results.json`, `admin-*-1440.png` và `admin-*-390.png`. Artifact không đưa vào Git.

## Kiểm thử

| Kiểm tra | Kết quả và phạm vi |
| --- | --- |
| Mobile | 925 tests đạt; lint/typecheck và Hermes export đạt |
| Web | 57 tests đạt; lint/typecheck và production build đạt |
| API | 149 tests đạt; Dart analyzer sạch |
| Landing | 13 tests và build kiểm checksum đạt |
| Edge | 12 billing tests và 2 shared-auth tests đạt |
| SQL | 14 suites, thêm audit lookup, quota Free/Plus/Pro và legacy checks đạt; kiểm trên PGlite và PostgreSQL 17 cô lập |
| Worker | 10 tests đạt trong Linux container read-only, 192 MiB/0,25 CPU |
| Auth/admin E2E | Fixture Auth + Dart/SQL thực: role/MFA, lifecycle session, export queue/download, recovery tốt/xấu và global logout đạt; không thay nghiệm thu Google/email/TOTP thật |
| Responsive Auth | 12 lượt trên production image đạt; 6 ảnh được lưu |
| Telemetry | Không đồng ý không gửi, đồng ý gửi, rút đồng ý dừng; production test event dedup đúng và đã dọn; origin sai 403, payload email 400 |
| Backup | Đã sao lưu trước migration; diễn tập restore dữ liệu tổng hợp trên PostgreSQL cô lập đạt. Chưa tuyên bố đã restore toàn bộ backup production |

Scale SQL trên PostgreSQL 17 giới hạn 1 CPU/512 MiB, 100.001 user tổng hợp và 1 triệu event hỗn hợp: p95 của 5 lần gọi mỗi mục là overview 69,509 ms, users 288,215 ms, engagement 451,599 ms, acquisition 218,267 ms. Đây là đo SQL tuần tự, **không phải load test HTTP đồng thời**. Bằng chứng: `postgres17-scale-results.json`.

## Production và bản phát hành

- Source release: `/opt/picket/releases/admin-20261028`; image API/web `admin-20261028`; worker admin đang chạy. Cấu hình và image trước rollout được giữ để rollback.
- Migration `20261027182538_admin_platform.sql` và `20261028060909_admin_lookup_audit.sql` đã apply bằng Supabase CLI và ghi migration history.
- Đã triển khai Edge `admin-user-action` trả 410 và cập nhật `verify-purchase`, `play-notifications`, `delete-account` cùng shared Auth policy.
- HTTPS landing/privacy/login/register/forgot trả 200; API health 200, account-access chưa đăng nhập 401, endpoint admin cũ 410.
- Probe API/web/landing/OCR/database/storage/disk/memory đạt tại lần kiểm. SMTP probe chưa bật; backup probe chỉ kiểm metadata file, không chứng minh khả năng restore.
- Landing đang cung cấp **1.0.10/code 23 ARM64**, 82.825.436 byte; SHA-256 `391619ad9514de11a7f02f6761972101c2c671f11653065c3393b01545bec7ec`. Đã kiểm tải đầy đủ và HTTP range 206; chứng thư ký khớp code 22. Giữ URL APK cũ.
- Play Internal vẫn **1.0.9/code 22**. Không có AAB/code 23 được đưa lên Play trong đợt này. Cần rà khai báo telemetry trước phát hành Play bản có tính năng này.
- Đã dọn 31 thư mục generated khoảng 8,29 GiB sau khi sao lưu APK/AAB. Không xóa backup release, dữ liệu người dùng hoặc thay đổi tài khoản Google thật. Source được chia commit theo phạm vi backend, web, mobile và vận hành/tài liệu; trạng thái push được xác nhận riêng bằng Git remote.

## Các bước chưa thể chốt

1. **APKPure:** đã chuẩn bị icon 512, feature graphic 1024×500, bảy ảnh 1080×1920 sáng/tối và nội dung VI đầy đủ liên hệ/chính sách. Form đã chọn APK code 23 và nạp ảnh mới, nhưng trạng thái Publishing/Pending Approval của 1.0.6 khóa nút lưu/gửi. Chưa lưu listing mới và chưa gửi APK mới thành công. Không reload tab đang giữ bản nháp; sau khi nền tảng mở lại phải kiểm form, gửi và xác minh phiên bản phía cửa hàng. Bằng chứng `apkpure/apk23-pending-review.png`, `apkpure/pending-review-block.png`.
2. **Native online:** QA app riêng đã khởi động, mở login và vào dashboard guest; đã gỡ QA app, giữ nguyên bản Play và dữ liệu cũ. Chưa xác nhận E2E staff/user online trên máy ảo. Lệnh thiết lập ADB reverse cổng mới 8089/55430 bị automatic approval review từ chối với lý do duy nhất “blocked by policy”; không thực hiện lại hoặc vượt chặn. Cổng Metro có sẵn chỉ được dùng để kiểm startup/guest.
3. **Owner thật:** cần owner tự thiết lập TOTP và kiểm phiên aal2 thật; không coi MFA fixture là đã cấu hình tài khoản production.
4. **Nguồn Google:** installs/vitals/financial chưa cấu hình nguồn/quyền báo cáo thực, dashboard hiển thị chưa cấu hình; không thay bằng số click hoặc số phục vụ APK. Cần cấp bucket/reporting API phù hợp rồi kiểm reconciliation.
5. **Nghiệm thu tải đồng thời:** chưa có load test HTTP nhiều người dùng; kết quả SQL ở trên chỉ chứng minh phạm vi đã đo.

Hướng dẫn cấu hình, cập nhật production và rollback: [ADMIN_PLATFORM_RUNBOOK.md](../ADMIN_PLATFORM_RUNBOOK.md). Yêu cầu gốc: [ADMIN_PLATFORM_PLAN_20261028.md](../ADMIN_PLATFORM_PLAN_20261028.md).
