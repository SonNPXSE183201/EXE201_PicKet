# Triển khai bản sửa lỗi máy chủ — 07/11/2026

Nhánh `merge/mobile-figma` (chưa lưu phiên bản). Lỗi gốc lấy từ đợt kiểm thử 73 chức năng: `docs/plans/MOBILE_COMPLETION_API_TEST_PLAN_20261106.md`.

## Thay đổi

| # | Lỗi | Cách sửa | Nơi sửa |
|---|---|---|---|
| 1 | Khôi phục bản sao lưu thất bại khi tài khoản từng chuyển tiền giữa các ví | Khi khôi phục, bỏ qua danh mục trên giao dịch chuyển ví, nên bản sao lưu cũ có nhãn "Khác" vẫn khôi phục được | `supabase/migrations/20261107090000_restore_transfer_category.sql` |
| 2 | Danh mục tự tạo đổi mã sau khi khôi phục làm ngân sách cũ lỗi | Bản sao lưu mới lưu kèm mã danh mục; khôi phục giữ nguyên mã. Không chiếm được mã của tài khoản khác | Cùng migration + `apps/api/lib/src/import_contract.dart` |
| 3 | Đối soát ví của người khác trả mã lỗi 502 thay vì 404 | Đổi đúng mã lỗi "không tìm thấy" | `apps/api/lib/src/supabase_gateway.dart` |
| 4 | Mã mua hàng Google Play không hợp lệ trả 502 | Trả 422 (không xác minh được); chỉ trả 503 khi Google gặp sự cố thật | `supabase/functions/_shared/google_play.ts`, `verify-purchase/index.ts`, API |
| 5 | Hoá đơn cũ hơn 50 bản gần nhất không liên kết được với giao dịch | Thêm tìm hoá đơn theo giao dịch: `GET /v1/receipts?transactionId=` | API + `packages/api-client` (ứng dụng đã dùng, tương thích với máy chủ cũ) |

## Kiểm tra trước khi triển khai
- Toàn bộ kiểm thử dự án đạt (`npm run test`): trang giới thiệu, ứng dụng, web, máy chủ (188), hàm Supabase (18), cơ sở dữ liệu (24 bộ).
- Chạy thử áp dụng cơ sở dữ liệu (không ghi): chỉ đúng một thay đổi `20261107090000_restore_transfer_category.sql`.
- Migration chỉ `create or replace` hai hàm `load_normalized_finance` và `save_normalized_finance`. Chế độ quyền giữ nguyên như bản trước.

## Cách chạy
Tập lệnh `.artifacts/server-fix-20261107/deploy.ps1` (không lưu phiên bản). Từ thư mục gốc dự án:

```powershell
pwsh .artifacts/server-fix-20261107/deploy.ps1
```

Thứ tự: cơ sở dữ liệu → hàm Google Play → API → kiểm tra nhanh. Bước nào lỗi thì dừng ngay.

## Khôi phục
- **API:** trên VPS, chép `/opt/picket/deploy/releases/server-fix-20261107/env.before` đè lên `/opt/picket/deploy/.env.production`, rồi `docker compose ... up -d --no-deps api`.
- **Hai hàm cơ sở dữ liệu:** chạy `.artifacts/server-fix-20261107/rollback-functions.sql`. File này là định nghĩa đang chạy trên máy chủ trước 07/11, lấy từ `20261024100000_wallet_currency_backup.sql`. Nên chạy bằng một migration tiến mới, không xoá lịch sử migration.
- **Hàm verify-purchase:** triển khai lại bản trước từ lịch sử mã nguồn.

## Lưu ý
- Không sao lưu được toàn bộ dữ liệu bằng `db dump`: cần Docker Desktop, và lệnh xuất dữ liệu người dùng bị chặn trong phiên tự động. Thay đổi lần này không đụng tới dữ liệu.
