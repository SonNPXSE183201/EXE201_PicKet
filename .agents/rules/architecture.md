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

### A. Mobile App (Flutter)
Áp dụng **Clean Architecture** kết hợp Feature-First. Cấu trúc cho mỗi tính năng trong `mobile/lib/features/<feature_name>/`:
- `data/`:
  - `models/`: Chứa các Data models (kế thừa từ Entity).
  - `datasources/`: Giao tiếp với Supabase hoặc Local DB.
  - `repositories_impl/`: Triển khai các interface từ domain.
- `domain/`:
  - `entities/`: Core business objects (thuần Dart, không phụ thuộc framework).
  - `repositories/`: Interfaces định nghĩa các phương thức.
  - `usecases/`: Business logic (chỉ gọi từ presentation sang repository).
- `presentation/`:
  - `screens/`: UI chính (Pages).
  - `widgets/`: UI thành phần dùng lại trong feature.
  - `state/`: Quản lý trạng thái (Riverpod / BLoC).

Các code dùng chung toàn app đặt ở `mobile/lib/core/`.

### B. Web App (Next.js)
Dùng App Router kết hợp Feature-based. Cấu trúc trong `web/src/`:
- `app/`: Chỉ chứa routing (ví dụ: `app/admin`, `app/login`).
- `core/`: Components dùng chung toàn app (ví dụ: Button, Input) và utils.
- `features/<feature_name>/`:
  - `components/`: UI riêng của feature.
  - `hooks/`: Custom hooks chứa logic UI.
  - `services/`: API calls (ví dụ tới Supabase).
  - `types/`: TypeScript interfaces và types.

## 3. Backend-as-a-Service (Supabase)
- Dự án sử dụng Supabase làm backend chính (PostgreSQL, Auth, Storage).
- Quản lý database migrations và edge functions thông qua Supabase CLI trong thư mục `supabase/`.
- Không gọi trực tiếp SQL queries từ client (Next.js/Flutter) nếu có logic phức tạp cần bảo mật, ưu tiên dùng RLS (Row Level Security) hoặc Database Functions/Edge Functions.
