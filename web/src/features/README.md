# Features Directory
Thư mục này chứa các tính năng của ứng dụng (Feature-First Architecture).

Cấu trúc chuẩn của một feature:
```
features/<feature_name>/
  ├── components/ (UI riêng của feature)
  ├── hooks/ (Custom hooks chứa logic UI)
  ├── services/ (API calls, tương tác Supabase)
  └── types/ (TypeScript interfaces)
```
