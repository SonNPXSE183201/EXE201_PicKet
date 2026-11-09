# Mobile Figma Final UI redesign — trạng thái 06/11/2026

Figma: https://www.figma.com/design/EyBH1sJNAXqUH9auOUk0WI/Picket (trang "Final UI" `0:1`, component `24:114`). Chỉ làm light theme. Nhánh `refactor/redesign-landing-page`, chưa push.

## Đã xong

| Commit | Nội dung |
|---|---|
| `9505fd3` | Token + component Figma dùng chung (`src/core/ui/figma-ui.tsx`), dock mới |
| `4abe7d9` | Nhà (4 trạng thái) |
| `ca9f143` | Onboarding, đăng nhập, khoá app, picker danh mục/ví/ngày (S1–S3) |
| `aae8bbc` | Chi tiêu C1–C9 |
| `d4e84bc` | Chụp hoá đơn D0–D5, Dự định E1–E3 |
| `cb5b7bb` | Quản lý G1–G11 |
| `04a27bd` | Tài khoản, sao lưu, giao diện, Bản thử |
| `1993f9d` | Font Nunito 1 họ 4 độ đậm (native, `app.json` plugin `expo-font`), chặn font scale < 1, bỏ ripple chữ nhật |
| `50dff6f` | Ô nhập, tránh bàn phím, dock, kéo để làm mới, lướt trái |
| `71b9b57` | Răng cưa giấy theo Figma, lướt trái cho Hoá đơn/Định kỳ/Thông báo, header |
| `4c70dbc` | Sửa nhãn "Tổng số dư" bị cắt |

Kiểm tra lúc dừng: `tsc` sạch, lint sạch, `npm run test:mobile` 1049 pass / 0 fail.

## Việc còn lại

1. Nút cố định ở đáy (vd. "Lưu" ở Thêm giao dịch) vẫn bị bàn phím che — cần chỉnh native (`softwareKeyboardLayoutMode`/edge-to-edge) và build lại APK.
2. Chưa kiểm tra trên máy: D4 đã lưu, D5 chi tiết hoá đơn, thẻ túi, Nhà khi tuần trống (`84:1445`), lướt trái ở Hoá đơn/Định kỳ/Thông báo, trạng thái nút đang tải.
3. Rà soát tiếp spacing/typography các màn còn lại so với Figma.

## Frame chưa làm được vì app thiếu tính năng

A9/A10 (OTP SMS), G14 so sánh 2 hoá đơn, H1–H4 bố cục, G11 "Đã là Pro" riêng, nút PIN, đổi ảnh đại diện, chia sẻ/lưu hoá đơn, cỡ chữ, giảm chuyển động.

## Thay đổi hành vi cần review

- Chi tiêu mặc định hiện tháng hiện tại (trước: toàn bộ).
- C5 khoá "Chuyển tiền" khi vượt số dư ví nguồn.
- C7 "Gộp làm một" lưu trữ giao dịch trùng; "Giữ cả hai" chỉ ẩn trong phiên.
- Xuất dữ liệu (`.picket`/JSON/CSV) chuyển từ Hồ sơ sang màn Sao lưu (guard an toàn giữ nguyên, test qua).
- S3 chọn ngày phải bấm xác nhận.

## Chạy lại bản QA trên điện thoại

1. `cd apps/mobile && npx expo prebuild -p android --no-install`
2. Trong `android/app/build.gradle` đổi `applicationId` thành `com.picket.mobile.bugqa`; `strings.xml` đổi `app_name` thành `Picket QA`; tạo `android/local.properties` với `sdk.dir=$HOME/Android/Sdk`.
3. `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a` (cần `openjdk-21-jdk-headless`).
4. `adb install -r app/build/outputs/apk/debug/app-debug.apk`, `adb reverse tcp:8081 tcp:8081`.
5. `cd apps/mobile && npx expo start --dev-client --port 8081`, mở app Picket QA.

Không cài đè, xoá dữ liệu hay gỡ `com.picket.mobile` (bản production).
