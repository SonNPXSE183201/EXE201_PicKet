# Plan hoàn thiện mobile — 05/11/2026

Nhánh `fix/mobile-completion-plan` (tách từ `fix/mobile-payos-qa`). Thứ tự: làm trước các việc **chỉ cần code và test**, sau đó đến việc **cần chủ dự án quyết định hoặc thao tác**. Kết quả quét: không còn TODO/FIXME hoặc nút rỗng; phần chưa xong nằm ở route preview chỉ chạy dev, màn bị bỏ rơi, màn stub và chuỗi chưa qua i18n.

## Đợt A — PayOS theo góp ý người hướng dẫn ✅ đã code, chưa deploy

Chi tiết: [PAYOS_EXPIRY_HARDENING_PLAN_20261105.md](PAYOS_EXPIRY_HARDENING_PLAN_20261105.md).

- Gửi `expiredAt = now + 900` lúc tạo link và lưu đúng hạn đó (`payment_attach`). Đơn đặt chỗ đã quá hạn thì không mở link mới.
- Mỗi lần mua dùng một orderCode mới. Còn link cũ thì hủy link cũ ở PayOS trước (GET trước khi hủy; nếu link cũ đã PAID thì mở gói và không tạo link mới).
- Tiền vào sát hoặc sau giờ hết hạn, kể cả sau khi đã hủy: đủ tiền ⇒ ghi giao dịch và mở gói. Đã có gói ⇒ `Cần đối soát` để hoàn tay.
- Đánh dấu hết hạn chỉ sau khi GET PayOS. Đơn chưa có link mà quá hạn thì tự đóng. Worker đối soát PayOS mỗi 60 giây (trước đây 5 phút).
- Doanh thu chỉ cộng đơn `Đã thanh toán`; tiền cần đối soát hiển thị riêng.
- Mobile và web có đồng hồ đếm ngược `mm:ss`. Hết giờ thì tự kiểm tra lại, hiện `Đang xác minh`, sau đó `Hết hạn` hoặc `Đã thanh toán`. Bấm mua khi còn link mở thì phải xác nhận hủy link cũ.
- Admin hiển thị nhãn tiếng Việt; pending quá 15 phút hiển thị `Đang xác minh`.

Kiểm tra: SQL 17 suite PASS (thêm `payos-expiry-hardening`); API 171 PASS và `dart analyze` sạch; mobile 1067 PASS, typecheck và lint billing sạch; web test 61 PASS, typecheck và lint sạch; worker 6 PASS.

## Đợt B — Mobile, chỉ cần code (làm tiếp theo)

| # | Việc | File chính | Ghi chú |
| --- | --- | --- | --- |
| B1 | Màn `register` đang là stub nhưng màn login vẫn có link “Đăng ký”: tạm ẩn link và bỏ chữ “số điện thoại”, **hoặc** làm form đăng ký email/mật khẩu (đã có `verify-email.tsx` xác thực OTP email) | `app/(auth)/register.tsx`, `app/(auth)/login.tsx` | Cần chọn 1 trong 2 (xem câu hỏi) |
| B2 | Màn Keepsakes đã hoàn chỉnh nhưng không có đường vào: thêm mục ở Hồ sơ/Kế hoạch và chuyển sang i18n | `app/keepsakes.tsx`, `core/navigation/routes.ts` | |
| B3 | i18n các màn còn chuỗi cứng: capture (~31), receipts/[id] (~27), keepsakes (~23), onboarding (~16), receipt-camera (~11), review-inbox (~10), insights (4), `api-error-message.ts` | | Theo mẫu `*-locales.test.ts` |
| B4 | Gom feature flag thành module có kiểu (`core/config/feature-flags.ts`); ghi đủ `EXPO_PUBLIC_LEARNING_CLOUD_ENABLED`, `EXPO_PUBLIC_QA_OCR_CORPUS` vào `.env.example` | | Không bật flag nào |
| B5 | Xóa `settings-preview.tsx` (màn nghiệm thu dev, dữ liệu mẫu) | | |
| B6 | Chuyển cashflow, learning và weekly-story từ `__DEV__` sang route thật, chặn bằng flag (mặc định tắt) để sau này chỉ cần bật | `app/*-preview.tsx` | Bật flag là quyết định riêng ở đợt C |
| B7 | Test ma trận dữ liệu: thống kê có thu nhập/hoàn tiền/chia khoản, xung đột bulk-edit, UI từ chối sửa tháng đã khóa | | Theo BACKLOG |

## Đợt C — Cần chủ dự án quyết định hoặc thao tác

| # | Việc | Cần gì từ bạn |
| --- | --- | --- |
| C1 | Gói sáng lập 99k cho 100 người đầu (catalog có giới hạn suất, đơn pending giữ suất trong 15 phút) | Tier, thời hạn, ngày mở/đóng ưu đãi |
| C2 | Deploy migration `20261105090000`, API, web và worker lên VPS production | Đồng ý deploy (mình tự SSH được) |
| C3 | QA tiền thật trên Redmi (`com.picket.mobile.bugqa`): trả trong hạn, để hết hạn, hủy, mua lại khi còn link cũ, quét QR cũ | Thao tác thanh toán và điện thoại |
| C4 | Bật cashflow/learning/AI trên cloud | Dữ liệu backtest, duyệt và publish nội dung |
| C5 | Đồng bộ cloud cho giao diện túi | Đồng ý phạm vi (cần migration và API) |
| C6 | OTP/SMS: đăng ký, khôi phục, đổi SĐT | Nhà cung cấp SMS và credential |
| C7 | Nghiệm thu thiết bị: OCR thật, ảnh hóa đơn cloud trên 2 máy, backup/restore có ảnh, thông báo, TalkBack | Điện thoại thật |
| C8 | Phát hành Google Play beta/production, APKPure | Store console |
