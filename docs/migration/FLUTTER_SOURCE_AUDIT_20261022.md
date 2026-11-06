# Audit source Flutter còn sót — 22/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Kết luận trong phạm vi kiểm tra

Không tìm thấy Flutter runtime/source client đang tồn tại trong working source cần xóa hoặc chuyển tiếp. Git history vẫn được giữ để truy vết; không xóa lịch sử Git hay SDK Flutter cài trên laptop. Không phát hiện thêm nhóm chức năng chỉ còn ở source Flutter mà chưa có đích Expo trong đối chiếu dưới đây. Điều này không thay thế nghiệm thu mọi chi tiết nghiệp vụ, điện thoại thật hay Billing sandbox.

## Phương pháp và số liệu

- `git ls-tree -r --name-only adce153^ -- mobile/lib`: 63 file Dart lịch sử, gồm core/theme/media/security/notifications, auth, billing, capture, finance, partners, settings và admin.
- `git ls-files '*.dart'`: **94 file**, tất cả ở `apps/api`; **0 file Dart ngoài backend**.
- `git ls-files mobile ...`: **0 đường dẫn thuộc client Flutter `mobile/` cũ**. Không còn Flutter entrypoint `lib/main.dart`, pubspec Flutter, project iOS Flutter hoặc plugin registry Flutter trong source hiện hành.
- `git grep -n -i flutter -- '*.yml' '*.yaml' '*.json' '*.toml' '*.gradle' '*.gradle.kts' '*.dart'`: không có match trong tracked build/config/Dart. `apps/api/pubspec.yaml` sử dụng `dart_frog`, HTTP và Dart test; không phụ thuộc `sdk: flutter`.
- CI `.github/workflows/source-validation.yml` có landing, shared-contracts, API Dart, web Next, deployment, Expo và backend SQL; không có job Flutter.
- Đối chiếu file/screen lịch sử với route và feature/core hiện tại, cùng các bằng chứng trong [parity](FEATURE_PARITY.md) và [nghiệm thu máy ảo](PART1_ACCEPTANCE_20261022.md). Không tạo lại source Flutter vào working tree.

## Nhóm màn hình/nghiệp vụ lịch sử → Expo hiện tại

| Nhóm Flutter lịch sử | Đích Expo/source hiện tại |
| --- | --- |
| Auth gate, đăng ký/đăng nhập, secure session | `src/app/(auth)`, `src/app/auth`, `src/features/auth` |
| Onboarding | `src/app/onboarding.tsx` |
| Home/app shell/theme/widgets | `src/app/index.tsx`, `_layout.tsx`, `src/core/ui`, design tokens dùng chung |
| Ví và đối soát | `src/app/accounts`, `src/app/reconcile.tsx` |
| Danh mục | `src/app/categories` |
| Giao dịch/form/amount editor/detail | `src/app/transactions`, component nhập tiền dùng chung |
| Transfer/split/refund | `transactions/transfer.tsx`, `transactions/[id]/splits.tsx`, `refund.tsx` |
| Activity tools/bulk | `src/app/transactions/bulk.tsx`, `src/app/review-inbox.tsx` |
| Ngân sách/planning/chốt tháng | `src/app/budgets`, `src/app/planning.tsx`, core guest và Dart/SQL cloud |
| Insights | `src/app/insights.tsx` |
| Bills/subscriptions | `src/app/bills`, `src/app/subscriptions` |
| Kỷ vật/form/photo storage | `src/app/keepsakes.tsx`, `src/features/keepsakes` |
| Camera/OCR/parser | `src/app/capture`, `src/app/receipts`, `src/core/ocr`, `src/app/receipt-saved.tsx` |
| Notifications/reminder dates | `src/app/notifications.tsx`, `src/features/notifications` |
| Partner Notice | `src/features/partners` |
| Device lock/cipher/security settings | `src/features/security`, native modules và profile |
| Local SQLite/cloud repository/controller | `src/core/local`, `src/core/cache`, `src/features/sync`, finance providers |
| Conflict/sync settings | `src/app/sync-conflicts.tsx`, `src/features/sync`, profile |
| Profile/export/restore | `src/app/profile.tsx`, `src/app/restore.tsx`, `src/core/export` |
| Xóa tài khoản | `src/app/delete-account.tsx` |
| Pricing/Billing | `src/app/billing.tsx`, `src/features/billing`; Play sandbox vẫn chưa nghiệm thu |
| Admin | `src/app/admin.tsx`, `src/features/admin`; chủ sở hữu dùng web `/admin` hiện có |

Các đường dẫn Expo trong bảng tương đối với `apps/mobile`. Đây là mapping triển khai, không tự nâng mọi ca thành verified. Không có danh sách chức năng Flutter mới được xác định thiếu để implement trong lượt audit này; nếu phát hiện khác biệt hành vi cụ thể, mở regression theo ca thay vì khôi phục Flutter.

## Vì sao không xóa mọi tên có chữ Flutter?

`apps/mobile/src/core/export/flutter-compatible-backup.ts` là **TypeScript Expo**, đang được `profile.tsx` và `restore.tsx` import cho cả backup cloud lẫn guest. Xóa file này sẽ làm hỏng xuất/nhập hiện hành, không phải dọn Flutter.

`legacy-to-guest.ts`, test codec/converter và các chuỗi `picket-backup-v1` là tương thích định dạng dữ liệu cũ, không gọi Flutter SDK. Giữ nguyên các phần này và format mã hóa để không làm mất khả năng phục hồi backup. Tài liệu lịch sử về Flutter cũng được giữ làm chứng cứ migration, không phải runtime.

Vì source Flutter đã được xóa ở migration trước, **không có file Flutter runtime nào bị xóa thêm trong lượt này**. Không xóa `.dart` backend, pubspec backend, bộ test, build pre-commit, APK, SDK hệ thống hoặc code backup Expo chỉ vì nhầm với Flutter.

## Kiểm tra lại

- `npm run test:mobile`: 344/344 tests trong 11 nhóm của script root đạt, không skip. Đây là phạm vi script root chạy trong lượt audit; không thay số 415 của bộ rộng hơn đã ghi ở checkpoint phát hành thành kết quả vừa chạy.
- `npm --prefix web run test:auth`: 3/3 PASS; Node có cảnh báo MODULE_TYPELESS_PACKAGE_JSON hiện hữu.
- Kiểm tra trang forgot-password public: HTTP 200, có form gửi hướng dẫn. Chủ sở hữu đã tự reset mật khẩu và xác nhận mở `/admin` được.
- Link audit/diff kiểm tra riêng; không sửa UI/runtime, không cần rebuild APK/Next cho thay đổi tài liệu và provision account này. Không tuyên bố đã chạy lại lint/typecheck/build hoặc coverage ở lượt này.
