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

Flutter vẫn là ứng dụng phát hành hiện tại. Expo được phát triển song song và chỉ thay thế Flutter sau khi các luồng đăng nhập, tài chính, đồng bộ, OCR và kiểm thử thiết bị đạt feature parity.

## Ranh giới trách nhiệm

### Dart Frog API

- Nhận Supabase access token qua `Authorization: Bearer ...`.
- Xác minh token với Supabase Auth.
- Dùng publishable key cùng JWT người dùng khi gọi REST/RPC, vì vậy RLS vẫn là lớp bảo vệ dữ liệu cuối cùng.
- Không đưa `service_role` hoặc secret key vào client hay API façade.
- Dùng optimistic concurrency qua `expectedRevision`; xung đột trả HTTP `409`.
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

Flutter đã có bước 1–3 và cờ `needsFallback`. Dịch vụ PP-OCR và native ML Kit module cho Expo là giai đoạn kế tiếp; `expo-dev-client` đã được thêm vì OCR native không chạy trong Expo Go mặc định.

## Lộ trình tiếp theo

1. Đưa đăng nhập Supabase và refresh session vào Next.js/Expo.
2. Chuyển lần lượt dashboard, giao dịch, ngân sách và đồng bộ sang shared API client.
3. Xây OCR module Expo bằng ML Kit Latin, benchmark trên Android RAM thấp.
4. Triển khai PP-OCRv5 service với giới hạn kích thước, timeout, rate limit và chính sách xóa ảnh ngay sau xử lý.
5. Di chuyển dữ liệu snapshot cũ (nếu có trên production) sang 15 bảng domain và ngừng cấp quyền cho RPC snapshot cũ.

## Biến môi trường

| Thành phần | Biến | Ghi chú |
| --- | --- | --- |
| Dart API | `SUPABASE_URL` | URL HTTPS của Supabase project |
| Dart API | `SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key, không dùng secret key |
| Dart API | `ALLOWED_ORIGINS` | Danh sách origin web, phân cách bằng dấu phẩy |
| Next.js | `NEXT_PUBLIC_API_URL` | URL Dart API thấy được từ trình duyệt |
| Expo | `EXPO_PUBLIC_API_URL` | URL Dart API thấy được từ thiết bị/emulator |
