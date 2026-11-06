# Google OAuth cho Picket (Next.js và Expo Android)

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ứng dụng dùng **Supabase Auth làm trung gian**. Google trả người dùng về
Supabase; Supabase mới chuyển về Next.js hoặc Expo. Google Client Secret chỉ
được lưu trong Supabase Dashboard, không đặt trong `.env` của web, Expo,
Dart API hoặc Git.

## 1. Giá trị cần có

| Nơi điền | Giá trị | Ghi chú |
| --- | --- | --- |
| Google Cloud Console → OAuth client (Web application) → Authorized redirect URI | `https://qyokoyopodjtvfyunyde.supabase.co/auth/v1/callback` | Đây là **callback của Google**, không phải URL web Picket. |
| Supabase → Authentication → Sign In / Providers → Google | Web Client ID và Client Secret từ Google Cloud | Bật provider, lưu trong dashboard; không commit secret. |
| Supabase → Authentication → URL Configuration → Site URL | `https://picket.51-79-207-154.sslip.io` | Phải trùng domain production đang dùng. |
| Supabase → Authentication → URL Configuration → Redirect URLs | `https://picket.51-79-207-154.sslip.io/auth/callback` | Next.js callback PKCE. |
| Supabase → Redirect URLs | `com.picket.mobile://auth/callback` | Expo Android callback. |
| Supabase → Redirect URLs | `com.picket.mobile://auth/reset-password` | Recovery trên Expo. |
| Supabase → Redirect URLs (chỉ khi test Next local) | `http://localhost:3000/auth/callback` | Không dùng wildcard production. |
| `web/.env.local` | Các giá trị trong `web/.env.example`, `APP_BASE_URL=http://localhost:3000` | Chỉ có Supabase **publishable** key. |
| `apps/mobile/.env.local` | Các giá trị trong `apps/mobile/.env.example` | Chỉ có Supabase **publishable** key. |
| `deploy/.env.production` | `PICKET_WEB_DOMAIN`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Compose tự đặt `APP_BASE_URL=https://${PICKET_WEB_DOMAIN}`. |

Nếu thay domain production, sửa đồng thời DNS, `PICKET_WEB_DOMAIN`, Supabase
Site URL và Redirect URLs. Trong Google Console vẫn dùng **Supabase callback**;
không thêm `/auth/callback` của Picket làm Google Authorized redirect URI.

Google OAuth đã chạy trên APK Expo x86_64 trong AVD ngày 2026-10-15. Vì vậy,
trước khi tạo client/provider mới, kiểm tra cấu hình hiện có để tránh làm hỏng
Android. Tài khoản Gmail dùng để **đăng nhập thử**, không phải Client ID.

## 2. Nếu cần tạo/cập nhật OAuth client trong Google Cloud

1. Chọn Google Cloud project thuộc đội Picket; cấu hình OAuth consent screen,
   tên ứng dụng, domain và test users theo chế độ Publishing status hiện tại.
2. Tạo OAuth client loại **Web application**. Điền Authorized redirect URI là
   `https://qyokoyopodjtvfyunyde.supabase.co/auth/v1/callback`.
3. Sao chép Web Client ID và Client Secret vào provider Google của Supabase,
   bật provider rồi lưu. Không gửi Client Secret qua chat, không lưu trong repo.
4. Kiểm tra Supabase URL Configuration theo bảng trên. Nếu app đang ở chế độ
   Testing, thêm đúng tài khoản thử vào OAuth consent screen trước khi E2E.

Không cần tạo Android OAuth client riêng cho luồng hiện tại: Expo mở Supabase
OAuth trong Chrome Custom Tab và trở về custom scheme. Nếu sau này chuyển sang
Google Sign-In native/ID token thì đó là luồng khác, cần Android client ID,
package name và SHA-1/SHA-256 của chứng thư ký.

## 3. Kiểm thử không ghi dữ liệu tài chính

1. Mở `https://picket.51-79-207-154.sslip.io/login` trong Chrome đã đăng nhập
   tài khoản thử; nhấn **Tiếp tục với Google** và chọn đúng tài khoản.
2. Quan sát thứ tự: Picket → `accounts.google.com` → Supabase →
   `https://picket.51-79-207-154.sslip.io/auth/callback?...` → dashboard hoặc
   onboarding. Không chép `code`, token hoặc cookie vào log/tài liệu.
3. Refresh dashboard và mở tab mới: session còn hợp lệ. Đăng xuất rồi mở lại
   `/dashboard`: phải được chuyển về đăng nhập.
4. Kiểm tra Chrome DevTools Network nếu lỗi: `redirect_uri_mismatch` nghĩa là
   Google Console sai Supabase callback; `redirect_to` không allow-list nghĩa
   là Supabase Redirect URLs thiếu Picket callback; `oauth_callback` trên login
   nghĩa là PKCE exchange thất bại hoặc session/cookie không được lưu.
5. Chạy `npm run test:auth --prefix web`, `npm run lint --prefix web`,
   `npm run typecheck --prefix web` và `npm run build --prefix web`.

Thử đăng nhập tài khoản cá nhân chỉ kiểm tra Auth/session; không tạo/xóa dữ liệu
tài chính hoặc user thật. Để kiểm tra onboarding/receipt create, dùng tài khoản
test riêng có thể dọn sau thử nghiệm.

## 4. Google Play Billing là cấu hình khác

Google OAuth **không** cấp quyền kiểm tra giao dịch Play. Billing/restore cần
Play Console app và sản phẩm subscription, service account có quyền phù hợp,
Pub/Sub/Real-time Developer Notifications, deploy `verify-purchase` và
`play-notifications`, rồi cài bản Internal testing trên điện thoại thật. Xem
[apps/mobile/README.md](../../apps/mobile/README.md) để điền các giá trị đó.
