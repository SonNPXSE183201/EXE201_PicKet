# Picket Expo mobile

Hiện trạng phát hành và ca nghiệm thu còn mở: [PROJECT_STATUS.md](../../docs/PROJECT_STATUS.md). Landing public là **1.0.4/code 5 ARM64**. Không dùng APK QA có proxy/fixture cho điện thoại người dùng hoặc landing. [Checklist Android thật](../../docs/ANDROID_REAL_DEVICE_CHECKLIST.md) và [cấu hình Play](../../docs/GOOGLE_PLAY_SANDBOX_TO_PRODUCTION.md) là nghiệm thu riêng, chưa suy đạt từ emulator.

[Checklist phần 1 máy ảo](../../docs/migration/PART1_ACCEPTANCE_20261022.md) đã đạt ngày 22/10; 415 mobile tests PASS. Đo hiệu năng dùng QA không debug riêng; APK QA debug phục vụ fault/run-as không phải số đo production. Cả hai đều không phải bản ARM64 công khai.

Đây là Android client chính thức của Picket. Dự án không còn duy trì Flutter
hoặc iOS trong repository này.

## Cấu hình local

Sao chép `.env.example` thành `.env.local` và điền:

- `EXPO_PUBLIC_API_URL`: URL Dart API mà emulator/thiết bị truy cập được.
- `EXPO_PUBLIC_SUPABASE_URL`: URL public của Supabase project.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key, không dùng secret key.
- `EXPO_PUBLIC_OCR_FALLBACK_ENABLED`: đặt `true` khi OCR worker production đã sẵn sàng.

Supabase Auth phải allow redirect URL:

```text
com.picket.mobile://auth/callback
com.picket.mobile://auth/reset-password
```

Google OAuth dùng chung provider của Supabase với web; cấu hình từng nơi và
callback tương ứng được liệt kê trong
[GOOGLE_OAUTH_SETUP.md](../../docs/migration/GOOGLE_OAUTH_SETUP.md).

## Chạy

```powershell
npm install
npx expo run:android
```

Ứng dụng dùng native secure storage, ML Kit OCR, mã hóa backup và trình xác minh APK,
vì vậy development build là luồng chuẩn; không dùng Expo Go làm tiêu chí release.
`expo-iap` cũng là native module nên màn thanh toán không hoạt động trong Expo Go.

## Cập nhật trong app

Cá nhân → Ứng dụng → Kiểm tra cập nhật. Footer lấy versionName/versionCode thực từ Android, không lấy phiên bản server. APK được kiểm tra hash, kích thước, package, phiên bản và chữ ký trước khi mở xác nhận Android. Không cần gỡ app; bản trước 1.0.3 cần một lần cài đè bootstrap. Google Play và sideload là hai kênh riêng; cài qua ADB không chứng nhận luồng cập nhật qua UI đã nghiệm thu.

## Google Play Billing

Màn Hồ sơ mở màn `Gói Picket và thanh toán`, tải bốn subscription từ Google
Play, mua/khôi phục giao dịch và mở trang quản lý subscription. Client gửi
`productId` cùng `purchaseToken` tới Dart API; không tự tin cậy tier, giá hoặc
trạng thái từ thiết bị. Transaction chỉ được finish sau khi server trả
`verified: true`.

Để kiểm thử thật cần:

- tạo đúng bốn product `picket_plus_monthly`, `picket_plus_yearly`,
  `picket_pro_monthly`, `picket_pro_yearly` trong Play Console;
- upload một Android App Bundle vào Internal testing, khai báo license tester
  và cài app từ link Google Play bằng đúng tài khoản tester;
- deploy Supabase Edge Function `verify-purchase` với secret
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, đồng thời cấp quyền Android Publisher cho
  service account;
- dùng development/release build có `expo-iap`; emulator hoặc APK sideload
  không phải bằng chứng hoàn tất sandbox lifecycle.

Sau khi thêm/nâng `expo-iap`, chạy `npx expo prebuild --platform android` rồi
build lại native app. Không gọi `finishTransaction` khi Dart API chưa xác minh,
để Google Play còn có thể phát lại giao dịch sau lỗi mạng.

## Kiểm tra và đóng gói Android release

Bản release không cho phép HTTP cleartext. `EXPO_PUBLIC_API_URL` phải là endpoint
Dart API public dùng HTTPS; `10.0.2.2`, localhost và IP LAN chỉ dùng development.
Trước mỗi lần đóng gói, đặt biến production thật rồi chạy gate:

```powershell
$env:NODE_ENV = "production"
$env:EXPO_PUBLIC_API_URL = "https://api.your-domain.example"
$env:EXPO_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "YOUR_PUBLISHABLE_KEY"
$env:EXPO_PUBLIC_OCR_FALLBACK_ENABLED = "true"
npm run release:preflight
```

Gate sẽ dừng nếu URL không phải public HTTPS hoặc nếu client bị cấu hình nhầm
Supabase secret/service-role key. Publishable/anon key được phép dùng trong app;
không đưa password keystore hoặc server secret vào biến `EXPO_PUBLIC_*`.

React Native New Architecture có thể tạo object path dài hơn giới hạn Windows.
Nếu build ARM64 từ đường dẫn repo đầy đủ báo `Filename longer than 260
characters`, dùng ổ tạm ngắn và gỡ ánh xạ sau khi build:

```powershell
cmd /c "subst P: D:\EXE201\Project"
cd P:\apps\mobile\android
$env:NODE_ENV = "production"
.\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
cd D:\EXE201\Project
cmd /c "subst P: /D"
```

APK nằm tại
`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`. APK ARM64
dùng cho đa số điện thoại Android thật và không cài được lên emulator x86_64.
Release phải ký bằng upload keystore của Picket, không dùng debug keystore. File
`android/` là output native bị ignore; nếu chạy `expo prebuild --clean`, phải
tạo `apps/mobile/key.properties` cục bộ (file này bị gitignore) với
`storeFile`, `storePassword`, `keyAlias`, `keyPassword`. Config plugin sẽ áp lại
release signing sau mỗi lần prebuild; khi file không tồn tại, release để unsigned
chứ không tự hạ xuống debug key. Sao chép `key.properties.example` để lấy đúng
định dạng và dùng dấu `/` trong đường dẫn Windows.

Artifact demo đã kiểm tra được lưu ngoài source tại `.artifacts/releases/` với
hậu tố `arm64-v8a` cho điện thoại thật và `x86_64` cho emulator. Không commit
APK hoặc file signing vào Git.

Màn quét hỗ trợ chọn/chụp ảnh nguyên khung và xoay ảnh 90° trước khi chạy lại
ML Kit. Không bật crop cố định vì có thể cắt mất phần tổng tiền của hóa đơn dài.
Sau khi thêm hoặc nâng cấp module native như `expo-image-manipulator`, cần tạo
lại development build bằng `npx expo run:android` trước khi kiểm thử.
Parser OCR có corpus tổng hợp, không chứa dữ liệu người dùng, cho các kiểu hóa
đơn Việt Nam phổ biến. Ảnh hóa đơn thật dùng để QA phải được ẩn danh trước khi
đưa vào bộ test của dự án.

Dart API request có timeout mặc định 12 giây để ứng dụng chuyển sang queue
SQLite khi server mất kết nối. Restore và xóa tài khoản dùng timeout 35 giây vì
đây là các thao tác server dài hơn. Queue được tách theo user và tồn tại qua
force-stop/app restart.

Màn Hồ sơ có thể tạo file `picket-export-v1` qua Dart API và mở native share
sheet. Màn Khôi phục chọn JSON bằng document picker, validate/dry-run trước,
hiển thị thống kê rồi yêu cầu nhập chính xác `RESTORE`. Restore dùng optimistic
revision và transaction phía database. File vẫn chứa dữ liệu tài chính nhạy cảm
và chưa phải bản backup mã hóa.

Xóa tài khoản yêu cầu nhập chính xác `DELETE` và đăng nhập lại trong vòng 5 phút.
Client gọi Dart API; chỉ Supabase Edge Function giữ quyền admin để xóa media và
Auth user. Luôn kiểm thử bằng tài khoản riêng trước khi phát hành.

Các mutation tài chính được lưu trong SQLite khi Dart API không kết nối được.
Create account/category/budget/transaction/transfer/refund dùng idempotency key;
update/archive dùng optimistic version. Xung đột không bị retry vô hạn mà xuất
hiện tại màn `sync-conflicts`, trong đó bản máy chủ được giữ để tránh ghi đè.

Mọi nút tương tác trong `src/app` đi qua `AccessiblePressable`, mặc định có
semantic role `button`, trạng thái disabled được công bố cho screen reader và
vùng chạm tối thiểu 48 x 48 dp. Các nhóm chọn loại tài khoản, danh mục, loại
giao dịch và tài khoản chuyển tiền dùng `radiogroup`/`radio` cùng trạng thái
`checked`. Khi thêm màn hình mới, không import `Pressable` trực tiếp từ
`react-native`; `npm run test:ui` kiểm tra chính sách này.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm run test:api
npm run test:auth
npm run test:billing
npm run test:ocr
npm run test:sync
npm run test:ui
npm run release:preflight
npx expo-doctor
```

`release:preflight` chỉ đạt khi đã cung cấp endpoint production public HTTPS;
việc nó thất bại với cấu hình emulator local là hành vi mong đợi.
