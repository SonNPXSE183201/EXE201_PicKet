# PayOS — nghiệm thu thanh toán thật 04/11/2026

Đã xác minh thanh toán thật do chủ dự án tự thực hiện cho đơn **#1000000001**, gói **Plus 1 tháng**, **19.000 VND**. Các kiểm tra trong lượt xác nhận dùng truy vấn đọc; không sửa trạng thái đơn, tự tạo receipt hoặc cấp gói thủ công.

| Kiểm tra | Kết quả |
|---|---|
| PayOS API | `PAID`, amount 19.000, amountPaid 19.000, amountRemaining 0, 1 transaction |
| Chữ ký phản hồi provider | HMAC-SHA256 hợp lệ; paymentLinkId và orderCode khớp checkout của đơn |
| Webhook thật | Log API có request `/v1/billing/payos/webhook` trả HTTP 200 lúc **03:23:08 ngày 04/11/2026**, giờ Việt Nam |
| Đơn Picket | `paid`; timeline `created` → `checkout_ready` → `payment_received` → `entitlement_granted` |
| Receipt | 1 bản ghi, tổng nhận 19.000 VND |
| Entitlement | 1 grant Plus, đúng user của đơn, đang hiệu lực |
| Hạn gói | **03:23:08 ngày 04/12/2026**, Asia/Ho_Chi_Minh |
| Doanh thu ngày tại thời điểm kiểm tra | 19.000 VND theo ngày Việt Nam; khoản thu của đơn là 19.000 VND |

Đã đối chiếu checkout trên ảnh với paymentLinkId lưu từ phản hồi PayOS được kiểm chữ ký. Mã VietQR có tài khoản định danh `CAS...`. Chủ dự án xác nhận lần chuyển đầu bị gián đoạn vì dùng chính tài khoản nhận để gửi cho nó; sau khi chuyển từ tài khoản khác, thanh toán thành công. Webhook thực tế được cấu hình hiện tại tiếp nhận và cấp gói thành công. Không thay tài khoản nhận hoặc triển khai thêm allowlist alias. Mã nguồn service/test và Compose đã được đối chiếu lại với release đang chạy sau điều tra.

Chỉ quan sát 1 receipt và 1 grant của giao dịch thật; không gọi đây là nghiệm thu phát lại webhook thật. Chống trùng webhook/grant đã được kiểm trong bộ SQL trên bản sao trước rollout. Không đăng nhập thay khách hàng để xác minh UI; người dùng có thể tải lại `/billing` để xem quyền lợi mới nhất.

Bằng chứng riêng, được Git bỏ qua, tại `.artifacts/payos-production-rollout-20261104/`:

- `live-payment-1000000001.json`: order, receipt, grant và timeline.
- `live-payment-provider-1000000001.json`: trạng thái provider và kết quả kiểm chữ ký, không chứa khóa.
- `live-payment-webhook-log.json`: số request webhook, HTTP 200 và timestamp; không lưu header/token.
- `live-payment-entitlement-1000000001.json`: owner khớp, gói đang hiệu lực, hạn gói và tổng thu.

Giữ nguyên đơn, receipt, event và grant thật để đối soát. Không áp dụng script cleanup QA vào đơn này. Nghiệm thu owner/MFA trên portal sau đó đã hoàn tất theo [báo cáo RBAC](RBAC_PRODUCTION_ACCEPTANCE_20261104.md). SMS/OTP tiếp tục hoãn; không build/upload ứng dụng Google Play trong lượt này.
