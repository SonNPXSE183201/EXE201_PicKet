# Picket Project Architecture Rules

Tài liệu này chứa các quy tắc kiến trúc và tiêu chuẩn mã hóa (coding standards) BẮT BUỘC cho dự án Picket.
Tất cả AI Agents khi thao tác trong dự án này PHẢI đọc và tuân thủ các quy tắc này.

## 1. Clean Code Principles
- **Meaningful Names**: Đặt tên biến, class, hàm rõ nghĩa bằng tiếng Anh.
- **Single Responsibility Principle (SRP)**: Mỗi file, class hoặc function chỉ nên đảm nhiệm một trách nhiệm duy nhất.
- **DRY (Don't Repeat Yourself)**: Tách các logic dùng chung ra thư mục `core` hoặc `shared`.
- **No Magic Numbers/Strings**: Khai báo hằng số (constants) thay vì code cứng trực tiếp.

## 2. Feature-First Architecture (Kiến trúc theo tính năng)
Dự án được nhóm theo **Feature (Tính năng)**, không nhóm theo loại file (như MVC truyền thống).

### A. Mobile App (Expo)
`apps/mobile` là mobile client đích. Dùng Expo Router và tổ chức theo feature:
- `src/app/`: Chỉ chứa route groups và route composition.
- `src/features/<feature_name>/`: UI, hooks, state và adapter của từng feature.
- `src/core/`: Thành phần, cấu hình và tiện ích dùng chung trên mobile.
- Nghiệp vụ tài chính có tính quyết định phải nằm trong Dart backend; client chỉ
  giữ validation phục vụ UX và trạng thái offline/sync.

`mobile/` là Flutter legacy, chỉ được sửa lỗi bảo mật, crash hoặc mất dữ liệu
trong thời gian chuyển đổi. Không thêm feature hay business rule mới vào đây.

### B. Web App (Next.js)
Dùng App Router kết hợp Feature-based. Cấu trúc trong `web/src/`:
- `app/`: Chỉ chứa routing (ví dụ: `app/admin`, `app/login`).
- `core/`: Components dùng chung toàn app (ví dụ: Button, Input) và utils.
- `features/<feature_name>/`:
  - `components/`: UI riêng của feature.
  - `hooks/`: Custom hooks chứa logic UI.
  - `services/`: API calls (ví dụ tới Supabase).
  - `types/`: TypeScript interfaces và types.

## 3. Backend Dart và hạ tầng Supabase
- `apps/api` (Dart Frog) là backend nghiệp vụ duy nhất.
- Supabase cung cấp Auth, PostgreSQL, RLS và Storage; Supabase không phải nơi để
  client thực thi nghiệp vụ tài chính trực tiếp.
- Next.js và Expo chỉ dùng Supabase SDK để quản lý phiên đăng nhập. Mọi dữ liệu
  nghiệp vụ phải đi qua REST/OpenAPI của Dart API.
- Edge Function TypeScript hiện có là legacy và phải được chuyển sang Dart API
  trước khi xóa.
