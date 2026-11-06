# Triển khai sổ doanh thu, ưu đãi, thông báo, phiên bản — 05/11/2026

Nhánh `fix/mobile-completion-plan`; commit `65e5458f`, sửa worker `2c79d570`. Plan: [PICKET_MASTER_PLAN_20261105.md](plans/PICKET_MASTER_PLAN_20261105.md) đợt 1–4.

## Kiểm tra trước khi phát hành

- SQL (PGlite, toàn bộ migration): 21 suite PASS, gồm 4 suite mới `revenue-ledger`, `billing-promotions`, `app-announcements`, `app-releases`.
- API 174, web 62, landing 14, Edge 16, worker 19 PASS; lint/typecheck mobile và web sạch. Mobile toàn bộ PASS (code mobile chưa phát hành, chờ APK ở đợt 9).
- Đọc lại Google Play bằng Publisher API (edit tạm, đã xóa, không commit): `alpha` và `internal` code 28 `completed`. Closed testing không bị thay đổi.

## Rollout

| Bước | Kết quả |
| --- | --- |
| Backup | Schema 360.124 byte, dữ liệu 2.772.450 byte; SHA-256 trong `.artifacts/ledger-promo-notice-rel-20261105/backup.sha256` (local) |
| Migration | `20261105120000_revenue_ledger`, `…140000_billing_promotions`, `…160000_app_announcements`, `…180000_app_releases`; lịch sử khớp **trước** khi chuyển container |
| Image | API/web/worker tag `ledger-promo-notice-rel-20261105`; worker sửa lại `worker-ua-20261105`. `env.before` lưu trong từng thư mục release |
| Edge Function | `verify-purchase`, `play-notifications` (ghi sổ doanh thu cho đơn Google Play) |
| Smoke | API ok, Web 200, Auth 401, CORS, TLS; `/v1/announcements` công khai trả feed rỗng; `/v1/admin/revenue` không token trả 401 |
| Manifest | `/v1/releases/landing` khớp `https://picketfinance.com/release.json` (code 28, SHA-256 `1713c3df…`, 161.644.903 byte) |
| Worker | Readback landing OK; đối soát PayOS 0/0; chu kỳ admin hoàn tất |

## Sự cố trong lượt và cách xử lý

- Worker gọi landing bằng User-Agent mặc định của Python nên bị bộ lọc bot trả 403. Lỗi này có từ trước: health probe landing luôn báo “down”. Ngoài ra, khi readback lỗi, worker ghi lỗi vào một nguồn ingest không tồn tại, làm hỏng cả chu kỳ nhập số liệu admin trong khoảng 10 phút. Đã sửa: worker gửi UA riêng, readback lỗi chỉ ghi log. Đã triển khai lại và kiểm tra.

## Rollback

Khôi phục `env.before` của release tương ứng → `up -d --no-deps api web admin-worker`. Các bảng mới chỉ thêm, không sửa dữ liệu cũ. Riêng `payment_reserve` nhận thêm tham số `p_code` có mặc định, nên API cũ vẫn gọi được.

## Việc chủ dự án có thể làm ngay trên web admin

- **Doanh thu:** tổng hợp đã xác nhận / tạm tính / cần đối soát, tách theo nguồn, truy vết từng khoản, xuất CSV, hoàn tiền (cần MFA).
- **Ưu đãi:** tạo, tạm dừng, đổi %, giới hạn suất (ví dụ sáng lập 100 suất), mã ưu đãi.
- **Thông báo hệ thống:** ưu đãi, sự cố, bảo trì (có thể chặn app), nhắm theo kênh, gói, phiên bản.
- **Phiên bản:** xem phiên bản đang phát hành trên từng kênh, ghi nhận APKPure/landing, đặt phiên bản tối thiểu bắt buộc.

Quyền mới: `revenue.adjust`, `promotions.manage`, `announcements.manage` (owner có sẵn; cấp cho người khác ở trang Phân quyền). Đọc lại Google Play trong worker đang tắt (`PLAY_TRACK_READBACK`). Cần cấp quyền Publisher API cho service account của worker trước khi bật.
