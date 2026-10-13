# Picket Expo mobile

Đây là mobile client đích thay thế Flutter legacy trong `../../mobile`.

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

## Chạy

```powershell
npm install
npx expo run:android
```

Ứng dụng dùng native secure storage và sẽ dùng native ML Kit ở giai đoạn OCR,
vì vậy development build là luồng chuẩn; không dùng Expo Go làm tiêu chí release.

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
khôi phục cấu hình signing cục bộ trước khi build lại.

Artifact demo đã kiểm tra được lưu ngoài source tại `.artifacts/releases/` với
hậu tố `arm64-v8a` cho điện thoại thật và `x86_64` cho emulator. Không commit
APK hoặc file signing vào Git.

Màn quét hỗ trợ chọn/chụp, crop và xoay ảnh 90° trước khi chạy lại ML Kit.
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
npm run test:ocr
npm run test:sync
npm run test:ui
npm run release:preflight
npx expo-doctor
```

`release:preflight` chỉ đạt khi đã cung cấp endpoint production public HTTPS;
việc nó thất bại với cấu hình emulator local là hành vi mong đợi.
