# Kế hoạch: cài đặt chế độ xác thực (Email / SMS qua Firebase) trên Admin

Ngày lập: 14/11/2026. Trạng thái: đã triển khai trên nhánh `feat/verification-otp-first` (15/11/2026).

## 0. Quyết định đã chốt (15/11/2026)

- Mặc định chỉ bật Email; SMS (Firebase) bật khi cần trên trang admin.
- Cả hai kênh gửi mã 6 số. **Xác minh OTP trước, sau đó bắt buộc tạo mật khẩu và nhập lại mật khẩu.**
  - Email: `signInWithOtp` (cờ `user_metadata.password_setup_required=true`) → `verifyOtp(type:'email')` → màn tạo mật khẩu (`updateUser`). Web chặn ở `proxy.ts`, mobile chặn ở `_layout.tsx` cho tới khi đặt mật khẩu.
  - SMS: `POST /v1/auth/phone-signup {action:'start'}` → Firebase gửi mã → nhập mã → tạo mật khẩu → `{action:'complete', idToken, password}`; API tạo tài khoản `phone_confirm` và trả phiên.
- Phiên của tài khoản chỉ có số điện thoại lấy bằng `grant_type=password` theo số điện thoại, nên **khi bật SMS phải bật Phone provider trong Supabase** và bật hook `public.hook_before_user_created` để chặn đăng ký phone/email trực tiếp không qua API.
- Giao diện theo Figma `lsFg1djrVqCvdpP5Kr8KqH` (web: trang "Web" 01/27/29/28; mobile: A8/A9/A10 + A5 cho tạo mật khẩu).
- Firebase project: `picket-510311` (thêm vào Google Cloud project sẵn có), SMS chỉ cho phép VN, 3 số test lưu ở `.artifacts/firebase-test-phones.txt` (không commit).

## 1. Mục tiêu

- Admin bật/tắt từng kênh xác thực khi đăng ký: **Email** (Supabase OTP, như hiện tại) và **SMS** (Firebase Phone Auth).
  - Chỉ bật Email: giữ nguyên luồng hiện tại.
  - Chỉ bật SMS: người dùng mới phải xác minh số điện thoại bằng SMS.
  - Bật cả hai: người dùng tự chọn kênh.
  - Luôn phải bật ít nhất một kênh. Mặc định: chỉ Email.
- Server là nơi quyết định cuối; giao diện chỉ đọc cấu hình để hiển thị.
- Supabase vẫn là hệ thống định danh duy nhất. Firebase chỉ dùng để gửi và kiểm tra mã SMS, xong thì xoá người dùng Firebase.
- Bản 1.0.x / 1.1.0 đã cài phải tiếp tục chạy.

## 2. Hiện trạng liên quan (đã rà mã nguồn)

| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| Điều kiện "đã xác minh" | `picket_private.account_access()` trong `supabase/migrations/20261103173421_payos_auth_permissions.sql:52-55` | Chấp nhận `email_confirmed_at` **hoặc** `phone_confirmed_at` của `auth.users` |
| Middleware API | `apps/api/routes/v1/_middleware.dart:13-31` | Miễn `/v1/auth/*`; mọi route khác cần tài khoản đã xác minh |
| Bảng số điện thoại | `public.user_contact_methods` (`20261105200000_contact_methods_otp.sql`) | `verified_via in ('none','sms','legacy_auth')` |
| OTP SMS cũ | `apps/api/lib/src/otp/otp_service.dart`, `sms_provider.dart` (SpeedSMS) | Production chưa bật (`OTP_CHANNELS` không đặt) |
| Kênh công khai | `GET /v1/auth/channels` (`routes/v1/auth/channels.dart`) | Trả `{email, sms, order}`, đọc từ env, cache 300 giây; chưa client nào gọi |
| Đăng ký web | `web/src/app/register/register-form.tsx` | Gọi `supabase.auth.signUp` từ trình duyệt; tab số điện thoại luôn hiện |
| Đăng ký mobile | `apps/mobile/src/app/(auth)/register.tsx`, `features/auth/auth-context.tsx:262-286` | Bắt buộc email; số điện thoại lưu tạm trong `pending_phone` |
| Mẫu cài đặt admin | Plan limits: `20261113120000_plan_limits.sql`, `routes/v1/admin/plan-limits.dart`, `web/src/features/admin/payment-actions.ts:181-199`, `views/customers.tsx:242-270` | Bảng riêng + `revision` + audit + quyền MFA, sẽ chép theo |
| Lỗ hổng | `auth_phone_lookup` (`20261105200000_contact_methods_otp.sql:62-69`) | Cho đăng nhập bằng số **chưa xác minh** |

## 3. Thiết kế

### 3.1 Cơ sở dữ liệu (migration mới)

- Bảng singleton `public.auth_verification_settings`:
  `id boolean primary key default true check (id)`, `email_enabled boolean not null default true`, `sms_enabled boolean not null default false`, `sms_provider text not null default 'firebase' check (sms_provider in ('firebase'))`, `revision int`, `updated_by uuid`, `updated_at timestamptz`, `check (email_enabled or sms_enabled)`.
- Bảng audit `public.auth_verification_settings_audit` (before/after, lý do, người sửa). RLS bật, thu hồi quyền `anon`/`authenticated`.
- Quyền mới trong `permission_catalog`: `auth.verification.manage`.
- RPC:
  - `auth_verification_settings_get()`: cho admin có quyền, trả cả `revision`.
  - `auth_verification_settings_save(p_email, p_sms, p_revision, p_reason)`: `permission_require('auth.verification.manage', true)` (bắt MFA), khoá `for update`, sai revision thì `PT409`, ghi audit.
  - `picket_private.auth_verification_public()`: trả `{email, sms}` cho API, có giá trị dự phòng khi bảng trống.
- Số điện thoại:
  - Nới CHECK `verified_via` thêm `'firebase'`; thêm tham số `p_via` cho `contact_mark_phone_verified` (mặc định `'sms'` để tương thích).
  - Sửa `auth_phone_lookup`: chỉ trả tài khoản có số **đã xác minh**. Đây là sửa lỗi bảo mật, làm độc lập trước.
  - Quy tắc tranh chấp số: số đã xác minh qua Firebase được quyền thu hồi số đó khỏi tài khoản khác đang giữ ở trạng thái chưa xác minh.
- Không đổi `account_access()`: luồng SMS sẽ đặt `phone_confirmed_at` trong `auth.users` nên điều kiện cũ vẫn đúng.

### 3.2 API Dart Frog

- `lib/src/firebase/firebase_token_verifier.dart` (mới):
  - Thêm `dart_jsonwebtoken` (3.4.x) vào `apps/api/pubspec.yaml`.
  - Tải chứng chỉ `securetoken@system.gserviceaccount.com`, cache theo `max-age`.
  - Kiểm: `alg=RS256`, `kid`, chữ ký, `iss=https://securetoken.google.com/<projectId>`, `aud=<projectId>`, `exp/iat/auth_time` (lệch tối đa 60 giây), `sub` khác rỗng, `firebase.sign_in_provider == 'phone'`, `phone_number` bắt đầu `+84`, `now - auth_time <= 300`.
  - Chống dùng lại: lưu `sha256(token)` đã dùng trong bảng private, hết hạn sau 1 giờ.
  - Token emulator (không chữ ký) chỉ chấp nhận khi `FIREBASE_AUTH_EMULATOR_HOST` có giá trị **và** không phải production; production mà có biến này thì từ chối khởi động.
- Xoá người dùng Firebase sau khi xác minh: `POST identitytoolkit.googleapis.com/v1/accounts:delete?key=FIREBASE_WEB_API_KEY` với `{idToken}` (không cần service account).
- Route:
  - `GET /v1/auth/channels`: đọc DB thay vì env, **thêm** trường `verification: {email, sms, smsProvider: 'firebase'}`, giữ nguyên `email/sms/order` cho bản cũ; cache giảm còn 60 giây.
  - `POST /v1/auth/signup/phone` (mới, chế độ SMS, chưa có phiên): body `{email, password, phone, firebaseIdToken, turnstileToken?}`.
    1. Kiểm `sms_enabled`; kiểm Turnstile (web) và giới hạn tần suất (`auth_rate_hit`: theo IP, theo số).
    2. Xác minh token, so `phone_number` với `phone`.
    3. Tạo người dùng bằng Admin API `POST /auth/v1/admin/users` với `email`, `password`, `phone`, `phone_confirm: true`, `email_confirm: false`, `app_metadata.signup_via = 'firebase_sms'`.
    4. Ghi `user_contact_methods` (`verified_via='firebase'`).
    5. Đổi mật khẩu lấy phiên (`grant_type=password`, như `phone_login.dart`) rồi trả `{access_token, refresh_token}`.
    6. Xoá người dùng Firebase.
  - `POST /v1/account/phone` thêm `action: 'firebase'` + `idToken`: xác minh số cho người dùng đã đăng nhập (dùng khi bật SMS sau này, hoặc người dùng cũ muốn xác minh số).
  - `GET/POST /v1/admin/verification-settings` (chép `plan-limits.dart`, whitelist chặt khoá body).
- Env mới (`compose.production.yml`, `deploy/.env.production.example`): `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`. Không có secret.

### 3.3 Chặn đăng ký email khi chỉ bật SMS

- Bản app/web mới đọc `/v1/auth/channels` nên không hiện luồng email.
- Bản cũ và client gọi thẳng Supabase vẫn `signUp` email được. Chặn bằng **Supabase Auth Hook "before user created"** (hàm Postgres): khi `email_enabled = false` thì từ chối mọi đăng ký trừ khi `app_metadata.signup_via = 'firebase_sms'` (do API đặt). Cần kiểm lại trên project hosted rằng hook nhận được `app_metadata` khi tạo qua Admin API.
- Khi chuyển sang chỉ SMS, đặt `min_version_code` trong `app_announcements` để buộc bản cũ cập nhật.
- Người dùng đã đăng ký trước không bị ảnh hưởng (đã có `email_confirmed_at`).

### 3.4 Web (Next.js)

- `register/page.tsx`: đọc chế độ ở server, truyền vào form.
- `register-form.tsx`: chỉ Email → như cũ (ẩn tab số điện thoại hoặc giữ là trường phụ); chỉ SMS → form email + mật khẩu + số + nút "Gửi mã"; cả hai → cho chọn.
- `web/src/core/firebase/phone-auth.ts` (mới): Firebase JS SDK (`firebase@13.x`), `RecaptchaVerifier` ẩn, `signInWithPhoneNumber`, `confirm`, lấy ID token rồi gọi `/v1/auth/signup/phone`, cuối cùng `signOut`. Lỗi thì `verifier.clear()`.
- Turnstile giữ nguyên cho API; reCAPTCHA bảo vệ việc gửi SMS. Không bắt giải hai thử thách cùng lúc.
- `csp.ts` + `web/test/csp.test.mjs`: thêm `https://www.google.com/recaptcha/`, `https://www.gstatic.com/recaptcha/`, `https://recaptcha.google.com/recaptcha/`, `https://identitytoolkit.googleapis.com`, `https://securetoken.googleapis.com`, `https://apis.google.com`, `https://<project>.firebaseapp.com`. Thử bằng `Report-Only` trước.
- Admin: thẻ "Xác thực đăng ký" trong `SettingsView` (`views/system.tsx`) hoặc mục riêng; hai công tắc, ô lý do, MFA, cảnh báo khi tắt Email; server action theo mẫu `savePlanLimitAction`; quyền trong `admin-permissions.ts`.
- Env web: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (giá trị công khai).

### 3.5 Mobile (Expo)

- Thêm `@react-native-firebase/app@26.4.2`, `@react-native-firebase/auth@26.4.2`, `expo-build-properties` (minSdk 24). Không lên v27 vì cần Kotlin ≥ 2.4 (repo đang 2.1.20, Expo 57).
- `app.json`: plugin `@react-native-firebase/app`, `@react-native-firebase/auth`; `android.googleServicesFile`. `google-services.json` chứa client cho cả `com.picket.mobile` và `com.picket.mobile.bugqa`, đưa vào `.gitignore`, nạp từ biến môi trường khi build.
- Kiểm keep rule R8 trong `plugins/android/proguard-picket.pro`.
- `features/auth/firebase-phone-verification.ts` (mới): `verifyPhoneNumber(auth, e164, 60, resend)`, xử lý `CODE_SENT`, `AUTO_VERIFIED`, `AUTO_VERIFY_TIMEOUT`, `ERROR`; cờ chống chạy hai lần; không để trạng thái Firebase điều khiển điều hướng; xong thì `deleteUser` + `signOut`.
- `auth-context.tsx`: thêm `signUpWithPhone(email, password, phone)`; `(auth)/register.tsx` đọc chế độ từ `/v1/auth/channels` (cache, có giá trị dự phòng `email`); màn mới `(auth)/verify-phone.tsx` (đếm ngược 60 giây, gửi lại, "Không nhận được mã? Dùng email" khi Email đang bật).
- Bảng lỗi tiếng Việt cho `invalid-phone-number`, `too-many-requests`, `quota-exceeded`, `missing-client-identifier`, `invalid-verification-code`, `session-expired`, `operation-not-allowed`.
- Bản mới cần versionCode > 33 (theo skill `picket-versioning`).

### 3.6 Cấu hình Firebase / Google Cloud (chủ dự án làm)

1. Tạo dự án Firebase (nên tách dev và production). Nâng Blaze, đặt Budget alert (ví dụ 5/20/50 USD).
2. Authentication → bật Phone; SMS region policy chỉ cho **VN**.
3. Thêm tối đa 10 số test (mã khó đoán) cho QA; xoá trước khi bật production.
4. Thêm app Android `com.picket.mobile` (SHA-1/SHA-256 của khoá ký ứng dụng Play, khoá upload) và `com.picket.mobile.bugqa` (khoá ký QA); tải `google-services.json`.
5. Thêm app Web; Authorized domains: `app.picketfinance.com` (localhost không dùng được cho phone auth, dev dùng emulator).
6. Giới hạn API key: Android theo package + SHA; Web theo referrer (`app.picketfinance.com`, `<project>.firebaseapp.com`).
7. Không cần bật Play Integrity trong dự án (Firebase dùng dự án của Google).
8. Sau khi ổn định: cân nhắc bật SMS defense (reCAPTCHA Enterprise, Preview).

### 3.7 Pháp lý và chính sách

- Thêm vào `apps/landing/site/privacy.html` và `terms.html`: số điện thoại được gửi tới Google Firebase (máy chủ tại Mỹ) với vai trò bên xử lý, chỉ để gửi và kiểm mã; PicKet xoá bản ghi Firebase sau khi xác minh; cước nhà mạng có thể áp dụng.
- Play Data safety: Phone number → Collected (Account management, Fraud prevention).
- Hồ sơ đánh giá chuyển dữ liệu xuyên biên giới (Mẫu 09, Nghị định 356/2025).
- Màn hình gửi mã có dòng thông báo trên trước khi bấm "Gửi mã".

## 4. Chống lạm dụng và chi phí

- Firebase: chỉ VN, quota mặc định 3.000 SMS/ngày, Budget alert (không tự chặn).
- API: tối đa 3 lần/số/giờ, 5 lần/IP/giờ, trần toàn hệ thống mỗi ngày (cấu hình trong bảng settings, vượt thì tự trả lỗi và gợi ý Email).
- Web: Turnstile cho API + reCAPTCHA cho Firebase. Mobile: Play Integrity.
- Chi phí: 0,13 USD/SMS sau 10 tin miễn phí mỗi ngày; chỉ xác minh một lần khi đăng ký, không gửi OTP mỗi lần đăng nhập.

## 5. Kiểm thử

- SQL (`supabase/tests/`): RPC get/save (quyền, MFA, revision, audit), CHECK ít nhất một kênh, `auth_phone_lookup` chỉ nhận số đã xác minh, hook before-user-created.
- Dart: verifier (giả lập chứng chỉ, sai `aud/iss/alg/kid`, hết hạn, `auth_time` cũ, provider khác `phone`, dùng lại token, token emulator ở production), route signup/phone (tắt SMS → 403, số không khớp, số đã có chủ), route admin, `channels` vẫn có `email/sms/order`. Cập nhật `apps/api/test/phone_auth_test.dart`.
- api-client: kiểu và method mới.
- Web: `csp.test.mjs`, form theo từng chế độ, server action admin.
- Mobile: policy chọn kênh, ánh xạ lỗi, luồng tự xác minh; QA thực tế trên `com.picket.mobile.bugqa` qua Internal testing với số test, sau đó số thật Viettel/Vinaphone/Mobifone.
- Chạy đủ `npm run test` ở gốc trước khi deploy.

## 6. Thứ tự phát hành

| Bước | Nội dung | Ảnh hưởng người dùng |
|---|---|---|
| 0 | Sửa `auth_phone_lookup` (chỉ số đã xác minh) | Chặn lỗ hổng, không đổi giao diện |
| 1 | Migration settings + API (mặc định chỉ Email) | Không đổi gì |
| 2 | Admin UI trên web | Admin thấy công tắc, SMS vẫn tắt |
| 3 | Cấu hình Firebase, test bằng emulator và số test | Không đổi gì |
| 4 | Web: luồng SMS + CSP | Chỉ hiện khi bật SMS |
| 5 | Mobile bản mới (versionCode > 33) lên Internal testing, QA trên bugqa | Chỉ tester |
| 6 | Bật "Email + SMS" trên admin, theo dõi tỷ lệ gửi thành công và chi phí | Người dùng tự chọn |
| 7 | (Tuỳ chọn) chỉ SMS: bật hook chặn email, đặt `min_version_code` | Bản cũ phải cập nhật |

Không đụng closed testing; production chỉ sau khi Google duyệt quyền phát hành công khai.

## 7. Ước lượng công sức

| Hạng mục | Người-ngày |
|---|---|
| Bước 0 + migration + test SQL | 1,5–2 |
| API (verifier, 3 route, test) | 3–4 |
| api-client | 0,5 |
| Admin UI | 1–1,5 |
| Web luồng SMS + CSP | 2–3 |
| Mobile (native Firebase, màn hình, test) | 4–5 |
| Cấu hình Firebase, chính sách, QA thiết bị | 2–3 |
| **Tổng** | **14–19** |

## 8. Việc cần chủ dự án quyết định

1. Khi bật cả hai kênh, có cho người dùng chọn hay ưu tiên SMS (Email làm dự phòng)?
2. Ở chế độ SMS có còn bắt buộc email không? Đề xuất: **vẫn bắt** (để khôi phục mật khẩu), nhưng không bắt xác minh email.
3. Có dùng chung một dự án Firebase cho dev và production không? Đề xuất: tách hai dự án.
4. Trần SMS mỗi ngày cho toàn hệ thống (đề xuất bắt đầu 100 tin/ngày ≈ tối đa ~12 USD/ngày).

## 9. Điểm còn phải kiểm lại khi triển khai

- Admin API của Supabase hosted có cho đặt `phone` + `phone_confirm` khi provider Phone đang tắt, và `grant_type=password` theo email có chạy với người dùng chỉ có `phone_confirmed_at` không.
- Hook before-user-created có nhận `app_metadata` khi tạo bằng Admin API.
- Cách RNFirebase dựng credential khi xác minh tức thì (không có `code`).
- Danh sách CSP chính xác cho Firebase Auth web (Firebase không công bố chính thức).
- Tỷ lệ SMS Firebase tới được Viettel/Vinaphone/Mobifone (đo bằng số thật).
