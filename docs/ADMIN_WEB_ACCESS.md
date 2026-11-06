# Truy cập quản trị Picket trên web

Cập nhật 28/10/2026. Admin platform mới đã triển khai production; owner đăng nhập và thiết lập/xác minh MFA của chính mình trước các thao tác thay đổi. Xem [trạng thái](PROJECT_STATUS.md), [kế hoạch](ADMIN_PLATFORM_PLAN_20261028.md) và [runbook](ADMIN_PLATFORM_RUNBOOK.md).

## Đăng nhập

1. Mở https://app.picketfinance.com/login bằng hồ sơ trình duyệt dành cho công việc quản trị.
2. Dùng đúng tài khoản admin riêng đã được cấp. Không cấp staff cho tài khoản mobile cá nhân để khắc phục nhầm phiên. Alias Gmail vẫn là email đăng nhập riêng; Google login bằng địa chỉ gốc không tự trở thành alias.
3. Nếu quên mật khẩu, dùng trang khôi phục trong cùng trình duyệt để giữ PKCE. Chủ tài khoản tự nhận email, nhập mật khẩu và giữ mã xác thực; không đưa link/token vào báo cáo.
4. Sau rollout mới: staff được chuyển vào `/admin`. Mở **Bảo mật & MFA**, thêm TOTP trong ứng dụng xác thực của chính bạn và nhập mã. MFA bắt buộc cho mutation và export; quyền luôn được API kiểm tra lại.
5. Logo và “Về trang chủ” ở ba trang Auth mở trực tiếp https://picketfinance.com/.

## Vai trò sau migration mới

- Owner: toàn bộ module, quản lý nhân sự; không được gỡ owner cuối cùng.
- Operations: vận hành, người dùng, gói, hỗ trợ, phiên bản và các cấu hình được cấp.
- Support: tra cứu người dùng tối thiểu, hỗ trợ, khóa/mở/reset theo quyền; không cấp gói hoặc nhân sự.
- Analyst: số liệu tổng hợp; không xem email, người dùng, doanh số tài chính hoặc export dữ liệu cá nhân.
- Content: nội dung và đối tác. Công bố nội dung cần reviewer khác tác giả, đúng bản được duyệt.

Admin chỉ dùng web. Mobile mới kiểm tra policy trước khi mở các provider dữ liệu; API người dùng cũng từ chối staff. Muốn dùng ứng dụng cá nhân phải dùng tài khoản khác.

## Thao tác và an toàn dữ liệu

Mỗi thay đổi có lý do, xác nhận, request ID chống gửi lặp và audit giới hạn trường trước/sau. Không xem/sửa số dư hoặc nội dung giao dịch của người dùng qua admin. Cấp gói hỗ trợ không ghi đè quyền Google Play; dashboard phân biệt nguồn quyền.

Thu hồi phiên làm các session ID hiện tại bị API từ chối, kể cả token refresh cùng phiên. Người dùng có thể đăng nhập lại tạo phiên mới. Khóa tài khoản ngăn đăng nhập/sử dụng; mở khóa không khôi phục phiên đã bị thu hồi.

Ticket loại “Yêu cầu xóa tài khoản” theo dõi xác minh chủ tài khoản và tiến trình xử lý. Chức năng lưu ticket không xóa Auth/finance; hướng dẫn chủ tài khoản dùng luồng xóa có xác thực trong sản phẩm.

## Khôi phục owner

Không cung cấp nút công khai để tự cấp quyền hoặc bỏ qua MFA. Nếu mất phương thức MFA, chủ dự án dùng quyền quản trị Supabase được kiểm soát để khôi phục đúng danh tính, ghi nhận sự cố và audit vận hành. Không sửa membership của tài khoản khác để vượt bước xác minh. Không đưa mật khẩu, TOTP seed hoặc QR MFA vào screenshot bàn giao.

## Bằng chứng lịch sử

Việc tạo tài khoản owner riêng và nghiệm thu đăng nhập ngày 22/10 được giữ tại [báo cáo production](migration/WEB_PRODUCTION_20261022.md). Các checkpoint cũ không chứng minh các chức năng mới đã được triển khai production.
