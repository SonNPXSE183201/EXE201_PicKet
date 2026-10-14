# Picket Android — Expo/React Native

Picket Android được triển khai tại `apps/mobile` bằng Expo SDK 57 và React
Native. Repository không còn Flutter hoặc iOS. Backend nghiệp vụ nằm tại
`apps/api` và dùng Supabase cho Auth, PostgreSQL/RLS và Storage.

## Yêu cầu

- Node.js 22 và npm.
- Android Studio, Android SDK 36 và một AVD x86_64.
- JDK 17.
- Dart 3.12 và Dart Frog CLI nếu chạy API local.
- File `apps/mobile/.env.local` tạo từ `.env.example`.

Không đưa service-role key, OCR worker secret, keystore password hoặc database
password vào biến `EXPO_PUBLIC_*`.

## Chạy Android development

```powershell
cd apps/mobile
npm ci
npx expo run:android --device emulator-5554
```

Expo Go không phải môi trường kiểm thử hợp lệ vì Picket sử dụng native ML Kit,
secure storage và Google Play Billing.

Khi API chạy trên máy Windows, AVD dùng `http://10.0.2.2:8080`. Release build
phải dùng API HTTPS public và vượt qua `npm run release:preflight`.

## OCR

- Ảnh hóa đơn được giữ nguyên khung; Image Picker không bật crop cố định.
- Người dùng có thể xoay ảnh 90 độ rồi nhận diện lại.
- ML Kit Latin chạy local trước, kể cả khi offline.
- Chỉ khi người dùng đồng ý, ảnh mới được tải lên vùng private để chạy fallback
  PP-OCR trên máy chủ.
- Kết quả luôn là bản nháp và phải được kiểm tra trước khi lưu.

## Kiểm tra

```powershell
cd apps/mobile
npm run typecheck
npm run lint
npm run test:api
npm run test:auth
npm run test:billing
npm run test:ocr
npm run test:sync
npm run test:ui
npx expo-doctor
```

Các luồng E2E Android ưu tiên Pixel 5 emulator gồm Auth, onboarding, CRUD tài
chính, offline queue, OCR local/fallback, receipt review, export/restore,
accessibility và deep link. Camera vật lý, ARM64, Google Play Billing sandbox và
benchmark máy RAM thấp thật vẫn cần điện thoại Android thật.

## Release

Hướng dẫn signing, build x86_64/ARM64 và preflight nằm trong
[`apps/mobile/README.md`](../apps/mobile/README.md). APK/AAB và keystore không
được commit. Production sử dụng Caddy + Next.js + Dart Frog + OCR worker +
PP-OCR theo [`deploy/VPS_DEPLOYMENT.md`](../deploy/VPS_DEPLOYMENT.md).

Google OAuth cần allow-list `com.picket.mobile://auth/callback`; password reset
cần `com.picket.mobile://auth/reset-password`. Google Play Billing chỉ được
nâng lên `verified` sau khi app được cài từ Internal testing bằng license tester.
