# Picket Next.js web

<!-- current-project-status -->
Trạng thái triển khai và nghiệm thu cập nhật 27/10/2026: [PROJECT_STATUS](../docs/PROJECT_STATUS.md). Dùng trạng thái này để đối chiếu các ví dụ và checkpoint bên dưới.

Phát hành/nghiệm thu toàn dự án: [PROJECT_STATUS.md](../docs/PROJECT_STATUS.md). Landing tải APK là `apps/landing`, không phải giao diện Next.js được thiết kế lại. Các route web/auth hiện có vẫn được giữ.

Web client dùng Next.js 16.4.3 (bản vá đã triển khai ngày 27/10), Supabase Auth cookie SSR và Dart Frog API dùng
chung với ứng dụng Expo.

## Cấu hình

Sao chép `.env.example` thành `.env.local` rồi điền:

```text
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Trong Supabase Dashboard → Authentication → URL Configuration, thêm redirect:

```text
http://localhost:3000/auth/callback
```

Khi deploy, thêm callback của domain production, ví dụ:
`https://app.example.com/auth/callback`.

Google OAuth dùng **Google Console → Supabase callback → Picket callback**;
không đưa Google Client Secret vào Next.js. Xem [hướng dẫn cấu hình và
kiểm thử](../docs/migration/GOOGLE_OAUTH_SETUP.md).

## Chạy và kiểm tra

```powershell
npm install
npm run dev

npm run lint
npx tsc --noEmit
npm run build
```

- Landing page: `http://localhost:3000`
- Đăng nhập: `http://localhost:3000/login`
- Đăng ký/OTP: `http://localhost:3000/register`
- Quên mật khẩu: `http://localhost:3000/forgot-password`
- Onboarding cần session: `http://localhost:3000/onboarding`
- Dashboard cần session: `http://localhost:3000/dashboard`
- Tài khoản: `http://localhost:3000/accounts`
- Giao dịch: `http://localhost:3000/transactions`
- Chuyển tiền: `http://localhost:3000/transactions/transfer`
- Hoàn tiền: mở từ một khoản chi trong trang giao dịch
- Chia danh mục: mở từ một khoản thu/chi trong trang giao dịch
- Danh mục: `http://localhost:3000/categories`
- Ngân sách: `http://localhost:3000/budgets`
- Hồ sơ và tùy chọn: `http://localhost:3000/profile`
- Hồ sơ hiển thị gói hiện tại và quota OCR cloud do Dart API xác thực
- Export dữ liệu: `http://localhost:3000/data`
- Xóa tài khoản: khu vực nguy hiểm trong `http://localhost:3000/data`
- Hóa đơn: `http://localhost:3000/receipts` (xem/sửa line items và kiểm tra trùng theo cửa hàng, ngày, tổng tiền)

Proxy Next.js refresh Supabase cookie; callback đổi PKCE code thành session. Dashboard
xác minh claims trước khi lấy access token để gọi Dart API.

Các trang tài chính đăng ký Supabase Realtime theo đúng user để tự tải lại dữ
liệu do Expo hoặc tab khác thay đổi. Khi Realtime mất kết nối, web chuyển sang
refresh lúc tab trở lại foreground và polling mỗi 60 giây.
