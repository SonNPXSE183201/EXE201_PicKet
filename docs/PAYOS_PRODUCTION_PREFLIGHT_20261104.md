# PayOS — backup, diễn tập migration và chuẩn bị rollout 04/11/2026

Báo cáo tại thời điểm trước rollout: đã hoàn tất backup và diễn tập trên bản sao database; khi đó chưa áp migration lên production, deploy image mới, bật PayOS/PIN hoặc tạo thanh toán thật. SMS tiếp tục để lại theo yêu cầu.

Cập nhật sau lượt preflight này: migration, API/web/worker và PayOS/PIN đã được triển khai; xem [báo cáo production](PAYOS_PRODUCTION_DEPLOYMENT_20261104.md). Nội dung bên dưới giữ trạng thái và bằng chứng tại thời điểm diễn tập.

## Kết quả kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Lịch sử DB | 51 migration production đều có file tương ứng trong repository |
| Migration chờ | Chỉ `20261103173421_payos_auth_permissions.sql`; CLI 3.0.0 dry-run xác nhận |
| Backup | Custom archive PostgreSQL, 1.168.213 byte, 1.370 mục TOC; `pg_restore --list` đọc thành công |
| Bản sao ngoài VPS | Đã tải về local và đối chiếu SHA-256 trùng khớp |
| Khôi phục | Thành công trên image Supabase PostgreSQL `17.11.0.002`, cùng PostgreSQL 17.11 với production |
| Migration trên bản sao | Thành công trong một transaction, dùng role `postgres` không có SUPERUSER |
| Kiểm thử SQL | `supabase/tests/payos-auth-permissions.sql` chạy thành công trên bản sao và rollback fixture |
| Dữ liệu hiện có | Đối chiếu số dòng và digest nội dung của **86 bảng** trước migration và sau kiểm thử: không đổi |
| Quyền mới | Không có bảng public mới thiếu RLS; `anon` không gọi được RPC mới; `authenticated` không gọi được RPC dành cho server hoặc đọc PIN vault |
| Kiểm thử Dart | **168/168**, gồm **19** test PayOS/PIN; `dart analyze` không có vấn đề |
| Production sau kiểm tra | Sáu container cũ vẫn chạy, không restart; web và API health trả HTTP 200; Google Play Billing vẫn bật |

Container diễn tập dùng `--network none`, không publish cổng, dữ liệu nằm trên tmpfs, cron bị tắt. Chỉ cấp SUPERUSER tạm thời cho role của bản sao khi khôi phục extension; đã thu hồi trước khi áp migration và chạy test. Container cùng dữ liệu tạm đã được xóa. Không thay role hoặc dữ liệu của database production.

Số lượng kiểm chứng bổ sung: 13 user, 72 session Auth, 68 object metadata Storage, 1 staff và 51 bản ghi lịch sử migration đều giữ nguyên trên bản sao. Migration diễn tập chạy trực tiếp bằng `psql`, nên không thêm lịch sử migration vào bản sao; khi rollout thật, Supabase CLI chịu trách nhiệm ghi lịch sử.

## Vị trí bản backup

- VPS: `/opt/picket/deploy/backups/payos-preflight-20261103T193132Z/database.dump`.
- Local: `.artifacts/payos-rollout-preflight-20261104/database.dump`.
- SHA-256: `9feb4d3f77ec874f67e3c7bd1b84f4230337055bebd626685da986650b4fe918`.
- Thư mục trên VPS có quyền `0700`, file có quyền `0600`; `.artifacts` được Git bỏ qua.

Archive có schema, dữ liệu DB, Auth, lịch sử migration và metadata Storage. **Không chứa nội dung file/ảnh trong Storage**, cấu hình OAuth của project hoặc bản sao cấu hình VPS. Đây là backup logic để phục hồi có kiểm soát; không phải bản sao toàn bộ dịch vụ Supabase. Không chạy restore đè lên production đang có dữ liệu mới.

Manifest và báo cáo chỉ chứa metadata tại `.artifacts/payos-rollout-preflight-20261104/`: `backup-manifest.json`, `rehearsal-result.json`, `final-status.json`, `migration-dry-run.log`. Archive chứa dữ liệu riêng tư, không đưa vào Git hoặc gửi trong chat.

## Sửa lỗi phát hiện khi chuẩn bị rollout

`POST /v1/billing/payos/order` với action `refresh` có thể gọi tạo link cho đơn đã reserve, đi qua lớp service mà trước đây chưa kiểm tra `PAYOS_ENABLED`. Đã thêm chốt tại `PayosService.create()` trước khi tạo HTTP client: cờ tắt trả 503, không gọi PayOS/Supabase. Test mới đã chạy RED trước sửa và GREEN sau sửa. Webhook và đối soát đơn cũ vẫn hoạt động khi giữ credentials và tắt mua mới.

## Trình tự rollout còn lại

1. Tạo backup mới ngay trước cutover để bao gồm thay đổi phát sinh sau bản backup này. Giữ image và file cấu hình đang chạy để có thể phục hồi vận hành.
2. Đồng bộ source đã review lên VPS, build/tag riêng API và web; giữ nguyên image cũ. Không ghi đè tag đang dùng để làm mất image rollback. Khi cập nhật worker cũng cần giữ image ID cũ trước khi build.
3. **Giữ file `/opt/picket/deploy/.env.production` hiện có**, chỉ bổ sung các biến PayOS/PIN từ file local bằng kênh SSH. Các khóa mới hiện có giá trị ở local, chưa có trên VPS; chưa xác minh hiệu lực với provider. Giữ `GOOGLE_PLAY_BILLING_ENABLED=true` của VPS: file local hiện là `false`, nên không copy đè toàn bộ file. Giữ cấu hình OAuth, OCR, ACME và image khác đang chạy.
4. Lúc đầu đặt `PAYOS_ENABLED=false`, `QUICK_LOGIN_ENABLED=false`. Kiểm tra cấu hình bằng `docker compose --env-file deploy/.env.production -f compose.production.yml config --quiet`, không in cấu hình đã nội suy ra log.
5. Áp đúng một migration bằng Supabase CLI từ root repository đã liên kết đúng project. Các lệnh dưới đây là bước rollout **chưa thực hiện**, không phải kết quả của lượt preflight:

   ```powershell
   npx --yes supabase@3.0.0 db push --remote --skip-vault --dry-run
   npx --yes supabase@3.0.0 db push --remote --skip-vault
   ```

   Dry-run phải chỉ liệt kê migration nêu trên. Không thêm `--include-all`, `--include-seed`, sửa lịch sử migration hoặc reset DB. `--skip-vault` tránh cập nhật Vault từ config trong bước chỉ triển khai schema. Sau khi áp, chạy security advisors và đối chiếu lịch sử migration. Không chạy file SQL chứa fixture kiểm thử trên production.
6. Deploy API/web theo tag mới với hai cờ vẫn tắt. Kiểm tra health, đăng nhập Google và email/mật khẩu bằng tài khoản QA, quyền owner, quyền tùy chỉnh, API receipt/OCR và khả năng khôi phục gói Google Play. Tài khoản email cũ vẫn dùng được; chưa bắt buộc gắn SĐT khi chưa có OTP.
7. Đăng ký webhook `https://api.picketfinance.com/v1/billing/payos/webhook` trong PayOS sau khi endpoint mới hoạt động. Kiểm tra request xác nhận; không cấp gói theo return URL hoặc sample webhook.
8. Bật PayOS và cập nhật `admin-worker` thuộc profile `admin` để chạy đối soát. Nghiệm thu một giao dịch thật đã thống nhất: receipt/reference duy nhất, đúng giá/gói/hạn, doanh thu và gửi lặp webhook không cấp trùng. Chưa có nghiệm thu tiền thật trong lượt này.
9. Chỉ bật PIN sau nghiệm thu cookie/session thật: enrollment, PIN sai/đúng, khóa lại, refresh, logout/revoke. Build QA Android riêng khi cần; artifact Google Play tiếp tục dùng Play Billing với `PICKET_PLAY_BUILD=1`.

Nếu cần dừng mua mới, tắt `PAYOS_ENABLED` nhưng giữ credentials và handler webhook/đối soát để xử lý tiền của đơn cũ. Không rollback DB hoặc xóa entitlement đã bán. Việc rollback API/web khi PIN đã được bật cần xử lý các phiên bị khóa; chưa nghiệm thu hạ phiên bản sau khi đưa PIN vào sử dụng.

Giới hạn: audit quyền trên bản sao không thay thế Supabase advisors sau migration production; test mock không chứng minh key PayOS đúng, giao tiền thành công hoặc cookie/Auth hoạt động end-to-end. Kết quả ở đây là hoàn tất chuẩn bị và diễn tập, chưa phải nghiệm thu production.
