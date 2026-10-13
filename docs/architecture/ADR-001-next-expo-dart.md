# ADR-001: Next.js, Expo và Dart là stack đích

- Trạng thái: Accepted
- Ngày: 2026-10-08

## Bối cảnh

Repository đang có ba client: Flutter đầy đủ nghiệp vụ, Expo ở mức nền móng và
Next.js ở mức landing page. Business rule, persistence và tích hợp thanh toán
đang phân tán giữa Flutter, PostgreSQL RPC và Supabase Edge Functions.

## Quyết định

- Next.js là web client và admin portal.
- Expo/React Native là mobile client Android/iOS.
- Dart Frog là backend nghiệp vụ duy nhất.
- Supabase chỉ cung cấp Auth, PostgreSQL/RLS và Storage.
- Client chỉ dùng Supabase SDK cho phiên đăng nhập; dữ liệu nghiệp vụ đi qua
  REST/OpenAPI của Dart API.
- Flutter được đóng băng. Không thêm feature/business rule mới và chỉ sửa lỗi
  bảo mật, crash hoặc mất dữ liệu trong thời gian chuyển đổi.
- Edge Function TypeScript hiện có phải được chuyển sang Dart trước khi xóa.
- Snapshot API là compatibility layer tạm thời và phải được thay bằng CRUD cùng
  incremental sync theo entity.

## Chia sẻ giữa Next.js và Expo

Hai client chia sẻ domain DTO, generated API client, validation, design tokens
và analytics contracts. Component giao diện web và native được tách riêng vì
DOM và React Native không có cùng primitive.

## Hệ quả

- Mọi rule có ảnh hưởng đến số tiền hoặc quyền truy cập phải được kiểm tra ở
  Dart backend.
- Expo cần local SQLite/outbox để hỗ trợ offline, nhưng PostgreSQL vẫn là source
  of truth.
- Không xóa Flutter trước khi toàn bộ mục P0 trong parity matrix đạt `verified`.
- Migration phải có rollback window và không được làm mất dữ liệu hiện hữu.

## Tiêu chí hoàn tất chuyển đổi

- Expo đạt parity về auth, onboarding, finance, offline sync, OCR, billing,
  privacy/export/delete và deep link.
- Next.js có dashboard người dùng và admin theo quyền.
- Không còn client gọi trực tiếp bảng finance hoặc Edge Function nghiệp vụ.
- Snapshot compatibility API không còn traffic production.
- Release Expo ổn định qua ít nhất một chu kỳ phát hành có staged rollout.
