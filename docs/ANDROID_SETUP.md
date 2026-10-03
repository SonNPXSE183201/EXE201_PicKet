# Picket Android — source và triển khai

Source: `mobile/`. Backend: `supabase/`. Chưa build APK/AAB, chưa deploy Functions và chưa chạy SQL lên Supabase của bạn.

## Chức năng đã nối

- Auth email/password, OTP 6–8 số, gửi lại có cooldown, reset password qua deep link và Google OAuth; phiên lưu trong secure storage.
- Onboarding 8 bước; tạo hồ sơ, preferences và ví đầu tiên bằng một RPC nguyên tử.
- Ví, thu/chi/chuyển ví, tìm/lọc, sửa/xóa, thao tác hàng loạt, đối soát, danh sách cần kiểm tra.
- Tách khoản chi theo số tiền/chia đều/phần trăm; hoàn tiền có liên kết và giới hạn theo khoản gốc.
- Danh mục tùy chỉnh; ngân sách, cảnh báo, chuyển hạn mức, chốt tháng/chuyển dư, xem giao dịch theo ngân sách.
- Hóa đơn, thuê bao định kỳ, ghi nhận thanh toán, nhắc hạn Android.
- Camera/thư viện và ML Kit OCR trên thiết bị; kiểm tra kết quả trước khi lưu.
- Món đồ, ghi chú, danh mục, bảo hành/đổi trả, tìm kiếm và chia sẻ Android.
- Báo cáo tính cả phân bổ/hoàn tiền; CSV; backup AES-GCM có mật khẩu và ảnh; khôi phục có xác nhận.
- SQLite mã hóa payload, cloud sync có revision và xử lý xung đột.
- Google Play mua/khôi phục, server verification/acknowledgement, RTDN.
- Admin có phân quyền: người dùng, sổ đã đồng bộ, khóa/mở, email reset, ưu đãi 30 ngày, OCR, đối tác, bảo trì và audit.
- Xóa tài khoản sau khi xác thực lại; phải hủy gia hạn Google Play riêng.

Phương pháp ngân sách là lựa chọn cách tổ chức; hạn mức danh mục do người dùng đặt. Gói đã xác minh điều khiển trạng thái gói và ẩn nội dung đối tác. Các lời hứa marketing về AI tài chính, chia sẻ vòng tròn, kết nối ngân hàng và hỗ trợ 24/7 không được giả lập thành dịch vụ thật trong bản này.

## 1. Supabase project mới

1. Tạo project và lưu database password riêng.
2. Cài Supabase CLI, chạy `supabase link --project-ref YOUR_NEW_PROJECT_REF`, sau đó chạy `supabase db push`. Thư mục `supabase/migrations` là nguồn schema chính; không chạy thêm file schema gộp sau khi đã dùng CLI.
3. Schema có 15 bảng chuẩn hóa: profile, preferences, wallet, category, transaction, split, budget, budget period, bill, subscription, keepsake, receipt, month close, reconciliation và reminder. Flutter và Dart Frog dùng RPC nguyên tử để đọc/ghi các bảng này; bảng snapshot cũ chỉ còn để tương thích migration. Tất cả bảng bật RLS theo người dùng.
4. Schema tạo bucket private `picket-media`, giới hạn 10 MB/ảnh JPEG, PNG hoặc WebP. Không đổi bucket thành public.
5. Bật email/password và email confirmation; cấu hình SMTP production. Nếu dùng OTP nhập trong app, template email xác nhận cần chứa token OTP.
6. Thêm redirect URL `com.picket.mobile://auth/callback` trong Authentication → URL Configuration.
7. Trong Authentication → Providers → Google, bật provider và nhập Web Client ID/Secret từ Google Cloud. Ở Google Cloud, thêm `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` vào Authorized redirect URIs. Luồng hiện tại dùng OAuth PKCE qua trình duyệt rồi quay lại app bằng deep link ở bước 6.
8. Đăng ký tài khoản admin, rồi cấp quyền bằng SQL Editor, thay email dưới đây:

```sql
insert into public.staff_members(user_id)
select id from auth.users where email = 'YOUR_ADMIN_EMAIL'
on conflict do nothing;
```

App không có quyền tự cấp staff. Tạm khóa tài khoản chặn cloud; không xóa dữ liệu ngoại tuyến đã có trên thiết bị.

## 2. Cấu hình app

Sao chép `mobile/config/production.example.json` thành `mobile/config/production.json`. Điền `APP_ENV=production`, `SUPABASE_URL` và `SUPABASE_PUBLISHABLE_KEY` của project mới. Chỉ dùng publishable hoặc legacy anon key; không dùng service-role/secret key trong app.

Cấu hình thật, `.env`, key.properties và keystore đều được gitignore. Chưa có secret tài khoản của bạn trong source. Development không cấu hình Supabase chạy lưu trên thiết bị; dữ liệu development không tự nhập sang tài khoản cloud, có thể chuyển qua backup/restore.

## 3. Edge Functions

Sau khi đăng nhập CLI, từ thư mục repo:

```powershell
supabase link --project-ref YOUR_NEW_PROJECT_REF
supabase functions deploy verify-purchase
supabase functions deploy play-notifications
supabase functions deploy delete-account
supabase functions deploy admin-user-action
```

`config.toml` tắt kiểm JWT ở gateway để handler tự xác minh: user functions dùng `auth.getUser`; webhook dùng Google OIDC. Không bỏ kiểm tra trong handler. Supabase cung cấp service-role key trong environment phía server.

## 4. Google Play

Cần Play Console, package `com.picket.mobile`, track kiểm thử và license tester. Tạo bốn subscription product ID: `picket_plus_monthly`, `picket_plus_yearly`, `picket_pro_monthly`, `picket_pro_yearly`. Mỗi product nên có một base plan tương ứng. Giá, mô tả, trial/offer cấu hình trên Play; app tải giá thật và chỉ nhận tier đã được server xác minh. Không quảng cáo tính năng chưa cung cấp trong mô tả sản phẩm.

Cấp quyền Android Publisher API cho service account, đặt secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` trong Supabase. Không commit JSON khóa này.

Cấu hình Google Play RTDN tới Pub/Sub, authenticated push tới `https://YOUR_PROJECT_REF.supabase.co/functions/v1/play-notifications`. Đặt secrets `GOOGLE_PLAY_RTDN_AUDIENCE` và `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL` đúng audience/email của push. Handler xác minh chữ ký, issuer, audience, email, package rồi truy vấn trạng thái Play. Cache entitlement tối đa 24 giờ; mở app/khôi phục giao dịch xác minh lại. Kiểm thử renewal, cancel, grace period và refund trước khi phát hành.

## 5. Android release — chưa build

Flutter đã dùng: 3.44.4 / Dart 3.12.2. MinSdk ít nhất 24. Đã khai báo deep link, INTERNET, sinh trắc học, notification và boot receiver; FlutterFragmentActivity, AppCompat, desugaring.

Tạo upload keystore riêng, sao chép `mobile/android/key.properties.example` thành `key.properties` và điền thông tin. Release dùng cấu hình ký riêng, không dùng debug signing. Chưa tạo keystore hoặc chạy Gradle/build/upload.

Khi bạn quyết định chạy/build sau này, truyền `--dart-define-from-file=config/production.json` từ thư mục mobile.

Chạy bản development có kết nối Supabase:

```powershell
cd mobile
flutter run -d emulator-5554 --dart-define-from-file=config/production.json
```

Để test Auth thật, lần lượt kiểm tra đăng ký → OTP email → đăng xuất/đăng nhập → quên mật khẩu → deep link → Google. Nếu email không đến, kiểm tra SMTP, template có `{{ .Token }}` và rate limit trong Supabase Auth.

## 6. Kiểm tra và giới hạn

Từ mobile: `flutter pub get`, `flutter analyze --no-pub`, `flutter test --no-pub`.

Từ repo: `npm ci --prefix supabase/tests`, `node supabase/tests/validate.mjs`.

Workflow `.github/workflows/source-validation.yml` kiểm tra format, analyzer, Flutter tests, PostgreSQL cục bộ và Deno types; không build/deploy.

- Financial payload cục bộ mã hóa AES-GCM, khóa trong secure storage. Ảnh nằm trong thư mục app và bucket private; nội dung ảnh cục bộ chưa mã hóa. Cloud dùng RLS, không phải end-to-end encryption.
- Sync gửi một finance contract nguyên tử nhưng lưu xuống 15 bảng chuẩn hóa. Khi hai thiết bị cùng sửa, `expectedRevision` phát hiện xung đột; xuất bản sao ở cả hai rồi chọn bản cần giữ. Có bản recovery mã hóa trước khi giải quyết xung đột.
- Chốt tháng khóa giao dịch của kỳ; chưa có thao tác mở lại. Backup tối đa 50 MB ảnh; cloud payload tối đa 10 MB.
- OCR telemetry chỉ lưu trạng thái/thời gian/user ID, không lưu nội dung/ảnh hóa đơn; số liệu ngoại tuyến có thể chưa gửi.
- Chưa kiểm thử native camera, OCR, secure storage, biometrics, deep links, notification/reboot và Google Play trên thiết bị, vì chưa build Android theo yêu cầu. Chưa kiểm thử Supabase live.
- Đây là sổ thu chi; ghi chuyển ví hoặc thanh toán hóa đơn không chuyển tiền ngân hàng.

Tham khảo: [Supabase Auth](https://supabase.com/docs/guides/functions/auth-legacy-jwt), [Google Play security](https://developer.android.com/google/play/billing/security), [Subscription API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2).
