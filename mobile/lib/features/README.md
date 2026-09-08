# Features Directory
Thư mục này chứa các module tính năng theo Clean Architecture.

Cấu trúc chuẩn của một feature:
```
lib/features/<feature_name>/
  ├── data/ (Models, Data Sources, Repositories Impl)
  ├── domain/ (Entities, Repositories Interfaces, Use Cases)
  └── presentation/ (Screens, Widgets, State)
```
