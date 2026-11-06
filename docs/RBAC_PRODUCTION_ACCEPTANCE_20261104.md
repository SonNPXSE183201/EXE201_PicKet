# Phân quyền tùy chỉnh và MFA — nghiệm thu production 04/11/2026

Đã hoàn tất nghiệm thu bằng phiên Supabase thật và hai tài khoản QA tạm. Chủ dự án tự cấp `permissions.manage` có hạn cho QA operator qua owner/MFA; không thêm owner, không dùng token giả hoặc bỏ kiểm tra MFA. Sau nghiệm thu đã thu hồi toàn bộ quyền QA bằng cách dọn tài khoản và nhóm QA; audit được giữ.

## Hành vi đã kiểm chứng

| Ca kiểm thử | Kết quả |
|---|---|
| Chưa được cấp quyền | Cả hai user bị từ chối đọc/sửa phân quyền; ứng dụng cá nhân vẫn dùng được |
| Đã được cấp `permissions.manage`, chưa MFA | API mutation trả 403 |
| MFA thật của QA operator | Mã sai bị từ chối; mã đúng tạo phiên AAL2 |
| Nhóm tùy chỉnh | Tạo nhóm Finance, sửa danh sách quyền và thêm QA reader có hạn thành viên |
| Giới hạn quyền | Reader chỉ có `revenue.read` và `payments.read`; không có role giảng viên hoặc staff legacy |
| API đọc Finance | Xem tổng thu 19.000đ và đơn thật #1000000001; truy cập quản lý quyền trả 403 |
| Menu trên web thật | Chỉ có hai menu nghiệp vụ Doanh thu/Giao dịch thanh toán; trang Người dùng/Phân quyền bị từ chối |
| Tự nâng quyền | Operator không tự cấp quyền riêng cho chính mình; API trả 400 |
| Revision cũ | Cả rule user và nhóm trả HTTP 409; thay đổi cũ không ghi đè dữ liệu mới |
| Deny riêng | Từ chối `revenue.read` ghi đè quyền nhóm; `payments.read` vẫn dùng được |
| Cấp lại rồi thu hồi | Cho phép riêng khôi phục quyền; gỡ nhóm và từ chối riêng chặn ngay quyền đọc Finance |
| Phiên đang đăng nhập | Reader mất quyền portal mà không cần đăng nhập lại; trang Ví và API profile cá nhân vẫn dùng được |
| Web MFA của user được ủy quyền | Mở trang MFA riêng, xác minh bằng factor thật và lưu nhóm qua server action thành công |
| Giao diện | Đã quan sát màn MFA ở viewport 390×844; ảnh QA được xóa sau kiểm tra |

## Hai lỗi được sửa trong lượt nghiệm thu

### Revision cũ gây timeout

Các guard revision dùng SQLSTATE `40001`, khiến request stale bị PostgREST thử lại thay vì trả xung đột. Ca production RED trả 504; gọi trực tiếp RPC cũng timeout. Đã đối chiếu [hướng dẫn Supabase](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions) và [mã HTTP tùy chỉnh của PostgREST](https://docs.postgrest.org/en/stable/references/errors.html).

Migration mới [`20261103204005_admin_revision_conflict_http.sql`](../supabase/migrations/20261103204005_admin_revision_conflict_http.sql) đổi sáu guard cố định sang `PT409` trong `public.permission_update`, `public.permission_group_update`, `picket_private.admin_mutate`. Giữ chữ ký hàm, MFA, ownership, quyền execute và dữ liệu. Không sửa migration đã áp dụng trước đó. Chỉ kết thúc backend QA bị kẹt đã xác định theo PID/query; không restart project hoặc dừng toàn bộ kết nối.

Đã chạy RED/GREEN cho suite [`admin-revision-conflicts.sql`](../supabase/tests/admin-revision-conflicts.sql): stale write bị từ chối, revision/quyền mới giữ nguyên, audit không tăng do request bị từ chối. **16 suite SQL hiện hành qua**; phần lịch cron cũ vẫn không được PGlite hỗ trợ và không được tính là đã chạy ở PGlite.

Đã tạo backup mới có giao dịch thật, kiểm archive và checksum local/VPS, khôi phục vào PostgreSQL Supabase 17.11 cô lập rồi áp migration/test. Digest nội dung **98 bảng** giữ nguyên trên bản sao. Production hiện có **53 migration**. Bản sao cô lập đã xóa sau kiểm tra.

### User được ủy quyền không mở được trang MFA

Trang `/admin/security` chỉ chứa MFA của chính user nhưng trước đây bị chặn nếu không có `security.read`. User chỉ được cấp `permissions.manage` không thể đi theo liên kết để xác minh MFA rồi sửa quyền.

Đã sửa [`admin-permissions.ts`](../web/src/features/admin/admin-permissions.ts) để user có quyền vào portal được mở trang MFA cá nhân. Không cấp `security.read`, không mở API dữ liệu quản trị hoặc menu Người dùng. Test mới chạy RED trước sửa; **61 test web, lint và typecheck qua**. Docker build và UI production đã kiểm bằng QA operator: password sign-in → MFA riêng → AAL2 → lưu nhóm thành công. API vẫn từ chối mutation khi chưa MFA.

## Release và kiểm tra cuối

- Web hiện tại: `picket-web:rbac-mfa-20261103t204838z`.
- API/worker giữ `payos-20261103t194746z`; không cần build lại API cho thay đổi mã lỗi DB.
- PayOS, PIN và Google Play Billing vẫn bật. API, worker, OCR và Caddy giữ thời điểm khởi động; chỉ web được thay image.
- Smoke web/API, Auth 401, CORS và TLS headers đều qua.
- Security advisors: **29 WARN, 0 ERROR**, không tăng so với trước sửa; không coi advisors đã sạch cảnh báo.
- Sau cleanup: **13 user, 1 owner có MFA, 4 nhóm ban đầu, 0 user QA, 0 nhóm QA, 0 rule user tạm**. Giữ **9 bản ghi permission audit** của thao tác nghiệm thu, gồm lần chủ dự án cấp quyền tạm.
- Không còn backend retry của RPC nhóm được quan sát trong `pg_stat_activity`.
- Đơn #1000000001 vẫn `paid`, nhận 19.000đ, một receipt và một grant Plus. Không xóa hoặc sửa giao dịch thật.

Backup: `/opt/picket/deploy/backups/rbac-revision-20261103T204243Z/database-before.dump`, 1.256.540 byte. SHA-256: `20ce87ed4b99cd60d463b74b9aeff535940c1eb6eae76d10f12f559e281051cf`. Archive logic gồm dữ liệu DB và metadata Storage, không gồm nội dung file Storage. File riêng trên VPS được giữ trong thư mục quyền 0700, file dữ liệu quyền 0600; không commit archive.

Bằng chứng local tại `.artifacts/rbac-production-qa-20261104/`: `manifest.json`, `mfa-result.json`, `grant-result.json`, `revoke-result.json`, `browser-granted.json`, `browser-revoked.json`, `manager-browser-after-proof.json`, `manager-browser-save-group.json`, `rehearsal-result.json`, `final-database.json`, `final-runtime.json`. Mật khẩu, seed MFA, token QA và file JS chứa thông tin thử tạm đã xóa; hai browser QA đã đóng. Không giữ ảnh test trong asset ứng dụng.

SMS/OTP tiếp tục hoãn theo yêu cầu. Nghiệm thu APK native mới là bước riêng; lượt này không upload APK/AAB hoặc thay track Google Play.
