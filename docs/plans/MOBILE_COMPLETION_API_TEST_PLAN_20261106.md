# Kế hoạch hoàn thiện bản gộp và kiểm thử toàn bộ chức năng máy chủ mà ứng dụng điện thoại dùng — 06/11/2026

Nối tiếp `MOBILE_FIGMA_MERGE_PLAN_20261106.md`. Nhánh `merge/mobile-figma`, **chưa lưu phiên bản, không đẩy lên GitHub**.

## 1. Đã xong
- **Gộp:** giải xong 11 chỗ xung đột; giao diện theo Figma, chức năng giữ theo nhánh hiện tại.
- **Gói & thanh toán PayOS:** giao diện Figma, giữ đủ các chức năng:
  - đếm ngược và kiểm tra lại khi quá hạn,
  - xác nhận trước khi thay đường dẫn thanh toán,
  - mã ưu đãi, gói hiện tại, huỷ thanh toán.
- **Song ngữ Việt/Anh** cho 5 màn lấy từ nhánh Figma.
- **Đổi giao diện** các màn chưa có thiết kế: thông báo, bảo trì, cập nhật ứng dụng.
- **Kiểm thử tự động đều đạt:** ứng dụng điện thoại, trang web (64), trang giới thiệu (17), máy chủ (180), cơ sở dữ liệu (16).
- Phần web, trang giới thiệu, máy chủ và cơ sở dữ liệu không thay đổi.

## 2. Ba lớp kiểm thử

| Lớp | Cách làm | Có chạm máy chủ thật không |
|---|---|---|
| 1. Kiểm thử tự động | Bài kiểm thử của máy chủ, cơ sở dữ liệu và ứng dụng | Không |
| 2. Gọi thật lên máy chủ | Tạo hai tài khoản kiểm thử dùng một lần. Gọi đủ 73 chức năng ứng dụng dùng: tạo, đọc, sửa, lưu trữ. Kiểm tra tài khoản này không đọc hay sửa được dữ liệu tài khoản kia. Cuối cùng xoá cả hai tài khoản | Có, dữ liệu tách riêng và tự dọn |
| 3. Thử trên máy | Đi qua các màn trên Redmi 7 bằng tài khoản thật, chỉ xem | Có, chỉ xem |

**Giới hạn đã thống nhất:**
- PayOS chỉ xem, không tạo đơn thật.
- Google Play chỉ thử bằng mã giả.
- Không gửi tin nhắn thật.

## 3. Kết quả lớp 2 (gọi thật lên máy chủ)

118 đạt, 7 lỗi, 2 bỏ qua. Hai tài khoản kiểm thử đã xoá; không còn dòng dữ liệu hay tệp nào sót lại.

| # | Lỗi | Mức độ | Nguyên nhân | Hướng sửa |
|---|---|---|---|---|
| 1 | Khôi phục bản sao lưu thất bại nếu tài khoản từng **chuyển tiền giữa các ví** | Cao | Khi xuất, giao dịch chuyển ví bị gắn danh mục "Khác"; khi khôi phục, cơ sở dữ liệu từ chối | Sửa hàm xuất và hàm khôi phục trong cơ sở dữ liệu, kèm kiểm thử |
| 2 | Sau khi khôi phục, danh mục tự tạo đổi mã nên ngân sách cũ lỗi | Trung bình | Bản sao lưu lưu danh mục theo tên | Ghép lại theo tên khi khôi phục |
| 3 | Mọi bài học đều bị máy chủ từ chối chấm điểm (báo bài học không khả dụng) | Cấu hình | Đáp án bài học chưa được duyệt và công bố trên máy chủ thật | Duyệt và công bố trong trang quản trị |
| 4 | Người khác đối soát ví của bạn nhận mã lỗi 502 thay vì 404 | Thấp | Máy chủ chưa đổi đúng mã lỗi | Sửa ở máy chủ |
| 5 | Mã mua hàng Google Play giả nhận mã lỗi 502 thay vì lỗi yêu cầu không hợp lệ | Thấp | Như trên | Sửa ở máy chủ |

**Ghi chú:**
- Máy chủ vẫn cho chuyển tiền vượt số dư; hiện chỉ ứng dụng chặn.
- Tính năng trí tuệ nhân tạo cho bài học đang tắt trên máy chủ thật.

## 4. Kết quả lớp 3 (thử trên Redmi 7)

Các màn chính chạy với dữ liệu thật. Đã sửa và kiểm tra lại:
- Số tiền khó đọc ở chế độ tối.
- Màn chụp hoá đơn nền sai màu.
- Lưới ví rơi xuống một cột.
- Hai lỗi tiếng Anh.

## 5. Chờ bạn quyết định
- **Lỗi 1 (khôi phục khi có chuyển ví):** cần thay đổi cơ sở dữ liệu trên máy chủ thật.
- **Lỗi 2:** sửa ngay hay để giai đoạn sau.
- **Lỗi 3:** người phụ trách nội dung duyệt và công bố đáp án.
- **Lỗi 4–5:** cần triển khai lại máy chủ.
