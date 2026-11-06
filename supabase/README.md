# Supabase Picket

Trạng thái triển khai: [PROJECT_STATUS](../docs/PROJECT_STATUS.md). Project production: `qyokoyopodjtvfyunyde`.

Ngày 27/10/2026, remote đã đồng bộ **49 migration**, mới nhất `20261027052550_restrict_internal_trigger_execution.sql`. Không còn migration chờ theo dry-run sau triển khai. Đây là trạng thái schema; không tự bật AI, công bố bài học hoặc bật tính năng preview trên mobile.

## Kiểm tra và triển khai

Repo dùng migration SQL tuần tự trong `migrations/`. Đọc help của CLI đang cài trước khi dùng; các lệnh sau đã được dùng với CLI 2.122.0:

```powershell
npx supabase migration list --linked
npx supabase db push --linked --dry-run --skip-vault
npx supabase db advisors --linked --type security --level warn
```

Rà SQL và chạy test trước khi push. Triển khai schema đã được duyệt bằng `npx supabase db push --linked --skip-vault`; không thêm `--include-seed` cho production. Không sửa migration history để làm biến mất drift chưa xác minh. Secret nằm trong cấu hình local/remote bảo mật, không in ra log hoặc đưa vào Git.

## Tests và quyền truy cập

Cài dependency test bằng `npm ci --prefix supabase/tests`, rồi chạy `npm run test:db` từ root. `npm test` và backend CI cũng chạy lệnh này. Validator giữ regression cũ, sau đó áp các migration mới và thực thi 13 suite bổ sung; chỉ migration pg_cron được loại khỏi PGlite với thông báo rõ.


`tests/*.sql` chứa các ca rollback-scoped cho appearance/backup, learning/AI, cashflow và trigger guards. Chạy trên database local/cô lập phù hợp, không chạy bộ fixture tổng quát trên tài khoản thật. `internal-trigger-execution.sql` xác nhận client không gọi trực tiếp trigger, đồng thời bảo trì và khóa tài khoản vẫn chặn ghi.

Báo cáo thực thi 27/10 ghi 13 suite PGlite PASS. PGlite không hỗ trợ pg_cron; cron được xác minh metadata remote: `picket-learning-ai-retention` và `picket-learning-ai-cron-history` đều active. Không gọi đây là một lượt Docker PostgreSQL test.

Mọi bảng learning/cashflow mới bật RLS. RPC SECURITY DEFINER cần kiểm tra owner/role và search_path cố định; không thu hồi blanket quyền các RPC nghiệp vụ. Hai trigger nội bộ đã thu hồi direct EXECUTE từ PUBLIC/anon/authenticated.

## Rollback

Ưu tiên rollback API image nếu có lỗi tương thích, giữ schema bổ sung để bảo toàn dữ liệu. Forward fix bằng migration mới; không DROP bảng chứa dữ liệu, không sửa migration đã áp và không chạy reset remote. Publication gate cloud lessons vẫn tắt; AI generation vẫn disabled.

[Báo cáo migration, test và rollout](../docs/migration/PROJECT_COMPLETION_20261027.md).
