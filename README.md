# Picket

Picket đang được chuyển dần sang kiến trúc đa nền tảng mà không làm gián đoạn ứng dụng Flutter hiện tại.

```text
Next.js web ────┐
                ├── REST / OpenAPI ── Dart Frog ── Supabase / Postgres
Expo mobile ────┘

Flutter mobile (hiện hành, giữ lại đến khi Expo đạt feature parity)
```

## Cấu trúc chính

- `apps/api`: API Dart Frog; xác thực Supabase JWT, giữ nguyên RLS và cung cấp finance snapshot.
- `apps/mobile`: Expo SDK 57 / React Native; nền móng cho mobile mới.
- `web`: Next.js 16; web client mới.
- `packages/api-client`: REST client dùng chung cho Next.js và Expo.
- `packages/domain-ts`: hợp đồng dữ liệu tài chính TypeScript.
- `packages/design-tokens`: màu sắc và kích thước dùng chung.
- `mobile`: Flutter app hiện hành, gồm OCR ML Kit đã tối ưu cho Android cấu hình yếu.
- `supabase`: schema, RLS, RPC và Edge Functions hiện tại.

Chi tiết quyết định kiến trúc và lộ trình nằm trong [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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
