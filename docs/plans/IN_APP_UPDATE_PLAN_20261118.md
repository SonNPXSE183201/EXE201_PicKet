# Kế hoạch: cập nhật ngay trong ứng dụng và tổng hợp việc còn lại (18/11/2026)

> Thay thế phần A của `docs/plans/AUTO_UPDATE_PLAN_20261114.md` (phần A chưa làm dòng code nào). Phần B (bảo mật) của plan đó vẫn giữ nguyên.
> Kế hoạch này chỉ là tài liệu, chưa sửa code.

## 1. Trạng thái Google Play (đọc ngày 18/11/2026)
| Mục | Trạng thái | Nguồn |
| --- | --- | --- |
| Quyền phát hành công khai | **Đã được cấp**: Trang tổng quan ghi "Ứng dụng của bạn đã được cấp quyền phát hành công khai trên Google Play" | Play Console › Trang tổng quan |
| Kênh phát hành công khai | Không hoạt động, chưa có bản phát hành nào | Play Console và `get_releases` |
| Thử nghiệm kín (alpha) | 1.1.0 (33), hoàn tất, 100% | `get_releases` |
| Thử nghiệm nội bộ | 1.2.0 (34), hoàn tất | `get_releases` |
| Chế độ xuất bản có quản lý | Đang bật; lần xuất bản gần nhất 14/11/2026; không có thay đổi nào đang chờ | Tổng quan về việc xuất bản |

Việc tiếp theo trên Play do chủ tài khoản bấm:
1. Thử 1.2.0 (34) từ kênh nội bộ trên máy thật.
2. Tạo bản phát hành công khai.
3. Gửi xét duyệt, rồi bấm "Phát hành thay đổi".

Đề xuất phát hành công khai 1.2.0 (34) trước, sau đó phát hành tính năng cập nhật trong ứng dụng ở 1.3.0. Lý do: Play tự cập nhật nền cho phần lớn người dùng, nên không cần chờ tính năng này mới ra mắt.

Không động vào kênh thử nghiệm kín: không đóng kênh, không gỡ tester, không gỡ hay dừng bản phát hành.

## 2. Việc còn lại (tổng hợp từ các plan hiện có)
`docs/BACKLOG.md` và `docs/PROJECT_STATUS.md` đã cũ (ghi ngày 04/11, còn nói bản 1.0.14); cần cập nhật lại theo bảng dưới.

| # | Mảng | Việc | Nguồn | Ai làm |
| --- | --- | --- | --- | --- |
| 1 | Play | Phát hành công khai 1.2.0 (34): ảnh chụp mới, mô tả tiếng Việt có đoạn về gói trả phí, tạo bản, gửi xét duyệt | `docs/GOOGLE_PLAY_PRODUCTION_SUBMISSION_20261113.md:34-45` | Claude chuẩn bị, chủ tài khoản bấm |
| 2 | Play | Thử mua gói bằng tài khoản thử nghiệm giấy phép khi đã bật R8; xác minh lại cảnh báo tràn viền (edge-to-edge) | `GOOGLE_PLAY_WARNINGS_FIX_PLAN_20261113.md:34` | Claude và chủ tài khoản |
| 3 | Supabase | Đẩy migration `20261115090000_auth_send_sms_hook.sql` lên production (cần chủ tài khoản đồng ý), sau đó bật hook "Send SMS" và Phone | `VERIFICATION_MODE_FIREBASE_SMS_PLAN_20261114.md:140-152` | Claude, rồi chủ tài khoản |
| 4 | SMS | Cập nhật chính sách quyền riêng tư về Firebase, nâng gói Blaze, cấu hình số thử, thử trên máy thật, bật "Email + SMS" trong admin | như trên | Chủ tài khoản và Claude |
| 5 | Web/Git | Nhánh `feat/verification-otp-first` chưa push; chủ tài khoản tự push và mở PR | nhật ký git | Chủ tài khoản |
| 6 | Landing | `apps/landing/release.json` vẫn là 1.0.18 (32), cũ hơn Play 3 bản. Cần phát hành APK landing cùng nguồn với bản công khai | `apps/landing/release.json` | Claude |
| 7 | Bảo mật | Ngừng sslip.io và khóa cổng bằng `DOCKER-USER` khi người dùng APK đã lên ≥ 1.1.0; SPF/DKIM/DMARC; quy tắc cache APK | `AUTO_UPDATE_PLAN_20261114.md` B3.7, B3.8, B3.11, B3.12 | Claude |
| 8 | Supabase | Gia cố mục 1-6: mật khẩu admin, URL chuyển hướng chính xác, tắt nhà cung cấp thừa, giới hạn mạng, quyền mặc định, kiểm thử RLS trong CI | `SUPABASE_AUTH_DOMAIN_SECURITY_PLAN_20261114.md:57-63` | Chủ tài khoản và Claude |
| 9 | Mobile | Chế độ tối và độ tương phản tiếng Anh; gói Free; OCR bảng có tọa độ; "Lưu vào máy"; cỡ chữ và giảm chuyển động; đổi ảnh đại diện | `REMAINING_WORK_PLAN_20261107.md:40-62` | Claude |
| 10 | Mobile | Chuyển i18n cho màn quét, hóa đơn và giới thiệu | `PICKET_MASTER_PLAN_20261105.md` đợt 8 | Claude |
| 11 | Web | Lọc ngày và chữ trong lịch sử thanh toán, nhảy trang (mục `[ ]` duy nhất) | `ADMIN_UI_FIX_PLAN_20261110.md:29` | Claude |
| 12 | Vận hành | Bật đọc lại kênh Play trong worker (`PLAY_TRACK_READBACK`), cấp quyền bucket báo cáo tài chính | `PICKET_MASTER_PLAN_20261105.md` đợt 1, 2, 4 | Chủ tài khoản và Claude |
| 13 | Mới | Cập nhật trong ứng dụng (mục 3 bên dưới) | plan này | Claude |
| 14 | Tạm hoãn | Dự báo AI, chấm điểm cloud bài 13-30, các mục roadmap cloud | `ROADMAP_CLOUD_FEATURES_20261102.md` mục 10 | Chờ quyết định |

## 3. Cập nhật trong ứng dụng

### 3.1 Hiện trạng (đã đọc code)
- Expo ~57.0.33, React Native 0.86.3, kiến trúc mới đang bật (`apps/mobile/android/gradle.properties:38`).
- Bản APK (landing): module `apps/mobile/modules/picket-app-updates` tải APK, kiểm tra SHA-256, kích thước, versionCode và chữ ký, rồi mở trình cài bằng `ACTION_VIEW`.
  - Phần JS nằm ở `src/features/updates/android-app-updates.ts`. `app-update-policy.ts` đọc `https://picketfinance.com/release.json` và đã có `minSupportedVersionCode`.
- Bản Play: `android-app-updates.play.ts` chỉ mở trang Play.
  - Plugin `plugins/with-play-store-build.js:19,28-31` loại module APK khỏi bản Play và gỡ quyền `REQUEST_INSTALL_PACKAGES` (dòng 49).
  - Chưa có Play In-App Updates (Play Core).
- Giao diện: chỉ có mục thủ công `<AppUpdateSection />` trong `src/app/(tabs)/profile.tsx:353`. Chưa có kiểm tra khi mở app, chưa có banner, chưa có màn bắt buộc.
- Dữ liệu phía server:
  - Bảng `app_releases` có `min_supported_code` (`supabase/migrations/20261105180000_app_releases.sql:18`). Admin quản lý ở trang "Phiên bản" (`web/src/features/admin/components/release-admin.tsx`).
  - Thông báo có `min_version_code` và `blocking` (`20261105160000_app_announcements.sql`).
  - API công khai: `apps/api/routes/v1/releases/landing.dart`.
- Chỗ gắn: `src/app/_layout.tsx:66-76` (RootLayout › SessionReadyTree), cạnh `AnnouncementsProvider`.

### 3.2 Thiết kế
1. **Một bộ điều khiển chung `useAppUpdate`** (thuần TypeScript, có test).
   - Kiểm tra khi mở app và khi app trở lại từ nền, cách nhau tối thiểu 6 giờ (lưu mốc trong SecureStore hoặc SQLite).
   - Trả về một trạng thái chung cho cả hai kênh: `none | available | downloading | downloaded | needs-user-action | required | failed`.
   - Bản bắt buộc khi `versionCode < minSupported`, lấy từ server (mục 4) hoặc từ độ ưu tiên của Play ≥ 4.
2. **Bản Google Play: module Expo cục bộ mới `modules/picket-play-updates`** (Kotlin, `com.google.android.play:app-update-ktx`).
   - Viết module riêng thay vì dùng thư viện cộng đồng, để khớp kiến trúc mới và cách các module hiện có được tổ chức.
   - Hàm cung cấp: `checkForUpdate()` trả `availableVersionCode`, `updatePriority`, `clientVersionStalenessDays`, `isFlexibleAllowed`, `isImmediateAllowed`. Thêm `startFlexible()`, `startImmediate()`, `completeUpdate()` và sự kiện `onInstallState`.
   - Bản thường dùng kiểu linh hoạt: tải nền. Khi tải xong, hiện banner "Đã tải bản mới. Khởi động lại để cập nhật" và gọi `completeUpdate()` khi người dùng bấm hoặc khi app vào nền.
   - Bản bắt buộc dùng kiểu ngay lập tức (màn hình của Play). Nếu người dùng hủy, hiện màn chặn của PicKet có nút "Cập nhật".
   - Khi app trở lại từ nền, gọi lại `checkForUpdate()` để tiếp tục một lần cập nhật ngay lập tức còn dở (theo hướng dẫn của Play).
   - Plugin `with-play-store-build` loại module này khỏi bản APK; ngược lại, bản Play loại `picket-app-updates`.
3. **Bản APK: mở rộng `picket-app-updates`.**
   - Giữ mọi bước kiểm tra hiện có.
   - Thay `ACTION_VIEW` bằng phiên `PackageInstaller`, đặt `setRequireUserAction(USER_ACTION_NOT_REQUIRED)` trên Android 12 trở lên. Nhận kết quả qua `BroadcastReceiver`.
   - Khi nhận `STATUS_PENDING_USER_ACTION`, hiện thông báo "Bản mới đã sẵn sàng, chạm để cài".
   - Lần cập nhật đầu tiên (app được cài từ trình duyệt) vẫn cần người dùng bấm Cài đặt. Android 10 (Redmi 7) luôn cần bấm.
4. **Server: một nguồn chính sách cho cả hai kênh.**
   - Thêm `GET /v1/releases/policy?channel=play|apk&versionCode=N`, trả `latestVersionCode`, `minSupportedVersionCode` và ghi chú phát hành ngắn. Dữ liệu đọc từ `app_releases` có trạng thái live.
   - Bản Play chỉ dùng điểm này để biết có bắt buộc hay không. Việc tải luôn do Play làm.
   - Bản APK vẫn tải theo `release.json` để giữ tương thích với các bản cũ.
5. **Độ ưu tiên trên Play:** mở rộng `.agents/skills/picket-play-release/play_release.py` với cờ `--priority 0-5`. Cờ này ghi `inAppUpdatePriority` vào bản phát hành (chỉ đặt được khi tạo bản qua API).
   - Quy ước: 0-2 là linh hoạt, không làm phiền; 3 là linh hoạt, có banner; 4-5 là ngay lập tức.
6. **Giao diện:**
   - Gỡ `AppUpdateSection` khỏi Hồ sơ; giữ dòng phiên bản đang cài và thêm dòng "Đã là bản mới nhất" hoặc "Có bản mới".
   - Banner nhẹ ở trang chủ chỉ hiện khi đang tải, đã tải xong hoặc cần xác nhận.
   - Màn chặn chỉ dùng khi bắt buộc.
   - Văn bản có tiếng Việt và tiếng Anh theo i18n hiện có.
7. **An toàn và tiết kiệm:**
   - Bản không bắt buộc chỉ tự tải qua Wi-Fi hoặc mạng không tính phí, và không tải khi pin dưới 20%.
   - Ghi sự kiện ẩn danh `update_prompted`, `update_downloaded`, `update_installed`, `update_failed`, chỉ khi người dùng đã đồng ý chia sẻ thống kê.
   - Không bao giờ thêm `REQUEST_INSTALL_PACKAGES` hay `UPDATE_PACKAGES_WITHOUT_USER_ACTION` vào bản AAB.
8. **Admin:**
   - Trang "Phiên bản" đã có ô "Bắt buộc cập nhật nếu thấp hơn code"; thêm cho kênh Play.
   - Hiển thị cảnh báo khi `min_supported_code` lớn hơn bản đang live (tránh khóa người dùng).

### 3.3 Các bước (viết test trước)
1. Test cho `useAppUpdate` và chính sách: lịch kiểm tra, mạng, pin, bắt buộc, kênh Play và kênh APK. Test cho điểm `/v1/releases/policy` (Dart) và một test SQL cho chế độ đọc.
2. Viết điểm API `/v1/releases/policy` và mở rộng admin "Phiên bản" cho kênh Play.
3. Viết module `picket-play-updates`, lớp `android-app-updates.play.ts` và cập nhật plugin loại module theo kênh. Thêm test `update-channel-build.test.ts` để bảo đảm AAB không chứa module APK, không chứa hai quyền cài đặt, và APK không chứa Play Core.
4. Mở rộng `picket-app-updates` sang `PackageInstaller` và receiver.
5. Viết bộ điều khiển tự động, banner và màn chặn; gỡ `AppUpdateSection`.
6. Thêm cờ `--priority` vào `play_release.py`.
7. Kiểm thử:
   - **Play:** Play chỉ báo có bản mới khi app được cài từ Play. Dùng "Chia sẻ ứng dụng nội bộ": tải bản N, rồi mở liên kết bản N+1, rồi mở app. Hoặc dùng kênh nội bộ với 1.3.0 (35), rồi 1.3.1 (36). Thử cả kiểu linh hoạt và kiểu ngay lập tức (độ ưu tiên 5).
   - **APK:** trên `com.picket.mobile.bugqa` (Redmi 7, Android 10), cài N rồi lên N+1, phải bấm Cài đặt. Trên máy ảo Android 14, thử N+1 lên N+2 không cần bấm.
   - Không cài đè, không xóa dữ liệu, không gỡ `com.picket.mobile`.
8. Phát hành theo skill `picket-versioning`: **1.3.0** (versionCode = số lớn nhất trên Play + 1). Phát hành AAB và APK landing từ cùng nguồn, rồi cập nhật `release.json`.

### 3.4 Rủi ro
- Kiểu ngay lập tức chặn người dùng; chỉ dùng cho lỗi nghiêm trọng hoặc lỗi bảo mật.
- Đặt `min_supported_code` sai có thể khóa toàn bộ người dùng. Admin phải hiện cảnh báo và cần xác nhận hai bước.
- Các bản APK đến 1.0.18 vẫn kiểm tra ở sslip.io, nên chỉ tắt sslip.io sau khi phần lớn người dùng đã lên ≥ 1.1.0.
- MIUI và một số ROM có thể chặn cài nền. Khi đó quay về `ACTION_VIEW` như hiện tại.

## 4. Giao việc cho agent
| Việc | Agent và model | Effort | Lý do |
| --- | --- | --- | --- |
| Module Kotlin `picket-play-updates`, `PackageInstaller` và receiver | Claude Opus 5.5 | high | Mã native, vòng đời Activity, dễ lỗi khó thấy |
| `useAppUpdate`, chính sách, test TypeScript | Claude Sonnet 5.5 | medium | Logic thuần, có test rõ |
| API `/v1/releases/policy` (Dart) và test SQL | Codex CLI | medium | Phạm vi nhỏ, tách biệt, chạy song song được |
| Banner, màn chặn, i18n, gỡ mục ở Hồ sơ | Sonnet 5.5, hoặc Antigravity CLI nếu cần đối chiếu Figma | medium | Giao diện theo mẫu có sẵn |
| Cờ `--priority` cho `play_release.py` | Claude Haiku 5.5 | low | Thay đổi nhỏ trong script |
| Rà soát cuối (đọc độc lập toàn bộ diff) | Claude Opus 5.5, `/code-review` | high | Tránh tự xác nhận kết luận của chính mình |
| Build, cài lên máy QA, Play nội bộ | Claude (phiên chính) | — | Cần quyền thiết bị và Play; mọi bước bấm phát hành do chủ tài khoản làm |

Các agent làm song song trên worktree riêng. Phiên chính gộp lại, chạy `npm run test`, `lint`, `typecheck` và `dart test`, rồi mới build.

## 5. Đã thực hiện (18/11/2026)
- Mã:
  - Module mới `modules/picket-play-updates` (Play In-App Updates, `app-update-ktx` 2.1.0).
  - `picket-app-updates` cài qua phiên `PackageInstaller`, có thêm điều kiện mạng và pin.
  - Bộ điều khiển `use-app-update.tsx`, banner trang chủ, màn chặn bắt buộc; gỡ mục cập nhật ở Hồ sơ, giữ dòng phiên bản.
  - API `/v1/releases/policy`, migration `20261118090000_release_policy.sql`, cảnh báo và xác nhận hai bước trong admin "Phiên bản".
  - Cờ `--priority` trong `play_release.py`.
- Sửa theo rà soát độc lập (Opus):
  - Không tự `completeUpdate()` khi app vào nền (vì bộ chọn ảnh hay màn thanh toán cũng làm app vào nền).
  - Ưu tiên trạng thái "đã tải xong" trước "đang chạy"; chỉ tiếp tục kiểu ngay lập tức khi chính app đã khởi động nó (có cờ lưu lại).
  - Nút trên màn chặn ở bản Play gọi khởi động lại; quay về kiểu linh hoạt nếu Play từ chối kiểu ngay lập tức.
  - Độ ưu tiên 0-2 không tự bật hộp thoại Play.
  - Mức tối thiểu giữ nguyên khi đọc lại kênh Play thêm dòng mới.
  - Chặn mở hai trình cài cùng lúc; không quay về `ACTION_VIEW` khi phiên cài có thể vẫn đang chạy.
- Còn lưu ý: quyền cài đặt bị gỡ khỏi manifest theo biến môi trường lúc prebuild. Mỗi lần đổi giữa bản Play và bản APK phải chạy lại prebuild (đã có trong skill phát hành).
- Kiểm tra:
  - Mobile 1182 test đạt, typecheck và lint không lỗi.
  - Web 107 test đạt, API Dart 206 test đạt, 27 bộ SQL đạt, landing 17 test đạt.
  - Build APK QA biên dịch được cả hai module Kotlin.

## 6. Thay đổi theo yêu cầu của chủ dự án và phát hành (18/11/2026)
- Không có mục "Ứng dụng" trong Hồ sơ; dòng phiên bản chỉ hiện `Phiên bản 1.3.0` (bỏ versionCode).
- Cập nhật tự động, không cần bấm:
  - **Tải về:** bản Play tự bắt đầu tải mọi bản mới (Google luôn hiện một hộp thoại đồng ý). Bản APK (landing và APKPure) tự tải khi có Wi-Fi và pin đủ.
  - **Cài đặt:** ngay khi vừa mở app, hoặc khi quay lại sau hơn 2 phút ở nền. Bản bắt buộc cài ngay.
  - Không cài khi app chỉ vừa vào nền, để không cắt ngang bộ chọn ảnh, màn thanh toán hay đăng nhập.
- Phát hành:
  - AAB 1.3.0 (35) lên kênh nội bộ: hoàn tất.
  - APK 1.3.0 (35) lên landing, `picket-1.3.0-35-20261118-97b0f390.apk`: đã kiểm tra SHA-256 trên `picketfinance.com` và địa chỉ sslip.io cũ.
  - APK QA đã cài trên Redmi 7, chạy không lỗi.
- Còn chờ:
  - Đẩy 2 migration lên Supabase (`20261115090000`, `20261118090000`), sau đó deploy API và web.
  - Tải APK lên APKPure.
  - Thử bản nội bộ từ Play, rồi phát hành công khai.
