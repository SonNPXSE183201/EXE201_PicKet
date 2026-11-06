# Google Play Billing trên máy ảo — 27/10/2026

## Kết quả đã xác nhận

- Máy ảo Play Store Android 35 mới, chủ dự án trực tiếp hoàn tất đăng nhập Google bằng tài khoản license tester. Không dùng mật khẩu trong source hoặc log.
- CH Play cài bản 1.0.7/code 20 ARM64 nhưng app crash trước UI: SoLoader không tìm được libreactnative.so khi chạy qua native bridge trên x86_64. Cài được APK không chứng minh tương thích runtime.
- Đã build và phát hành riêng Play Internal **1.0.8/code 21**, đủ 56 thư viện native của ARM64 và x86_64, có libreactnative.so cho từng ABI. Chữ ký khớp release, jarsigner đạt, không có REQUEST_INSTALL_PACKAGES/SYSTEM_ALERT_WINDOW. AAB 79.349.437 byte; SHA-256 `cbe08b960799b05c30f752e3a7c3293770a5ba4ece49c22da2cba9656a24ec3d`.
- Đọc lại API độc lập: Internal completed code 21; alpha code 6 vẫn draft, beta/production không đổi. Landing vẫn APK 1.0.7/code 20, không deploy landing trong lượt này.
- Cập nhật code 21 bằng CH Play trên máy ảo thành công, primaryCpuAbi=x86_64, installer=com.android.vending; app khởi động và Google OAuth vào Picket thành công.
- Màn gói nhận cả bốn giá VN từ Play: Plus tháng 19.000đ/năm 199.000đ; Pro tháng 49.000đ/năm 499.000đ. Không còn not-found trên máy ảo. Điều này chưa giải thích chắc chắn nguyên nhân catalogue trên Redmi 7 trước đó.
- Mở Plus tháng: hộp thoại Google hiển thị **Test card, always approves**, **This is a test subscription / You will not be charged**, chu kỳ test 5 phút. Xác nhận chỉ phương thức test; Play báo Payment successful.
- Sau khi đóng màn Google bổ sung xác minh bằng Back, Picket hiển thị thông báo đã đóng cửa sổ thanh toán và còn Free. Chọn **Khôi phục giao dịch** xác minh thành công, giao diện thành **PLUS, OCR cloud 30/30 lượt/24 giờ**. Vì vậy không đánh dấu callback tự động sau purchase là PASS; restore recovery đạt.
- Server đọc lại play_purchases xác nhận picket_plus_monthly/plus/active=true, không in user ID, token hoặc token hash. Cold restart Picket và mở lại màn gói vẫn PLUS/30. Đây là quyền từ server, không staff grant hay sửa DB giả purchase.

## Chưa nghiệm thu

- Direct callback khi Google hiện thêm màn purchase-verification onboarding; cần tránh mất sự kiện/giải thích restore rõ hơn và kiểm thử lại không dựa vào thao tác Back.
- Acknowledgement từ Android Publisher chưa được đọc lại độc lập; restore success/finish không thay thế bằng chứng ack API.
- Gia hạn, hết hạn, cancel, refund/revoke, grace/hold, decline/pending, mất mạng giữa verify, chuyển chủ tài khoản và ba SKU còn lại chưa chạy đầy đủ bằng giao dịch Play.
- Lệnh mở subscription management qua ADB bị automatic approval review từ chối: `blocked by policy`. Không đổi đường dẫn để vượt block, không giả kết quả cancel/lifecycle.
- Giao dịch là subscription test, có auto-renew vòng đời nhanh do Play. Không có giao dịch thẻ thật. Chủ dự án có thể quản lý test subscription trong CH Play bằng tài khoản tester.

## Source và kiểm tra

Code 21 chứa sửa unfetched catalogue (ẩn placeholder not-found/no-offers-available/unknown, giữ retry; làm mờ nút disabled) đã đạt RED→GREEN, 24 Billing tests, 917 mobile tests, lint/typecheck ở lượt trước. Lượt này chỉ tăng app version/code và thêm ABI khi build; release preflight và build/signature/manifest/native-library verification đạt. APK/AAB giữ ngoài Git trong `.artifacts/releases/`.

Evidence riêng tư: `.artifacts/emulator-billing-20261027/` gồm build, xác minh AAB, upload/readback, UI XML checkout/test-success/restore/cold-restart và server summary. Không đưa email tester, OAuth session hoặc purchase token vào repository.

Nguồn hiện hành: [trạng thái](../PROJECT_STATUS.md), [backlog](../BACKLOG.md), [thiết kế](../../PICKET-DESIGN.md). [Google Billing test](https://developer.android.com/google/play/billing/test?hl=en).
