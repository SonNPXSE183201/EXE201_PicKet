# Google OAuth cho Picket (Next.js và Expo Android)

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Luồng OAuth dự phòng dùng **Supabase Auth làm trung gian**. Google trả người dùng về
Supabase; Supabase mới chuyển về Next.js hoặc Expo. Google Client Secret chỉ
được lưu trong Supabase Dashboard, không đặt trong `.env` của web, Expo,
Dart API hoặc Git.

## Đăng nhập bằng ID token (từ 1.1.0)

Web dùng nút Google Identity Services, Android ưu tiên đăng nhập Google gốc rồi
gửi ID token tới Supabase. Người dùng không thấy tên miền Supabase trong luồng
này. Luồng OAuth chuyển hướng hiện có vẫn được giữ làm phương án dự phòng khi
chưa có biến môi trường, không tải được thư viện web, thiếu mô-đun gốc, thiếu
Google Play Services, sai cấu hình Android (mã 10) hoặc không nhận được ID token.
Hủy đăng nhập hoặc thao tác đang chạy trên Android không kích hoạt dự phòng.

Trong Google Cloud, trên ứng dụng OAuth loại Web, thêm hai nguồn JavaScript được
ủy quyền (Authorized JavaScript origins): `https://app.picketfinance.com` và
`http://localhost:3000`. Dùng mã ứng dụng Web công khai
`18042168468-kpse8gg1dhg6eisu1tjd63iaucourku1.apps.googleusercontent.com` cho cả
web và Android. Supabase đã chấp nhận mã này làm đối tượng nhận ID token, không
cần đổi cấu hình Supabase. Giữ URI chuyển hướng cũ để OAuth dự phòng tiếp tục chạy.

Tạo các ứng dụng OAuth loại Android tương ứng:

| Tên gói | SHA-1 chứng thư ký | Mục đích |
| --- | --- | --- |
| `com.picket.mobile` | `89:3F:04:4D:B6:38:0B:51:8F:ED:0D:F3:DC:A1:BF:C4:75:FF:B7:9D` | Chữ ký ứng dụng từ Google Play |
| `com.picket.mobile` | `A2:94:A6:6C:05:F1:59:32:AC:25:14:F8:BD:4E:01:77:8C:5B:D9:71` | Khóa tải lên / APK cài trực tiếp |
| `com.picket.mobile.bugqa` | `A2:94:A6:6C:05:F1:59:32:AC:25:14:F8:BD:4E:01:77:8C:5B:D9:71` | Kiểm thử QA |

Đặt `GOOGLE_WEB_CLIENT_ID` trong môi trường chạy máy chủ web (không dùng tiền tố
`NEXT_PUBLIC_`) và `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` trong môi trường dựng bản
mobile. Cả hai nhận cùng mã ứng dụng Web ở trên; đây là giá trị công khai, không
phải bí mật ứng dụng. Các hướng dẫn chuyển hướng bên dưới áp dụng cho OAuth dự phòng.

## 1. Giá trị cần có

| Nơi điền | Giá trị | Ghi chú |
| --- | --- | --- |
| Google Cloud Console → OAuth client (Web application) → Authorized redirect URI | `https://qyokoyopodjtvfyunyde.supabase.co/auth/v1/callback` | Đây là **callback của Google**, không phải URL web Picket. |
| Supabase → Authentication → Sign In / Providers → Google | Web Client ID và Client Secret từ Google Cloud | Bật provider, lưu trong dashboard; không commit secret. |
| Supabase → Authentication → URL Configuration → Site URL | `https://picket.51-79-207-154.sslip.io` | Phải trùng domain production đang dùng. |
| Supabase → Authentication → URL Configuration → Redirect URLs | `https://picket.51-79-207-154.sslip.io/auth/callback` | Next.js callback PKCE. |
| Supabase → Redirect URLs | `com.picket.mobile://auth/callback` | Expo Android callback. |
| Supabase → Redirect URLs | `com.picket.mobile://auth/reset-password` | Recovery trên Expo. |
| Supabase → Redirect URLs (chỉ khi test Next local) | `http://localhost:3000/auth/callback` và các callback `?next=/dashboard`, `?next=/session`, `?next=/reset-password` | Thêm đúng URL local đang được app gửi; không dùng wildcard production. |
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

Luồng OAuth dự phòng không cần Android OAuth client riêng: Expo mở Supabase
OAuth trong Chrome Custom Tab và trở về custom scheme. Luồng ID token cần các
ứng dụng OAuth Android theo tên gói và SHA-1 trong mục trên.

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
