# Billing/restore TDD evidence

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Phạm vi

Luồng Android dùng `expo-iap` trên Expo, Dart API làm façade xác thực và
Supabase Edge Function hiện có làm verifier Google Play. Tier và entitlement
không được lấy từ request của client.

## RED

- `apps/api/test/billing_contract_test.dart` thất bại vì chưa có
  `billing_contract.dart`.
- `apps/mobile/src/features/billing/billing-policy.test.ts` thất bại vì chưa có
  `billing-policy.ts`.
- Checkpoint: commit `8aaa291`.

## GREEN

- Dart contract chỉ nhận bốn product ID đã biết và purchase token tối đa 10.000
  ký tự; field dư hoặc response verifier sai cấu trúc bị từ chối.
- Expo policy luôn gọi server verification trước `finishTransaction`; lỗi verify
  giữ transaction chưa finish để có thể retry.
- Shared TypeScript contract và API client gọi Dart route với timeout 40 giây.
- Màn Expo mua, khôi phục và mở Google Play subscription management; user ID
  được SHA-256 trước khi gửi sang Play Billing làm `obfuscatedAccountId`.

## Điều kiện chưa thể xác minh local

Google Play Billing yêu cầu app được cài từ Play Internal testing bằng license
tester. Trước production verification còn phải cấu hình service account,
deploy `verify-purchase`/`play-notifications`, tạo bốn subscription và kiểm thử
purchase, restore, renewal, cancellation, expiry và refund trên thiết bị thật.

## Kết quả kiểm tra local

- Dart: `dart analyze` sạch, `dart test` đạt 62 test và Dart Frog production
  build thành công.
- Expo: 31 test đạt; TypeScript, ESLint và Expo Doctor 21/21 đều đạt.
- Billing policy: 100% line coverage, 95,83% branch coverage.
- Android debug x86_64 build thành công; Gradle autolink `expo-iap 6.0.1` và
  merged manifest có `com.android.vending.BILLING`.
- APK debug là development artifact khoảng 108 MB, không dùng làm release hay
  bằng chứng Google Play sandbox.
