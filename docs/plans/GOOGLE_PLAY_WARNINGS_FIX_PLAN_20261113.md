# Kế hoạch xử lý cảnh báo của Google Play (13/11/2026)

Nguồn: Play Console → Kiểm thử và phát hành → "Cho lần phát hành tiếp theo", bản 1.0.17 (31). Cả hai cảnh báo **không chặn** việc xin production hay phát hành, nhưng nên sửa trong bản kế tiếp (không sửa chen vào bản đang chạy closed testing).

## Cảnh báo 1. Mức tối ưu hóa mã DEX thấp hơn ngưỡng
- Nguyên nhân (đã xác minh trong code): `apps/mobile/android/app/build.gradle` đọc `android.enableMinifyInReleaseBuilds` mà `gradle.properties` **không đặt**, nên mặc định `false`; `shrinkResources` cũng tắt. Bản release không dùng R8.
- Mục tiêu: bật R8 (thu nhỏ + tối ưu mã) cho bản Play, giảm kích thước (AAB hiện ~118 MB) và đạt ngưỡng của Google.
- Việc cần làm:
  1. Trong `gradle.properties` đặt `android.enableMinifyInReleaseBuilds=true` và `android.enableShrinkResourcesInReleaseBuilds=true`. Chỉ áp dụng cho bản Play, hoặc đặt qua plugin `with-play-store-build`.
  2. Bổ sung `proguard-rules.pro` (hiện 14 dòng) giữ lại các lớp bị phản chiếu: React Native, Expo modules, `rn-mlkit-ocr`/ML Kit, `expo-iap` (Play Billing), Hermes, Supabase/OkHttp nếu cần.
  3. Build `bundleRelease` và kiểm tra bản đã thu nhỏ trên Redmi 7 qua Internal testing (không dùng closed testing): đăng nhập, quét hóa đơn OCR, mua gói thử bằng license tester, thông báo, đồng bộ, xóa tài khoản.
  4. Tải tệp mapping (`mapping.txt`) lên Play Console để đọc được báo cáo lỗi; Console cảnh báo nếu thiếu.
- Rủi ro: R8 có thể cắt nhầm lớp dùng qua phản chiếu → lỗi chạy ngay khi mở tính năng. Vì vậy phải thử đủ các luồng ở bước 3 trước khi đẩy lên closed/production. Quay lại `false` nếu có lỗi chưa giải quyết được.

## Cảnh báo 2. API chế độ tràn viền (edge-to-edge) lỗi thời trên Android 15
- Các API bị nêu: `Window.setStatusBarColor/getStatusBarColor`, `setNavigationBarColor`, `LAYOUT_IN_DISPLAY_CUTOUT_MODE_*`. Nguồn gốc theo báo cáo: `com.facebook.react.modules.statusbar.StatusBarModule` và `WindowUtilKt` (React Native), cùng `com.google.android.material` (`BottomSheetDialog`, `SheetDialog`, `EdgeToEdgeUtils`).
- Tình trạng: dự án đã đặt `edgeToEdgeEnabled=true` và dùng `expo-status-bar`, `expo-system-ui`. Lời gọi lỗi thời nằm **trong thư viện**, không phải trong mã ứng dụng (`src/app/_layout.tsx` chỉ dùng `<StatusBar style>` và `SystemUI.setBackgroundColorAsync`).
- Việc cần làm (theo thứ tự rủi ro tăng dần):
  1. Kiểm tra phiên bản: React Native 0.86.3, Expo ~57.0.30 (Console cho biết có bản 57.0.33), `react-native-screens` ~4.26, `react-native-safe-area-context` ~5.7. Chạy `npx expo install --check` và cập nhật các bản vá thấp nhất; đọc ghi chú phát hành xem đã sửa cảnh báo chưa.
  2. Rà soát mã ứng dụng không gọi `StatusBar.setBackgroundColor`, `setTranslucent` hay API tương đương trên Android; giữ `style` làm cách duy nhất điều khiển thanh trạng thái.
  3. Bottom sheet/modal dùng Material (từ `react-native-screens` hoặc thư viện khác): xác định thư viện nào kéo `BottomSheetDialog`; nếu chỉ là cảnh báo từ Material, chờ bản cập nhật của thư viện đó.
  4. Nếu thư viện chưa có bản sửa, ghi nhận là cảnh báo thượng nguồn: Google không từ chối bản phát hành vì mục này.
- Kiểm tra lại: sau khi phát hành bản mới, mở lại mục "Cho lần phát hành tiếp theo" để thấy cảnh báo đã biến mất hay còn.

## Thứ tự thực hiện đề xuất
1. Chờ đủ 14 ngày closed testing và nộp xin production (không đụng track alpha).
2. Làm nhánh riêng cho R8 + cập nhật Expo; build thử qua Internal testing trên Redmi 7.
3. Chỉ khi mọi luồng chính đạt mới tăng versionCode và đẩy lên closed/production theo quy tắc phát hành của dự án.
4. Không tự bấm "Phát hành thay đổi" trên Console; chủ tài khoản quyết định.

## Trạng thái 13/11/2026 (đã làm, chưa phát hành lên Play)
- R8: plugin `apps/mobile/plugins/with-release-shrinking.js` + `plugins/android/proguard-picket.pro` (đăng ký trong `app.json`, có test `src/features/updates/release-shrinking.test.ts`). Bản release QA arm64 có R8: 73,9 MB → 62,1 MB, mapping.txt được tạo.
- Thử trên Redmi 7 (`com.picket.mobile.bugqa`): mở app, chuyển tab, camera, màn hình gói (đọc hạn mức mới 30/30), OCR ML Kit đọc ảnh thành công (log `OCR process succeeded`), không crash.
- Chưa thử dưới R8: mua gói Google Play (bản QA dùng PayOS). Bắt buộc thử qua Internal testing bằng license tester trước khi đưa bản R8 lên closed/production, và tải mapping.txt lên Play.
- Expo đã cập nhật bản vá (expo 57.0.33 và 10 gói liên quan qua `npx expo install --fix`). Cảnh báo edge-to-edge chỉ kiểm chứng được sau khi Play phân tích bản mới.
