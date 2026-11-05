# Triển khai PayOS link 15 phút — 05/11/2026

Commit `412e8d14` (nhánh `fix/mobile-completion-plan`). Plan: [PAYOS_EXPIRY_HARDENING_PLAN_20261105.md](plans/PAYOS_EXPIRY_HARDENING_PLAN_20261105.md).

## Kiểm tra trước khi phát hành

- `npm run test` toàn repo PASS: landing, mobile 1067, web 61, API 171, Edge 14, SQL (gồm suite mới `payos-expiry-hardening`), worker 6.
- Pre-commit: lint/typecheck mobile và web, `dart format` PASS.
- `supabase db push --dry-run`: chỉ một migration `20261105090000_payos_expiry_hardening.sql` (chỉ thay/tạo hàm, không đổi dữ liệu).
- **Không diễn tập trên bản sao DB.** Lý do: migration chỉ `create or replace` hàm và thêm một hàm mới. Đã thay bằng: chạy toàn bộ chuỗi migration trên PGlite, dry-run, và backup.

## Rollout

| Bước | Kết quả |
| --- | --- |
| Backup | `supabase db dump` schema 358.094 byte và dữ liệu 2.766.553 byte; SHA-256 trong `.artifacts/payos-expiry-20261105/backup.sha256` (local, không commit) |
| Source | `git archive` → `/opt/picket/deploy/releases/payos-expiry-20261105/source.tar.gz`, SHA-256 `af139f94…ed28e`; compose trùng nội dung production |
| Image | `picket-api`, `picket-web`, `picket-admin-worker` tag `payos-expiry-20261105`; image cũ `payos-20261103t194746z` / `rbac-mfa-20261103t204838z` giữ để rollback |
| Migration | Lần đầu CLI từ chối (cần `--yes` ở chế độ agent) trong khi container đã được chuyển; áp lại với `--yes` khoảng 2 phút sau. Trong khoảng đó có đúng 1 lần đối soát lỗi (`payment_expire_unlinked` chưa tồn tại), không ảnh hưởng đơn hay tiền |
| Cutover | `env.before` lưu trong thư mục release (0600); `up -d --no-deps api web admin-worker` |
| Smoke | `deploy/smoke.ps1`: API ok, Web 200, Auth 401, CORS ok, TLS headers ok |
| Worker | `reconcile_payos()` trả `{"reconciled":0,"failed":0}`; API không có lỗi mới sau migration |

Bài học: lần sau chạy migration và cutover **tuần tự**, kiểm tra lịch sử migration trước khi đổi container.

## Rollback

1. Khôi phục `env.before` → `up -d --no-deps api web admin-worker`.
2. Nếu cần, áp lại định nghĩa hàm `payment_reserve`, `payment_attach`, `payment_receive`, `payment_dashboard`, `payment_reconcile_queue` từ `20261103173421_payos_auth_permissions.sql` bằng một migration forward mới.

## Còn lại

Nghiệm thu bằng tiền thật và thiết bị (đếm ngược trên app, hủy link cũ, hết hạn) làm cùng APK QA ở đợt 9, vì mobile cần bản build mới.
