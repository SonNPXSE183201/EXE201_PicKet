# Backup Flutter, admin và cập nhật Console — 22/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Trạng thái và ranh giới

Yêu cầu: xử lý backup lịch sử, ba đầu việc admin và đồng bộ tài liệu. **Chưa đóng toàn yêu cầu**: còn toàn luồng settings Android/API staging. Cleanup production đã được người dùng chạy SQL thành công và agent xác minh độc lập qua SELECT staff, còn 0 fixture. Không đổi local SQL thành PASS cho staging E2E. Không commit/push hoặc triển khai APK trong lượt này. Người dùng xác nhận không có file Flutter và chỉ tập trung Expo Android; bỏ nghiệm thu file Flutter lịch sử khỏi phạm vi MVP, không xóa codec tương thích cũ.

Đã kiểm tra cấu hình production bằng helper hiện hữu, không xuất giá trị bí mật: đọc được cấu hình API/Supabase; không có SQL DSN/management token, SMTP hoặc staging trong environment/helper đang truy cập. Điều này không khẳng định người dùng không có cấu hình ở nơi khác. Không mở rộng quyền service_role, không thử mật khẩu và không sửa cài đặt toàn cục production.

## Ma trận nghiệm thu còn mở

| ID | Ca và trạng thái | Đầu vào / bằng chứng cần để đóng |
| --- | --- | --- |
| BF-01 | OUT OF SCOPE — file Flutter lịch sử | Người dùng xác nhận không có file cũ, sản phẩm dùng Expo/Next/Dart. Không nghiệm thu giả bằng fixture. Nếu sau này cần nhận file Flutter của người dùng cũ, phải mở lại ca đầu vào thật. |
| BF-02 | NOT RUN / OUT OF SCOPE — restore file Flutter thật | Giữ bộ import/codec đã có. Bộ export local hiện có 15/15 test đạt, không chứng minh file Flutter thật đã restore trên điện thoại. Không yêu cầu khôi phục ứng dụng Flutter hay sửa Next UI. |
| AD-01 | PASS — email reset tới inbox thật | Tạo staff và target alias mới thuộc hộp thư do người dùng chỉ định. Gọi API admin thật, HTTP 200; người dùng xác nhận nhận email trong hội thoại 22/10. Sau xác nhận đã xóa target, kiểm tra 404; staff tạm đã thu hồi và xóa. Không đổi tài khoản chính, không lưu recovery token/password. Phạm vi đạt là delivery; đặt mật khẩu mới/callback từ email chưa chạy và không được suy diễn đạt. |
| AD-02 | DB PASS / E2E OPEN — settings staging | Đã tạo PostgreSQL 16 tạm, network none, không published port/bind/persistent volume. Áp dụng migration administration thật; 8 ca đạt: staff save/read, nonstaff denied, bảo trì chặn finance write nonstaff, staff ghi được, validation rollback, resume write, audit và restore ban đầu. Container đã xóa. Chưa có Auth/API/Android staging nên không ghi E2E PASS. |
| AD-03 | PASS — cleanup production | Người dùng chạy [SQL giới hạn](../../supabase/tests/cleanup_staff_qa_20261022.sql), ảnh SQL `Success. No rows returned`. Agent SELECT bằng tài khoản staff mới theo ID fixture đã biết hoặc exact title fixture cũ: 0 rows. Không thực hiện DELETE rộng hay cấp thêm quyền bảng cho API. Bằng chứng độc lập: `owner-web-admin-20261022-result.json`. |
| DOC-01 | UPDATED — trạng thái Console | Đã đăng ký cá nhân; danh tính đang xét duyệt theo ảnh; điện thoại chưa xác minh; thẻ website đã public nhưng chưa có kết quả chấp nhận. Billing/thiết bị thật vẫn chưa nghiệm thu. |

## Cách cung cấp đầu vào an toàn

1. File Flutter lịch sử được loại khỏi MVP theo xác nhận người dùng; giữ import tương thích và mở lại nghiệm thu nếu có file thật sau này.
2. Email test đã được người dùng xác nhận nhận; tài khoản alias đã xóa. Không sử dụng link test này để thay đổi phiên hiện tại.
3. Cho biết nơi cấu hình staging trong workspace, không dán secret vào chat. Không dùng production làm staging, kể cả định bật bảo trì trong thời gian ngắn.
4. Mở SQL Editor đúng project qua trình duyệt kết nối công cụ, hoặc tự chạy file cleanup rồi cung cấp kết quả không có secret. Không cần đóng/xóa tài khoản Cloud Billing cho việc này.

## Kết quả thực thi lượt này

- `npm --prefix apps/mobile run test:export`: 15/15 PASS, không skip.
- `node supabase/tests/validate.mjs`: PASS, bao gồm staff/maintenance và các migrations trong suite.
- `node .artifacts/check-staff-cleanup-sql.mjs`: PASS guard/idempotence/rollback; chưa xóa production.
- PostgreSQL 16 thật cô lập: 8 checks PASS, `.artifacts/roadmap-qa/admin-settings-isolated-postgres-result.json`. Đây là staging tầng database, không phải Supabase/API/UI staging.
- Inbox thật: `.artifacts/roadmap-qa/admin-inbox-9728be6a/result.json`; owner xác nhận receipt, staff/target mới đã xóa, không thay người dùng hiện hữu.
- Browser inventory apps/browsers đều rỗng; mở Edge qua công cụ báo `Browser is not available: edge`. URL người dùng gửi là Table Editor; không có bằng chứng chạy SQL chỉ vì tab đã mở trên laptop.
- Log SQL local: `backup-admin-followup-sql-20261022.log`, `backup-admin-followup-cleanup-20261022.log` trong `.artifacts/roadmap-qa`.
- Thay đổi tracked chỉ tài liệu: không đổi runtime/schema/API, không cần rebuild APK/typecheck runtime cho lượt sửa này. Kiểm tra liên kết và diff riêng trước khi chốt; không tuyên bố toàn ứng dụng vừa chạy lại.

## Nguồn

- [Trạng thái dự án](../PROJECT_STATUS.md)
- [Staff/admin: 18 ca đã đạt và phạm vi chưa đạt](STAFF_ADMIN_ACCEPTANCE_20261022.md)
- [Checklist Android thật](../ANDROID_REAL_DEVICE_CHECKLIST.md)
- [Google Play](../GOOGLE_PLAY_SANDBOX_TO_PRODUCTION.md)
