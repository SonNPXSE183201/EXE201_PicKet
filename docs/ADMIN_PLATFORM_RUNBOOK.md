# Vận hành admin platform Picket

Ngày 28/10/2026. Source triển khai: Next.js admin/Auth → Dart Frog → Supabase. Migrations: `20261027182538_admin_platform.sql` và `20261028060909_admin_lookup_audit.sql`. Đây là hướng dẫn triển khai và phục hồi. Lần rollout production ngày 28/10 được xác nhận riêng trong báo cáo nghiệm thu.

## Cấu hình

- Web chỉ nhận URL API, URL Supabase và publishable key. Không đưa secret/service-role/Google credential vào `NEXT_PUBLIC_*` hoặc `EXPO_PUBLIC_*`.
- API và admin-worker cần `SUPABASE_SECRET_KEY` phía server. `ADMIN_TELEMETRY_ENABLED` mặc định false.
- Worker chạy profile `admin`, 192 MiB / 0,25 CPU, non-root, filesystem chỉ đọc; `/state` ghi checkpoint, `/logs` chỉ đọc log đã redaction, `/tmp` tmpfs 16 MiB.
- `PLAY_REPORTS_BUCKET`: private Google Play report bucket, chỉ điền URI bucket thực đã kiểm chứng. Chưa có monthly report thì để trống và dashboard hiển thị chưa cấu hình.
- `PLAY_VITALS_ENABLED=false`, `PLAY_FINANCIAL_ENABLED=false` cho đến khi API/quyền/báo cáo thực được xác minh. Vitals dùng Reporting API, installs/sales dùng private CSV; không thay thế nguồn cho nhau.
- Credential Google chỉ ở `deploy/secrets/play-reporting.json` trên server, mount read-only. Không commit thư mục này.
- `ADMIN_SMTP_PROBE` chỉ kiểm tra TLS transport, không xác nhận giao email tới inbox. Backup probe chỉ kiểm tra file mới nhất; không thay thử restore.

## Trình tự rollout

1. Chạy tests/lint/typecheck, build web/API/worker, kiểm migration trên PostgreSQL 17 cô lập. Lưu ảnh và kết quả trong một thư mục artifact.
2. Kiểm tra migration remote/local và chỉ có migration dự kiến đang chờ. Sao lưu schema/data bằng quy trình backup hiện hành, kiểm file và diễn tập restore trên môi trường cô lập. Không in credential vào log.
3. Build image có tag bất biến, chuẩn bị landing đã kiểm checksum APK. Giữ image/config cũ và tất cả URL APK cũ.
4. Triển khai bản Edge `admin-user-action` trả 410 trước hoặc cùng cutover để không còn đường thao tác cũ bỏ qua MFA. Triển khai `_shared/google_play.ts` cùng các Edge Functions dùng nó sau migration metadata mới. Không thay giá/gói hoặc hoàn tiền.
5. Apply migration bằng Supabase CLI chuẩn để có migration history. Migration thêm role mặc định owner cho staff hiện có; không tự thêm tài khoản hoặc gỡ MFA.
6. Cập nhật API và web gần nhau trong cửa sổ vận hành. Các RPC admin cũ bị thu hồi execute nên web cũ không được giữ lâu sau migration. Consumer client cũ vẫn được Auth/API kiểm tra tài khoản; admin phải dùng web.
7. Caddy `adapt --validate` trước reload. Collector `/events` cùng origin; CSP connect-src self; log chỉ lưu đường APK allowlist, loại query/header/IP. Không đọc log chưa được lọc để nhập analytics.
8. Bật profile admin-worker, xác minh probe/checkpoint/nguồn chưa cấu hình đúng trạng thái. Bật telemetry server sau khi privacy notice đã lên và lựa chọn opt-in có mặt trên client; mặc định mobile tắt. Native phải cập nhật khai báo cửa hàng trước phát hành bản có telemetry.
9. Kiểm HTTPS Auth/admin, role/MFA, endpoint cũ 410, health, worker freshness, log redaction, download toàn bộ APK và SHA. Không bật bảo trì, khóa user thật hay gửi mail hàng loạt để test.

## Kiểm thử và giới hạn nguồn

- SQL suite kiểm vai trò, MFA, owner cuối, idempotency, stale edit, audit trước/sau, independent review, thu hồi session ID, export và health failure/recovery.
- Web fixture dùng Auth giả lập cục bộ, database migration thực và Dart thực. Không chứng minh email thật, Google OAuth thật hoặc TOTP thật đã được nghiệm thu production.
- Stats phân biệt APK click / HTTP200,206 served requests / installs Google. HTTP range có thể tạo nhiều served requests; không tuyên bố số file hoàn tất hoặc số người cài.
- Người dùng hoạt động tính theo telemetry có đồng ý. Phiên bản chưa được quan sát hiển thị trống. Nguồn ngoài không có dữ liệu hiển thị N/A, không điền 0.
- Import tháng chạy lại atomically theo checksum; tháng hiện tại và tháng trước được kiểm lại. Lỗi parse/403 không ghi đè dữ liệu thành công cũ. Giữ timezone gốc.
- Doanh số sales là ước tính theo từng tiền tệ, không phải payout. Purchase cũ chưa có `is_test` giữ unknown đến khi verify lại; chỉ `false` được tính thuê bao thực.
- Nội dung: admin quản lý draft/review/publish và liên kết phiên bản đáp án cloud đã có. Nội dung giáo trình offline trong mobile vẫn cần build app khi sửa. Không tự tuyên bố review tài chính độc lập đã hoàn tất.

## Quyền và phục hồi

Mọi mutation cần lý do và aal2, kiểm role mới ở SQL. Không cho admin đọc/sửa nội dung tài chính riêng tư. Thay role có hiệu lực với request tiếp theo. Thu hồi phiên dùng denylist session ID; refresh cùng ID vẫn bị chặn, đăng nhập mới được tạo phiên mới nếu tài khoản không bị khóa.

Mobile kiểm policy trước khi mở các provider dữ liệu, kiểm lại khi foreground/token đổi. Khi offline, chỉ user thường đã xác minh có allowance theo owner tối đa 24 giờ; thay role lúc thiết bị hoàn toàn offline chỉ được nhận biết khi kết nối lại hoặc hết hạn allowance. API online luôn kiểm role hiện hành. Không xóa outbox chưa đồng bộ để thực thi policy; giữ dữ liệu cách ly theo owner tránh mất dữ liệu.

Nếu mất owner/MFA: quy trình khôi phục danh tính do chủ dự án quản lý qua Supabase, có ghi nhận vận hành; không có nút bypass công khai. Last-owner guard ngăn gỡ owner cuối qua UI.

## Rollback

- Dừng worker và tắt collector flag nếu phát hiện nhập dữ liệu không đúng. Giữ checkpoint/log bằng chứng.
- Revert API/web/Caddy về image/config trước đã lưu. Không khôi phục Edge thao tác legacy nếu điều đó mở lại bypass MFA; dùng trang bảo trì admin tạm thời thay vì tái mở quyền cũ.
- Migration là additive nhưng revocation và account policy thay hành vi: không drop bảng/audit để rollback. Ưu tiên forward fix theo migration mới. Nếu cần full DB restore, chỉ thực hiện trong cửa sổ đã chốt với backup đã verify; sẽ ảnh hưởng dữ liệu sau thời điểm backup.
- Restore rehearsal cô lập ngày 28/10 đã kiểm dump custom-format, canary và chạy lại admin SQL suite; bằng chứng local `postgres17-restore*.log`. Không suy thành backup production đã được restore.

## Cập nhật code production lần sau

Dùng source đã review tại commit/tag bất biến, chạy quality gates, build image, áp migration được kiểm trước, cập nhật compose/image tags rồi kiểm health và UI. `git push` chỉ chuyển source lên GitHub; không tự triển khai nếu không có pipeline deploy. Không dùng `git pull` trực tiếp đè working tree server hoặc đưa `.env`, key ký APK vào image/source. Các lệnh và tag cụ thể của lần rollout phải được lưu trong báo cáo release.


## Trạng thái image production gần nhất

API/admin platform giữ baseline triển khai `admin-20261028`; web image hiện tại là `picket-web:web-20261101-responsive-839e5cb-01`. Lượt 01/11 chỉ cập nhật web container, không redeploy API/database/OCR. Báo cáo có release ID, nguồn, phạm vi và rollback tại [web production 01/11](../.artifacts/picket-web-prod-20261101/DEPLOYMENT.md). Worker dùng image `picket-admin-worker`. File cấu hình production là `compose.production.yml`, phải chỉ rõ `-f`.

Với rollout API/admin đã được phê duyệt, source và migration phải theo release cụ thể; không coi web image mới là API image. Lệnh stack đầy đủ dưới đây chỉ dùng khi chủ đích cập nhật các service liệt kê:

```sh
cd /opt/picket
docker compose --env-file deploy/.env.production -f compose.production.yml --profile admin up -d --no-build --no-deps api web caddy admin-worker
```

Lệnh này chỉ chuyển sang image đã build/kiểm, không tự lấy source mới từ GitHub. Mỗi lần cập nhật: kiểm source/commit → tests/build → backup → migration → cập nhật tag image trong env server → lệnh trên → HTTPS/probe/screenshot. Giữ env và credential trên server. Backup cấu hình trước rollout nằm tại `deploy/admin-rollbacks/20261028` với quyền hạn chế; không đưa thư mục này vào Git.

Landing hiện công bố APK 1.0.14/code 28, SHA-256 `1713c3dfbbe220720e5a355442d0de8b4d5cc27b7c89840c1b1f0a2a0120b17b`; readback manifest/download ngày 01/11 nằm trong [báo cáo cửa hàng](migration/STORE_RELEASE_READBACK_20261101.md). Dùng `PICKET_APK` trỏ đúng file đã ký khi build landing; upload APK/checksum trước, đổi manifest/index sau, giữ URL cũ.
