# Picket Flutter legacy

> **Frozen:** Không thêm feature hoặc business rule mới vào ứng dụng này.
> Chỉ chấp nhận sửa lỗi bảo mật, crash hoặc nguy cơ mất dữ liệu cho đến khi Expo
> hoàn tất cutover. Mobile client đích nằm tại `../apps/mobile`.

Flutter Android implementation based on Picket.MockUI. See `../docs/ANDROID_SETUP.md` for functionality, Supabase schema, Google Play configuration, signing and native verification.

```powershell
flutter pub get
flutter analyze --no-pub
flutter test --no-pub
```

No Android build or deployment has been performed. Production values belong in ignored `config/production.json`, copied from `config/production.example.json`. Release signing uses a private upload keystore configured in ignored `android/key.properties`.

Feature modules hiện có được giữ làm chuẩn hành vi cho quá trình chuyển đổi.
Theo dõi trạng thái chuyển từng luồng tại
`../docs/migration/FEATURE_PARITY.md`.
