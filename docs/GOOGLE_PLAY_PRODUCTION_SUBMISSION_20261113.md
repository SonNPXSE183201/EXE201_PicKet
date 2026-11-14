# Nộp hồ sơ xin phát hành Picket lên Google Play (production)

Ngày lập: 13/11/2026. Trạng thái đọc qua Google Play API (chỉ đọc, không thay đổi gì):

| Mục | Hiện tại |
| --- | --- |
| Production | Chưa có release |
| Beta | Chưa có release |
| Closed testing (`alpha`) | 1.0.17 (31), `completed`, rollout 100% |
| Internal testing | 1.0.17 (31), `completed`, rollout 100% |
| Người thử alpha | Một Google Group (`testerbie@googlegroups.com`) |
| Bản liệt kê | Có tiếng Việt và en-US; tiêu đề, mô tả ngắn hợp lệ độ dài |

## Điều không đọc được qua API (phải xem trong Play Console)
- Đã đủ **14 ngày liên tục** với đủ số người thử đã tham gia hay chưa.
- Số thành viên của Google Group và số người đã chấp nhận lời mời (opt-in).
- Trạng thái các mục "Nội dung ứng dụng", Data safety, xếp hạng nội dung, khai báo tính năng tài chính.
Hãy mở **Play Console → Picket → Dashboard → "Apply for production" (Đăng ký quyền truy cập bản chính thức)** để xem Google đang yêu cầu gì với tài khoản của bạn. Quy tắc cho tài khoản cá nhân mới thường là: **ít nhất 12 người thử, tham gia liên tục 14 ngày** trước khi được xin production. Số liệu này có thể thay đổi; lấy con số hiển thị trong Console làm chuẩn.

## Các bước nộp (làm trên Play Console, do chủ tài khoản bấm)
1. **Kiểm tra điều kiện closed test**: Testing → Closed testing → tab Testers, xem số người đã opt-in. Không đóng track, không bớt người thử, không gỡ release (làm vậy sẽ phải tính lại 14 ngày).
2. **Hoàn tất "Nội dung ứng dụng"** (Policy → App content): chính sách quyền riêng tư (URL `https://picketfinance.com/privacy.html`), quảng cáo, quyền truy cập ứng dụng (nếu có phần cần đăng nhập, cung cấp tài khoản thử cho người duyệt), đối tượng người dùng, Data safety, xếp hạng nội dung, tính năng tài chính (khai báo đúng: công cụ ghi chép chi tiêu cá nhân, không ngân hàng, không cho vay, không tư vấn đầu tư), xóa tài khoản (URL `https://picketfinance.com/account-deletion.html`).
3. **Khai báo quyền nhạy cảm**: camera và ảnh dùng để quét hóa đơn; mô tả đúng mục đích.
4. **Kiểm tra Monetize**: bốn gói đăng ký (`picket_plus_monthly`, `picket_plus_yearly`, `picket_pro_monthly`, `picket_pro_yearly`) đang `ACTIVE`, bản Play chỉ dùng Google Play Billing (không PayOS). Mô tả cửa hàng nên nêu rõ gói trả phí tự gia hạn.
5. **Hoàn thiện bản liệt kê**: icon 512×512, ảnh bìa 1024×500, tối thiểu 2 ảnh điện thoại (đã có 7 ảnh trong `.artifacts/google-play-assets/play-screenshots-v2`; cần chụp lại nếu giao diện đã đổi), mô tả ngắn ≤ 80 ký tự, mô tả đầy đủ ≤ 4000 ký tự, email liên hệ.
6. Bấm **Apply for production** và trả lời bảng câu hỏi (về closed test, về ứng dụng, về mức độ sẵn sàng). Nêu phản hồi tester đã nhận và cách bạn đã sửa lỗi.
7. Sau khi Google chấp thuận, tạo release production (có thể **promote** bản 31 từ closed testing), điền ghi chú phát hành, **gửi duyệt**. Ứng dụng dùng *managed publishing*: sau khi gửi, thay đổi chờ ở "Tổng quan về việc xuất bản" cho tới khi bạn bấm "Phát hành thay đổi".

## Đề xuất chỉnh mô tả (tiếng Việt)
Mô tả tiếng Việt hiện chưa có đoạn về gói trả phí, trong khi bản en-US đã có. Nên thêm trước phần "Lưu ý quan trọng":

> Gói tùy chọn: PicKet có tính năng miễn phí và các gói Plus/Pro tùy chọn. Google Play hiển thị giá, chu kỳ thanh toán và quyền lợi trước khi bạn mua. Gói đăng ký tự gia hạn theo điều khoản hiển thị trên Google Play; bạn có thể quản lý hoặc hủy trong Google Play.

Giữ nguyên câu "không cung cấp dịch vụ ngân hàng, cho vay hay tư vấn đầu tư". Tránh các cụm khẳng định tuyệt đối ("tốt nhất", "chính xác 100%") vì có thể bị coi là thông tin gây hiểu nhầm.

## Điều chưa làm và cần bạn xác nhận
- Chưa cập nhật bản liệt kê, chưa tải ảnh lên, chưa chạm closed testing.
- Ảnh chụp mới nên lấy từ **bản cài qua Internal testing** (không có menu dev client) trên Redmi 7, rồi mới tải lên.
- Không có thao tác nào ở trên tự nộp hồ sơ; việc bấm "Apply for production" và gửi duyệt do bạn quyết định.

## Kết quả kiểm tra trên Play Console (13/11/2026, chỉ xem)
- Closed testing: đã xuất bản release, **12 người kiểm thử đã chọn tham gia**, hiện **13/14 ngày liên tục**. Nút "Đăng ký phát hành công khai" còn **bị khóa**; mở khi đủ 14 ngày (dự kiến ngày kế tiếp, lấy số ngày hiển thị trên Console làm chuẩn).
- "Nội dung ứng dụng": tab "Cần chú ý" **trống**, không còn khai báo nào chưa hoàn tất.
- Tổng quan xuất bản: không có thay đổi nào đang chờ.
- Cảnh báo không chặn phát hành ("Cho lần phát hành tiếp theo"): mức tối ưu hóa mã DEX thấp hơn ngưỡng; API chế độ tràn viền (edge-to-edge) lỗi thời trên Android 15, phát sinh từ `react-native` và `material`. Xử lý ở bản cập nhật sau, không phải điều kiện để xin production.
