# Picket Expo mobile

Hiện trạng: [PROJECT_STATUS.md](../../docs/PROJECT_STATUS.md). Source là **1.0.14/code 28**; Google Play Internal và closed testing (`alpha`) đều đọc lại `completed`, rollout 100%. Landing public cũng đang công bố APK 1.0.14/code 28. Beta/production Google Play chưa có release; APKPure có artifact code 28 nhưng trạng thái nộp/duyệt chưa xác minh. Xem [readback cửa hàng ngày 01/11](../../docs/migration/STORE_RELEASE_READBACK_20261101.md). Các kết quả test Pixel, mobile và merge bên dưới là checkpoint theo ngày trong từng báo cáo; thiết bị thật vẫn cần nghiệm thu riêng bằng package QA `com.picket.mobile.bugqa`.

Đây là Android client chính thức của Picket. Dự án không còn duy trì Flutter
hoặc iOS trong repository này.

Thiết kế chuẩn: [PICKET-DESIGN.md](../../PICKET-DESIGN.md).

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

## Build AAB cho Google Play

Đặt `PICKET_PLAY_BUILD=1` ở cả bước prebuild và Gradle. Biến này loại module
cài APK `picket-app-updates`, chặn quyền cài APK/hiển thị đè và thay nút cập nhật
bằng liên kết Google Play. Endpoint trong `.env.local` phải là production HTTPS.

Chạy trong `apps/mobile`:

```powershell
$env:PICKET_PLAY_BUILD='1'
$env:NODE_ENV='production'
npm run release:preflight
npx expo prebuild --platform android --clean --no-install
```

Sau đó build `:app:bundleRelease` với upload keystore đã cấu hình. Trên Windows,
dùng ổ subst và `scripts/windows-release.init.gradle` như hướng dẫn build release
bên dưới. AAB nằm ở `android/app/build/outputs/bundle/release/app-release.aab`.
Kiểm tra manifest cuối không có `REQUEST_INSTALL_PACKAGES` hoặc
`SYSTEM_ALERT_WINDOW` trước khi upload. Mỗi lần upload mới phải tăng versionCode.

Để cùng bản Internal hỗ trợ máy thật ARM64 và máy ảo CH Play x86_64, truyền
`-PreactNativeArchitectures=arm64-v8a,x86_64` cho Gradle. Kiểm tra AAB có
`libreactnative.so` ở cả hai ABI. Việc máy ảo công bố hỗ trợ dịch ARM64 không
đảm bảo React Native ARM64 chạy được trên máy ảo đó; không dùng cài thành công
làm bằng chứng ứng dụng đã khởi động. APK landing ARM64 vẫn là artifact riêng.

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

## Settings foundation (SET-01–03)

Progress and evidence: [implementation report](../../docs/plans/MOBILE_SETTINGS_IMPLEMENTATION_20261023.md).
The development-only `/settings-preview` route exercises theme/language storage,
semantic colors and offline vi/en formatting. Rebuild the native development app
after installing Localization/SystemUI; an older APK cannot load these modules.
Production entry remains disabled until the screen migration is verified.
Run `npm run test:settings` to validate the foundation. Code 7 AAB was built before
this increment and does not include it.

The development-only `/learning-preview` now includes persistent 7/30-day review
tasks. Repeated reviews do not grant lesson XP again. Old undated completions
remain readable; they do not acquire an invented completion date.

The development-only `/cashflow-preview` stores owner-scoped schedules in the
encrypted offline cache. It supports recurrence, optional end dates, enable/
disable, 7/30-day explicit scenarios and a separate assumed purchase. Amounts on
this screen are integer minor units. Opening balance is an explicit assumption;
the screen does not infer ledger completeness or post any transaction.

Experimental F1 trailing-median implementations in Expo and Dart share fixtures
under `packages/finance-fixtures/variable-spending-v1.json`. They require every
day of the preceding 28-day window to be explicitly complete; unknown days cause
abstention. They are not a calibrated forecast and are not enabled on real ledger
data pending the quality adapter and backtest gates.

Schedule cloud synchronization is gated by
`EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED=false`. Enable it only against an environment
with migration `20261024110000_cashflow_schedules.sql` and the matching Dart API.
The encrypted document keeps local edits and stable request keys atomically.
Login/resume drains up to 50 pending operations; failures keep the queue for a
later retry. First-link conflicts preserve device data and require reconciliation.
The preview provides a manual sync action and protects an open editor against
background revision changes. This has local API/Auth/RLS acceptance, not remote
production or device acceptance.

The schedule comparison now requires a decision for every row (device, cloud or
omit). It rechecks both copies before saving, preserves an encrypted recovery
copy, and creates new stable-key operations against the reviewed cloud revision.
Local edit revisions never regress when cloud data is adopted.

The learning preview includes synthetic AI consent, queued status, predefined
vi/en explanations, revoke and history deletion. New generation remains off by
default (`EXPO_PUBLIC_LEARNING_AI_ENABLED=false`). Do not enable it without the
matching server migrations/API/worker. Requests contain only the fixed example
and locale. Same-owner token refresh preserves work; changing owners/unmounting
aborts requests and suppresses late results. Completed output is checked on
foreground/resume and every minute for remote revocation or expiry.

Cloud review/practice synchronization is part of the existing learning cloud
gate. Local records remain usable offline. Only reviews due according to verified
server completion dates are uploaded; duplicate events cannot grant extra XP.
Milestones are derived from unique owner records, do not award extra points and
cannot be exchanged for money or paid-plan benefits.

The development cashflow preview can read `/v1/cashflow-ledger` after the matching
local snapshot migration/API is available. It requires explicit wallet selection
and no pending device writes. The snapshot expires on background, mutation queue
changes, session changes or the next minute; an adopted cloud opening is then
cleared. The cloud gate remains off by default.

Paid schedule occurrences can be explicitly linked to a confirmed transaction
already included in that opening balance. One full occurrence maps to one payment;
direction, amount, currency, wallet scope and transaction version must match.
Transfers, partial payments and combined payments do not settle occurrences.
Links use owner-scoped encrypted device storage with optimistic revisions; they
are not cloud-synced or a transaction mutation. Changed evidence blocks adoption
until reviewed/unlinked. Manual opening entry removes the verified settlement
assumption. Schedule or horizon changes require reapplying the reviewed snapshot.
Native interaction/TalkBack acceptance still requires an Android device.

Schedules can carry an optional `walletId`. Old schedules remain readable and
usable in manual scenarios. Before a verified cloud scenario, assign a wallet to
each active schedule in the currency; only selected-wallet schedules are included.
The backend requires an owned, unarchived wallet in the same currency. Restore
may replace wallets and clear assignments; review and reassign before adoption.
This requires local migration `20261024120000_cashflow_schedule_wallet_scope.sql`
and its matching API before enabling the existing cloud flag.

The learning hub also links the development weekly-story route when cloud facts
are enabled. It uses a deterministic local template over verified records, with
UTC week boundaries, separate refunds/transfers, hidden amounts by default and
source drill-down. No facts are sent to Gemini and no story is auto-shared.
It reports only recorded movements and never treats an empty week as proof of
zero real spending. Guest/offline history stories and human content/device QA
are not claimed by this route.

Transaction create/edit, transfer, refund, splits and bulk-edit forms use vi/en
copy, including their native dialogs and accessibility labels. Validation notices
with amounts/counts keep structured data so an open notice can rerender after a
language change. User-entered titles/notes and merchant/category/account names
are treated as data and are not translated. Locale-aware formatting changes the
display only; persisted amounts, IDs, dates and enum values keep their existing
contracts. This does not imply complete localization of every product screen.
