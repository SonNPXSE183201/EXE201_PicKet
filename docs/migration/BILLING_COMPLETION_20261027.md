# Gói Picket và giới hạn OCR — 27/10/2026

## Phạm vi và sửa lỗi

- Giao diện Paper đồng bộ dashboard: icon Free/Plus/Pro, thẻ hạn mức, thanh tỷ lệ, tab tháng/năm, hai thẻ so sánh và nhóm công cụ giao dịch. Giá/offer từ Play, không hardcode giá hoặc tạo ưu đãi giả. VI/EN, dark mode và trạng thái hết lượt được giữ.
- Sửa việc refresh nền 12 giờ làm bỏ lỡ purchase khi quay về từ Google. Foreground buộc đọc lại, gộp yêu cầu đồng thời và thử lại sau 2/6/15 giây. Quyền vẫn do server xác minh, rồi mới finish/ack giao dịch. Mỗi lần đọc thành công cũng tải lại quyền khi Play không còn purchase, tránh giữ tier cũ sau hết hạn.
- Không đổi schema/quota production. SQL test mới được tích hợp vào suite migration hiện hành.

## OCR: bằng chứng và giới hạn

| Tier | API chấp nhận | Lượt kế tiếp | Còn lại |
| --- | ---: | --- | ---: |
| Free | 3 | HTTP 429 ở lượt 4 | 0 |
| Plus | 30 | HTTP 429 ở lượt 31 | 0 |
| Pro | 100 | HTTP 429 ở lượt 101 | 0 |

Production dùng ba tài khoản tạm, một ảnh hóa đơn tổng hợp mỗi tài khoản và API thật. Tier Plus/Pro của các tài khoản này là fixture do service tạo, **không phải bằng chứng mua Google Play**. Có tổng cộng 133 yêu cầu được nhận; gửi lại idempotency key ở hạn mức trả đúng job cũ. Đã đối chiếu toàn bộ 3/30/100 job qua quyền owner; chờ hàng đợi về 0 pending trước khi xóa ảnh và ba tài khoản. API danh sách mặc định chỉ trả 20 job nên không dùng số lượng trang đó làm tổng số đã xử lý.

SQL suite kiểm thêm cả ba tier: request vượt mức bị từ chối, retry không trừ lượt, job lỗi vẫn tính lượt, job quá 24 giờ trả lại dung lượng và chỉ nhận thêm đúng một lượt. Fixture chỉ nằm trong DB test. OCR local không đi qua quota cloud; các phép thử này không chứng minh độ chính xác trên mọi loại hóa đơn/camera thật.

## Xác minh và phát hành

- 29 Billing tests, 922 mobile tests, lint/typecheck PASS; SQL migration suite và ba quota suite PASS.
- Play Internal **1.0.9/code 22** đã commit và đọc lại độc lập; cập nhật đúng code 22 bằng CH Play, không cài giả installer. Alpha code 6 vẫn draft, beta/production không đổi. Landing vẫn APK code 20.
- AAB 80.923.772 byte, SHA-256 `66e3aeeb6ccc6ce35d397cda71dc8fee188131ce653dbf7170fec3e6057563d0`; jarsigner/chữ ký release/56 native libs ARM64+x86_64 PASS; không có quyền cài APK hoặc overlay.
- Plus tháng: giao dịch Test card ở checkpoint code 21; code 22 đọc lại purchase/server và acknowledge thành công. Thử mua lại trả đúng “already subscribed”, không phát sinh mua mới.
- Plus năm: Google báo Payment successful bằng Test card ở code 21. Code 22 tự xác minh/acknowledge purchase còn sở hữu, không cần Restore; UI PLUS 30/30 trước khi mua Pro.
- Pro năm và Pro tháng: mở đúng giá 499.000đ/49.000đ, xác nhận “Test card, always approves / You will not be charged”, Play báo Payment successful trên code 22. Sau màn onboarding xác minh của Google, đưa Picket về foreground tự cập nhật PRO 100/100, không nhấn Restore. Không thay đổi tùy chọn bảo mật thanh toán của tài khoản Google.
- Server đọc lại có cả bốn product ID, tier/active/expiry/verified_at đúng. Native BillingClient trả `isAcknowledgedAndroid=true`, `purchaseState=purchased` cho cả bốn. Đây là bằng chứng BillingClient, chưa thay thế Android Publisher ack API độc lập.
- Cold restart giữ phiên và PRO 100/100. Ảnh native sáng/tối, tháng/năm và chữ 150% đã xem; giá/nút đọc được và các thẻ cuộn bình thường. Đã khôi phục font 100% và chế độ Theo hệ thống sau QA. Dùng icon hiện có nên không thêm bitmap trang trí dư.

Đã dọn 29 thư mục output sinh tự động (5,84 GiB) bằng script chuẩn sau khi backup; 48 APK/AAB giữ nguyên hash. Production API health vẫn PASS. Không commit artifact hoặc credential.

Phạm vi chưa đóng: cancel/refund/revoke, grace/hold, decline/pending và vòng đời RTDN đầy đủ chưa được nghiệm thu trong đợt happy-path này. Lệnh ADB mở quản lý subscription đã bị automatic approval review chặn ở lượt trước; không thử đường khác để vượt block. Không tuyên bố production rollout hoặc nghiệm thu lại Redmi 7.

Bằng chứng riêng tư: `.artifacts/billing-completion-20261027/`; không commit ảnh tài khoản thật, session, token hoặc APK/AAB. Xem [trạng thái hiện hành](../PROJECT_STATUS.md), [backlog](../BACKLOG.md), [thiết kế duy nhất](../../PICKET-DESIGN.md) và [kiểm thử máy ảo trước đó](PLAY_BILLING_EMULATOR_20261027.md).
