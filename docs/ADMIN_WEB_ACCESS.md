# Truy cập quản trị Picket trên web

**Cập nhật production 22/10:** workspace admin riêng đã triển khai, source `6993560`. Login staff vào `/admin`, các URL tài chính user bị chuyển về admin; không đổi quyền mobile/API. [Bằng chứng và rollback](migration/WEB_PRODUCTION_20261022.md). Các dòng chưa deploy bên dưới thuộc checkpoint local trước đó.

Cập nhật 22/10/2026. Không thay UI Next.js hoặc mobile trong lượt tạo tài khoản này.

## Tài khoản chủ sở hữu

Đã tạo tài khoản riêng bằng alias Gmail do chủ sở hữu chấp thuận trong hội thoại. Email và UUID được giữ trong bằng chứng local `.artifacts/roadmap-qa/owner-web-admin-20261022-result.json`, không lưu mật khẩu/token vào source hoặc tài liệu. Không nâng quyền tài khoản mobile hiện có.

Schema hiện chỉ có **một quyền staff** qua `public.staff_members` và `is_staff()`, không có hai cấp staff/super-admin. Quyền này thuộc tài khoản, không giới hạn riêng web; chủ sở hữu chọn sử dụng giao diện web. Không thiết kế thêm role hoặc giả định mobile bị cấm khi cùng tài khoản staff.

## Đặt mật khẩu và đăng nhập

1. Mở cửa sổ riêng tư hoặc hồ sơ trình duyệt riêng để không thay phiên tài khoản mobile/web hiện tại.
2. Vào [Quên mật khẩu](https://picket.51-79-207-154.sslip.io/forgot-password).
3. Nhập đầy đủ email alias admin đã được xác nhận; không bỏ phần `+picket-admin`.
4. Nhận email trong hộp thư Gmail của chủ sở hữu. Mở liên kết bằng đúng trình duyệt/hồ sơ đã gửi yêu cầu để giữ PKCE verifier. Không chuyển link cho người khác hoặc gửi vào chat.
5. Chủ sở hữu tự nhập mật khẩu mới; agent không nhập, đọc hoặc lưu mật khẩu.
6. Vào [Đăng nhập](https://picket.51-79-207-154.sslip.io/login), dùng **email/mật khẩu alias**, sau đó mở [Admin](https://picket.51-79-207-154.sslip.io/admin). Login hiện chuyển về Dashboard, không tự chuyển admin.
7. Không chọn Google cho alias: chọn Google của tài khoản gốc không đăng nhập vào tài khoản alias vừa tạo. Không cấp thêm quyền tài khoản gốc để khắc phục nhầm phiên.

Nếu callback lỗi hoặc email hết hạn: gửi lại từ trang Quên mật khẩu bằng cùng trình duyệt; không tự sửa URL/token. Nếu `/admin` trở về Dashboard, kiểm tra đúng email phiên trước khi chỉnh quyền.

## Đã kiểm tra

- Tài khoản mới chưa có staff gọi API admin: 403.
- Thêm đúng một membership cho tài khoản mới, `is_staff()` trả true.
- API admin với phiên tài khoản mới: 200; kiểm tra trang rỗng có số trang lớn để không xuất dữ liệu tài khoản khác.
- Đã thu hồi refresh session bootstrap sau kiểm tra; không trao mật khẩu bootstrap cho người dùng.
- Không đổi mật khẩu/gói/phiên hay dữ liệu của tài khoản đang dùng.
- Hai fixture đối tác cũ không còn khi SELECT bằng quyền staff: xác minh độc lập sau ảnh SQL Success của chủ sở hữu.

Chủ sở hữu đã xác nhận trong hội thoại 22/10 rằng đặt lại mật khẩu và vào `/admin` thành công. Đây là nghiệm thu thủ công của chủ sở hữu cho truy cập web; không suy thành mọi thao tác admin đã test. Không tự thao tác khóa tài khoản, cấp gói hoặc đổi cài đặt toàn cục trên người dùng khác để test login.

Checkpoint tạo tài khoản ban đầu: staff bổ sung vào user. Theo yêu cầu mới, source Next.js local đã tách workspace: staff tự vào `/admin`, không truy cập trang/server action tài chính user; user không vào admin. Đây là điều hướng/entrypoint web, không thay role API/mobile. **Chưa triển khai bản web mới lên production**; xem [báo cáo redesign](migration/WEB_REDESIGN_20261022.md).

## Thu hồi khi không còn sử dụng

Chủ sở hữu SQL kiểm tra đúng UUID trong bằng chứng rồi xóa **membership** tương ứng khỏi `public.staff_members`. Không xóa tài khoản Auth/dữ liệu của tài khoản khác. Không bật quyền staff tự động cho các email khác cùng hộp thư và không cho client tự cấp role.
