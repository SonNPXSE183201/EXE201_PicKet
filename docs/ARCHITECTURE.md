# Kiến trúc Picket

Phát hành/nghiệm thu hiện hành: [PROJECT_STATUS.md](PROJECT_STATUS.md). Landing APK là static site riêng (`apps/landing`), không thay Next.js; Android kiểm tra manifest HTTPS và xác minh APK native trước khi mở xác nhận cài đặt hệ thống.

## Độ bền dữ liệu và ảnh trên Android

- Draft/picker/outbox/cache được cách ly theo owner; khi OS không giao ảnh sau process death, khôi phục draft đã lưu và nhắc chọn lại, không nhận ảnh không xác định owner.
- Calendar dùng cache preview mã hóa nhỏ riêng, chỉ đọc ảnh đầy đủ khi mở viewer; không giải mã toàn bộ cache ảnh để dựng lịch. Kiểm thử tải lạnh, cuộn và ảnh offline được đo riêng.
- Trước ghi ảnh/preview, dùng dung lượng **khả dụng** của data partition (không tính reserved blocks), chừa headroom; đây là preflight, lỗi ghi cạnh tranh vẫn phải bảo toàn ảnh/metadata cũ.
- Khóa attempt hóa đơn phía server dùng cùng advisory lock với mutation để client chỉ sửa sau xác nhận abandon hoặc hoàn tất transaction đã commit; mất phản hồi không cho phép tái sử dụng key cũ.

Bằng chứng và giới hạn: [nghiệm thu phần 1 ngày 22/10](migration/PART1_ACCEPTANCE_20261022.md). Đây không phải thay đổi stack/backend ngoài các migration/API đã được phê duyệt riêng.

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

Expo là Android client duy nhất. Flutter và iOS không còn nằm trong phạm vi
repository; mọi nghiệp vụ mobile mới phải được triển khai trong `apps/mobile`.

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

1. Thu toàn bộ khung ảnh ở độ phân giải giới hạn, sửa orientation và tránh giữ nhiều bitmap trong RAM. Không crop cố định hóa đơn dài.
2. Chạy Google ML Kit Text Recognition Latin ở local; tái sử dụng recognizer thay vì khởi tạo mỗi lần quét.
3. Parser chấm confidence dựa trên dòng chữ, tổng tiền, ngày và cấu trúc hóa đơn.
4. Chỉ khi confidence thấp hoặc thiếu trường bắt buộc mới gửi ảnh đã nén đến PP-OCR fallback.
5. Luôn cho người dùng xác nhận tổng tiền/ngày trước khi lưu.

PP-OCR chạy ngoài tiến trình API công khai. Dart worker dùng secret key chỉ trong
môi trường server để claim job theo lease, tải ảnh private, gọi model qua HTTPS,
ghi kết quả rồi xóa ảnh khi hết hạn. Expo và Dart Frog API không được nhận biến
`SUPABASE_SECRET_KEY`.

Native ML Kit và fallback đã được triển khai trong Expo/Dart. `expo-dev-client`
là bắt buộc vì OCR native không chạy trong Expo Go.

## Lộ trình tiếp theo

1. Hoàn tất Google OAuth web/Android và accessibility matrix.
2. Xác minh duplicate receipt Expo end to end.
3. Benchmark ML Kit Latin trên Android RAM thấp và corpus hóa đơn mở rộng.
4. Loại traffic snapshot compatibility sau thời gian quan sát production.
5. Hoàn tất Google Play Billing khi có Play Console và thiết bị thật.
6. Chạy staged rollout Android với monitoring và rollback window.

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
