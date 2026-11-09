# Kế hoạch gộp nhánh giao diện Figma của ứng dụng điện thoại vào nhánh `feat/admin-web-redesign` — 06/11/2026 (bản 2)

**Nguyên tắc đã chốt:**
- **Ứng dụng điện thoại:** ưu tiên **giao diện** của nhánh Figma (`origin/refactor/redesign-landing-page`); chức năng và phần nối với máy chủ giữ theo nhánh hiện tại.
- **Các phần giữ nguyên:** trang quản trị web, trang web người dùng, trang giới thiệu, máy chủ và cơ sở dữ liệu Supabase. Nhánh Figma không động tới các phần này.

## 1. Hiện trạng

- **Nhánh hiện tại** `feat/admin-web-redesign` ở mốc `cb9b8508`: đã lưu hết thay đổi, chưa đẩy lên GitHub.
- **Nhánh Figma** ở mốc `6857b070`: 14 lần lưu phiên bản của Camellya, chỉ sửa `apps/mobile`, `packages/design-tokens` và một tài liệu. Nhánh đó ghi nhận 1049 bài kiểm thử đạt.
- **Thử gộp trước:** 11 chỗ xung đột, đều trong ứng dụng điện thoại.

## 2. Mỗi màn hình nối với máy chủ ở đâu

### 2.1 Chức năng của nhánh hiện tại phải giữ khi lấy giao diện Figma

| Chức năng | Màn hình | Cách xử lý khi gộp |
|---|---|---|
| Thông báo hệ thống, bảo trì | Nhà (dải thông báo), Thông báo (hộp thư), màn bảo trì | Gắn lại vào giao diện Figma |
| Thanh toán PayOS 15 phút, ưu đãi | Gói & thanh toán | Giữ đếm ngược, kiểm tra lại, thay đường dẫn thanh toán, mã ưu đãi; dùng giao diện Figma |
| Thanh toán Google Play | Gói & thanh toán (bản Google Play) | Giữ cách tách tệp `.play.tsx` |
| Đăng ký bằng số điện thoại | Đăng ký, gắn số điện thoại | Không xung đột; đổi sang thành phần giao diện Figma |
| Học tài chính 30 bài, chấm điểm | Học tài chính | Giao diện Figma, giữ danh sách bài học lên trước |
| Kỷ niệm & giấy tờ | Kỷ niệm, mục trong Tài khoản | Giao diện Figma, thêm lại mục trong Tài khoản |
| Bắt buộc cập nhật phiên bản | Mục cập nhật ứng dụng | Kiểm tra vị trí trong Tài khoản |
| Song ngữ Việt/Anh | Thống kê, Kỷ niệm, Hoá đơn, Cần kiểm tra, Giới thiệu ban đầu | Bọc lại phần dịch vào giao diện Figma, thêm bản tiếng Anh |

### 2.2 Các frame Figma ghi "ứng dụng còn thiếu"

| Frame | Máy chủ hiện có | Đề xuất |
|---|---|---|
| Mã xác thực qua tin nhắn | Có, nhưng máy chủ thật đang tắt tin nhắn | Chỉ hiện khi bật tin nhắn; hiện tại xác thực qua email |
| G14 so sánh hai hoá đơn | Có chức năng tìm hoá đơn trùng | Làm ngay (đã làm, xem kế hoạch ngày 07/11) |
| G11 "Đã là Pro" | Có thông tin hạng gói | Làm ngay (đã làm) |
| Nút khoá bằng mã PIN | Ứng dụng có khoá thiết bị | Trỏ vào khoá thiết bị hiện có |
| Đổi ảnh đại diện | Chưa có kho lưu ảnh | Để sau |
| Chia sẻ, lưu hoá đơn | Không cần máy chủ | Làm phía ứng dụng (đã làm) |
| Cỡ chữ, giảm chuyển động | Chưa có | Lưu trên máy |

## 3. Các bước
1. Tạo nhánh làm việc `merge/mobile-figma`, gộp nhánh Figma.
2. Giải 11 chỗ xung đột theo nguyên tắc ở trên.
3. Đổi các màn chưa có thiết kế sang thành phần giao diện Figma.
4. Giữ các hành vi mới của nhánh Figma:
   - Chi tiêu mặc định hiện tháng hiện tại.
   - Chặn chuyển tiền vượt số dư.
   - Cách gộp giao dịch trùng.
   - Xuất dữ liệu nằm trong Sao lưu.
   - Chọn ngày phải bấm xác nhận.
5. Kiểm thử:
   - Kiểm tra kiểu, quy tắc mã và toàn bộ bài kiểm thử.
   - Phần web, trang giới thiệu và máy chủ không được thay đổi.
   - Chạy thử trên Redmi 7.
6. Bàn giao: **chưa lưu phiên bản, chưa đẩy lên GitHub** cho tới khi bạn duyệt.

**Kết quả:** các bước 1–5 đã xong. Tiến độ tiếp theo xem `MOBILE_COMPLETION_API_TEST_PLAN_20261106.md` và `MOBILE_UI_PERF_DEEP_TEST_PLAN_20261106.md`.
