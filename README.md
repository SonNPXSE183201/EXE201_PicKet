# Picket

Picket đang chuyển sang một kiến trúc thống nhất: Next.js cho web, Expo cho
mobile và Dart Frog cho toàn bộ backend nghiệp vụ.

```text
Next.js web ────┐
                ├── REST / OpenAPI ── Dart Frog ── Supabase / Postgres
Expo mobile ────┘

Flutter mobile (legacy reference, không nhận nghiệp vụ mới)
```

## Cấu trúc chính

- `apps/api`: API Dart Frog; xác thực Supabase JWT, giữ nguyên RLS và cung cấp profile/onboarding/preferences cùng finance contract trên 15 bảng chuẩn hóa.
- `apps/mobile`: Expo SDK 57 / React Native; nền móng cho mobile mới.
- `web`: Next.js 16; web client mới.
- `packages/api-client`: REST client dùng chung cho Next.js và Expo.
- `packages/domain-ts`: hợp đồng dữ liệu tài chính TypeScript.
- `packages/design-tokens`: màu sắc và kích thước dùng chung.
- `mobile`: Flutter legacy chỉ dùng để đối chiếu và regression trong quá trình
  chuyển đổi; chỉ nhận bản sửa lỗi bảo mật, crash hoặc mất dữ liệu.
- `supabase`: schema, RLS, RPC và Edge Functions hiện tại.

Chi tiết quyết định kiến trúc và lộ trình nằm trong
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[ADR-001](docs/architecture/ADR-001-next-expo-dart.md) và
[feature parity matrix](docs/migration/FEATURE_PARITY.md).

## Chạy local

Tạo file `.env` từ `.env.example` trong từng ứng dụng cần chạy, sau đó:

```powershell
cd apps/api
dart_frog dev

cd web
npm install
npm run dev

cd apps/mobile
npm install
npm run start
```

Android Emulator truy cập máy host qua `http://10.0.2.2:8080`. Điện thoại thật cần đặt `EXPO_PUBLIC_API_URL` thành IP LAN của máy chạy API.

## Triển khai production một VPS

Stack Caddy + Next.js + Dart Frog + OCR worker + PP-OCR CPU nằm trong
`compose.production.yml`. Hướng dẫn DNS, secret, build, smoke test và rollback:
[deploy/VPS_DEPLOYMENT.md](deploy/VPS_DEPLOYMENT.md).
