# Kiến trúc Picket

## Trạng thái hiện tại

Giai đoạn nền móng đã tách giao diện mới khỏi dữ liệu bằng REST API:

```text
┌────────────────┐       ┌──────────────────┐
│ Next.js 16     │──────▶│                  │
└────────────────┘       │ Dart Frog API    │──────▶ Supabase Auth
                         │ /v1/finance/...  │──────▶ Postgres + RLS
┌────────────────┐       │                  │
│ Expo SDK 57    │──────▶│                  │
└────────────────┘       └──────────────────┘
         │
         └── ML Kit local trước, OCR fallback khi confidence thấp
```

Expo là mobile client đích. Flutter đã ở trạng thái legacy: không nhận feature
hoặc business rule mới và chỉ được dùng làm chuẩn đối chiếu/regression cho đến
khi Expo vượt qua toàn bộ tiêu chí cutover.

## Ranh giới trách nhiệm

### Dart Frog API

- Nhận Supabase access token qua `Authorization: Bearer ...`.
- Xác minh token với Supabase Auth.
- Dùng publishable key cùng JWT người dùng khi gọi REST/RPC, vì vậy RLS vẫn là lớp bảo vệ dữ liệu cuối cùng.
- Không đưa `service_role` hoặc secret key vào client hay API façade.
- Snapshot và `expectedRevision` chỉ là contract tương thích tạm thời. API đích
  dùng CRUD theo entity, idempotency key và optimistic locking theo record;
  xung đột trả HTTP `409`.
- Hợp đồng máy đọc được nằm tại `apps/api/public/openapi.yaml`.

### Next.js và Expo

- Cùng dùng `@picket/api-client` và `@picket/domain`.
- Không truy cập trực tiếp bảng dữ liệu từ client; finance contract đi qua Dart API/RPC và được lưu trong 15 bảng domain.
- Supabase SDK phía client chỉ nên đảm nhiệm phiên đăng nhập; access token được gửi đến Dart API.

### OCR

Luồng mục tiêu ưu tiên tốc độ và máy Android yếu:

1. Thu ảnh ở độ phân giải giới hạn, sửa orientation và tránh giữ nhiều bitmap trong RAM.
2. Chạy Google ML Kit Text Recognition Latin ở local; tái sử dụng recognizer thay vì khởi tạo mỗi lần quét.
3. Parser chấm confidence dựa trên dòng chữ, tổng tiền, ngày và cấu trúc hóa đơn.
4. Chỉ khi confidence thấp hoặc thiếu trường bắt buộc mới gửi ảnh đã nén đến PP-OCR fallback.
5. Luôn cho người dùng xác nhận tổng tiền/ngày trước khi lưu.

PP-OCR chạy ngoài tiến trình API công khai. Dart worker dùng secret key chỉ trong
môi trường server để claim job theo lease, tải ảnh private, gọi model qua HTTPS,
ghi kết quả rồi xóa ảnh khi hết hạn. Expo và Dart Frog API không được nhận biến
`SUPABASE_SECRET_KEY`.

Flutter legacy đã có bước 1–3 và cờ `needsFallback`; implementation này chỉ là
nguồn tham chiếu. Dịch vụ fallback và native ML Kit module phải được xây trong
Expo/Dart. `expo-dev-client` là bắt buộc vì OCR native không chạy trong Expo Go.

## Lộ trình tiếp theo

1. Khóa Flutter và duy trì feature parity matrix.
2. Chuẩn hóa typed contract và chuyển business rule sang Dart domain package.
3. Thay snapshot write bằng CRUD/incremental sync trên các bảng domain.
4. Đưa Auth, onboarding, finance và offline sync vào Expo.
5. Xây OCR module Expo bằng ML Kit Latin và benchmark Android RAM thấp.
6. Chuyển billing, account deletion và admin action từ Edge Function sang Dart.
7. Chỉ archive/xóa Flutter sau khi hoàn tất cutover checklist.

## Biến môi trường

| Thành phần | Biến | Ghi chú |
| --- | --- | --- |
| Dart API | `APP_ENV` | Dùng `production` trên hosting; bật fail-fast HTTPS/CORS |
| Dart API | `SUPABASE_URL` | URL HTTPS của Supabase project |
| Dart API | `SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key, không dùng secret key |
| Dart API | `ALLOWED_ORIGINS` | Danh sách origin web, phân cách bằng dấu phẩy |
| Dart OCR worker | `SUPABASE_SECRET_KEY` | Secret server-only, không đưa vào API/client |
| Dart OCR worker | `OCR_PROVIDER_URL` | Endpoint PP-OCR private, HTTPS ngoài local |
| Dart OCR worker | `OCR_PROVIDER_TOKEN` | Bearer token tùy chọn của dịch vụ model |
| Dart OCR worker | `OCR_WORKER_ID` | ID duy nhất, tối đa 80 ký tự |
| Next.js | `NEXT_PUBLIC_API_URL` | URL Dart API thấy được từ trình duyệt |
| Expo | `EXPO_PUBLIC_API_URL` | URL Dart API thấy được từ thiết bị/emulator |
