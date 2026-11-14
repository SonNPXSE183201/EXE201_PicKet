# Đăng nhập Google qua tên miền ứng dụng và rà soát quyền truy cập DB (14/11/2026)

## 1. Hiện trạng
- Web (`login-form.tsx`, `register-form.tsx`) và mobile (`auth-context.tsx › signInWithGoogle`) dùng `signInWithOAuth`: trình duyệt chuyển tới Google rồi quay về `https://qyokoyopodjtvfyunyde.supabase.co/auth/v1/callback`. Vì địa chỉ quay về là tên miền Supabase, màn hình Google ghi "tiếp tục tới qyokoyopodjtvfyunyde.supabase.co".
- Mobile phải mở Custom Tab (cần Chrome/Edge/Firefox), không dùng bảng chọn tài khoản gốc của Android.

## 2. Hiểu đúng về rủi ro
- Lộ mã dự án và publishable key **không phải lỗ hổng**: hai giá trị này nằm sẵn trong APK và mã web, ai cũng lấy được. Đổi tên miền chỉ thay đổi thứ người dùng nhìn thấy; địa chỉ `*.supabase.co` vẫn hoạt động song song.
- Thứ bảo vệ dữ liệu là RLS, quyền GRANT và kiểm tra quyền trong hàm SECURITY DEFINER. Mục 3 rà đúng các điểm này trên production.

## 3. Kết quả rà soát production (chỉ đọc, `supabase db query --remote --read-only`)
| Hạng mục | Kết quả |
|---|---|
| Bảng trong schema `public` chưa bật RLS | 0 |
| Quyền của vai trò `anon` trên bảng/view | 0 |
| View chạy bằng quyền người tạo mà anon/người dùng đọc được | 0 |
| Danh sách schema REST (`/rest/v1/` OpenAPI) với publishable key | bị chặn ("Secret API key required") |
| GraphQL (`/graphql/v1`) | `pg_graphql` chưa bật, không lộ schema |
| Hàm SECURITY DEFINER anon gọi được | 2, đều công khai có chủ đích: `announcements_feed`, `release_landing_manifest`; cả hai đặt `search_path=''` |
| Hàm SECURITY DEFINER người dùng đăng nhập gọi được | 41; hàm dữ liệu cá nhân kiểm tra `auth.uid()`, hàm quản trị gọi `permission_require(...)`/`admin_require(...)` (đã đọc thân từng hàm quản trị) |
| Chính sách `using (true)` | 1: `app_settings` cho người dùng đăng nhập đọc; chỉ chứa cờ bảo trì, thông báo, ngưỡng giám sát; không nhạy cảm |
| Storage | 1 bucket `picket-media`, private, giới hạn 10 MB, chỉ JPEG/PNG/WebP |

Kết luận: chưa thấy đường nào để người dùng (kể cả có anon key) đọc dữ liệu người khác hoặc dữ liệu quản trị.

## 4. Phương án đổi tên miền khi đăng nhập Google
**A. Đăng nhập Google gốc bằng ID token (khuyến nghị, miễn phí)**
- Web: nút Google Identity Services trên `app.picketfinance.com` → nhận ID token → `supabase.auth.signInWithIdToken({ provider: "google", token, nonce })`. Không còn chuyển hướng qua `supabase.co`; Google hiển thị tên ứng dụng và `app.picketfinance.com` (origin đã khai báo).
- Mobile: Android Credential Manager (bảng chọn tài khoản gốc, không cần trình duyệt) → `signInWithIdToken`. Cần thư viện native (ví dụ `@react-native-google-signin/google-signin`), OAuth client loại Android với SHA-1 của khóa ký Play và khóa upload, rồi build bản mới (1.1.0).
- Bắt buộc dùng nonce: gửi SHA-256 của nonce cho Google, gửi nonce gốc cho Supabase; giữ `skip_nonce_check = false`.
- Supabase › Auth › Google: thêm client ID web và Android vào "Authorized Client IDs".
- Kèm theo: xác minh thương hiệu trên Google Auth Platform (tên PicKet, logo, tên miền `picketfinance.com` đã xác minh qua Search Console, link chính sách). Bước này Google duyệt vài ngày làm việc.
- CSP web cần thêm `https://accounts.google.com` vào `script-src`, `frame-src`, `connect-src` và `style-src` (đã có `'unsafe-inline'`).

**B. Custom Domain của Supabase (trả phí)**
- `auth.picketfinance.com` (CNAME tới Supabase), cần gói Pro (25 USD/tháng) cộng add-on Custom Domain (khoảng 10 USD/tháng). Callback Google đổi sang `https://auth.picketfinance.com/auth/v1/callback`; phải thêm callback này ở Google Console và đổi `SUPABASE_URL` cho web, API và bản app mới.
- Chỉ đổi tên miền hiển thị và tên miền gọi API; không tăng bảo mật vì `*.supabase.co` vẫn chạy.

**Không làm:** tự proxy Supabase qua Caddy/Cloudflare. Supabase Auth luôn tạo callback theo URL gốc của dự án nên Google vẫn thấy `supabase.co`, lại thêm một điểm hỏng và lộ token qua máy chủ trung gian.

## 4b. Đã cấu hình trên Google Cloud (project `picket-510311`, 14/11/2026)
- Phát hiện: app OAuth đang ở chế độ **Testing** với 1 người dùng thử, nên mọi tài khoản khác bị Google từ chối khi đăng nhập Google trên web và app. Chủ dự án đồng ý chuyển sang **In production** (chỉ dùng quyền cơ bản email/profile, không cần Google xét duyệt).
- Branding: thêm trang chủ `https://picketfinance.com` và chính sách `https://picketfinance.com/privacy.html`. Chưa tải logo (tải logo sẽ bắt buộc nộp xác minh thương hiệu; làm khi muốn hiển thị logo).
- Web client "Picket Supabase Auth": thêm Authorized JavaScript origins `https://app.picketfinance.com`, `http://localhost:3000`; giữ redirect URI của Supabase cho luồng cũ.
- Client Android mới:
  - "Picket Android Play": `com.picket.mobile`, SHA-1 khóa ký Google Play `89:3F:04:4D:B6:38:0B:51:8F:ED:0D:F3:DC:A1:BF:C4:75:FF:B7:9D`.
  - "Picket Android APK": `com.picket.mobile`, SHA-1 khóa upload `A2:94:A6:6C:05:F1:59:32:AC:25:14:F8:BD:4E:01:77:8C:5B:D9:71` (APK trực tiếp, APKPure).
  - "Picket Android QA": `com.picket.mobile.bugqa`, cùng SHA-1 khóa upload.
- Supabase không cần đổi: ID token từ web và từ Android (cấu hình `webClientId`) đều có audience là web client ID mà provider Google đang dùng.

## 4c. Triển khai mã (14/11/2026)
- Web: nút Google Identity Services, `signInWithIdToken` có nonce (Google nhận SHA-256, Supabase nhận nonce gốc); tự quay về nút OAuth cũ nếu không tải được script Google hoặc đổi token lỗi. Biến runtime `GOOGLE_WEB_CLIENT_ID`. CSP thêm `https://accounts.google.com`.
- Đã deploy image `picket-web:google-20261114` (rollback `picket-web:security-20261114`, bản sao lưu env và compose trong `releases/web-google-20261114/`). Kiểm tra: `/login` và `/register` hiện nút "Tiếp tục sử dụng dịch vụ bằng Google", không lỗi origin hay CSP. Đã thử bằng tài khoản thật trên Chrome: nút hiện "Tiếp tục bằng tên Sơn", Chrome mở hộp thoại chọn tài khoản FedCM ngay trên `app.picketfinance.com` (không qua `supabase.co`), sau khi chủ dự án bấm Tiếp tục thì vào dashboard đúng dữ liệu, phiên còn sau khi tải lại, không lỗi CSP. Turnstile tự qua ("Thành công!") với người dùng thật.
- Mobile: `@react-native-google-signin/google-signin` ^17, bảng chọn tài khoản gốc rồi `signInWithIdToken`; tự quay về Custom Tab khi thiếu module, thiếu Play Services hoặc lỗi cấu hình SHA-1. Biến build `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Có hiệu lực từ bản 1.1.0; cần thử trên Redmi 7 bằng bản QA trước khi phát hành.
- Kiểm tra: web 88/88, mobile 1156/1156, typecheck web và mobile sạch.

## 5. Gia cố thêm (theo ưu tiên)
1. **Đổi mật khẩu tài khoản admin** đã gửi qua chat trước đó, bật lại MFA nếu cần.
2. Supabase › Auth › URL Configuration: chỉ giữ redirect URL chính xác (`https://app.picketfinance.com/auth/callback`, `com.picket.mobile://...`); bỏ wildcard và bỏ các URL `sslip.io` khi ngừng tên miền cũ.
3. Auth › Providers: tắt nhà cung cấp không dùng; mật khẩu tối thiểu 8 ký tự có chữ và số (khớp `passwordValidationMessage`); xem lại giới hạn gửi email/OTP.
4. Database › Network Restrictions: chỉ cho phép kết nối Postgres trực tiếp từ IP VPS và máy quản trị; bật bắt buộc SSL.
5. Thêm migration thu hồi mặc định `EXECUTE` của `PUBLIC` trên hàm mới ở schema `public` (`alter default privileges revoke execute on functions from public`) để hàm mới không tự mở cho anon.
6. Đưa truy vấn rà soát ở mục 3 vào `supabase/tests` để CI báo khi có bảng mới thiếu RLS hoặc hàm SECURITY DEFINER thiếu `search_path`.
7. Turnstile trên web: widget "Picket web auth" đã tạo trên Cloudflare; mã đã deploy nhưng đang tắt cho tới khi cài `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` vào `.env.production` (chờ chủ dự án đồng ý).

## Nguồn
- [Supabase: Sign in with Google (web, Android, ID token, nonce)](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase: Custom Domains](https://supabase.com/docs/guides/platform/custom-domains)
- [Supabase discussion #5041: hiển thị tên miền riêng thay cho supabase.co](https://github.com/orgs/supabase/discussions/5041)
- [Google Developer forum: xác minh thương hiệu bị lệch tên vì callback Supabase](https://discuss.google.dev/t/oauth-branding-verification-stuck-name-mismatch-due-to-supabase-callback-domain-no-trust-safety-email-received/389007)
