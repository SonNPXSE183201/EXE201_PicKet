# Android 1.0.6 / code 19 — 27/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).

[Trạng thái dự án](../PROJECT_STATUS.md).

## Thay đổi

- Hoàn thiện VI/EN ở xử lý xung đột đồng bộ và chọn từng trường giao dịch.
- Chặn bấm nhanh lặp lại, callback/dialog cũ sau đổi tài khoản/rời màn hình, phản hồi đọc cũ hồi sinh mục vừa xử lý.
- Lỗi queue/load/dismiss được báo có kiểm soát; không hiện nguyên upstream reason.
- Ngày/tiền theo locale và ví; thiếu currency không tự đoán.
- Xử lý các cảnh báo lint mobile còn lại, hiện 0 lỗi/0 warning.
- Đóng gói source giáo trình VI/EN biên tập 2; route học vẫn theo preview/publication gate hiện có, không công bố cloud tự động.

## Validation

- 10 landing, 908 mobile, 54 web, 140 API tests PASS, cùng legacy SQL validation và 13 suite mới.
- Root lint/analyzer/typecheck PASS.
- Native acceptance dùng package riêng com.picket.mobile.acceptance trên Picket_QA_35.
- Tạo version conflict bằng sửa offline và API thay đổi độc lập trên fixture; gửi tiêu đề local, giữ amount server 15.000 VND. API trả đúng một transaction, version 3.
- VI merge và EN empty screenshots đã xem; fixture và credential đã dọn.
- Không thay dữ liệu tài chính tài khoản thật; không xóa bản QA cũ vì signing mismatch.
- Supabase remote không còn migration chờ; 49 migration.

## Phạm vi phát hành

Chủ dự án yêu cầu phát hành bản mới lên landing và Google Play. Google Play dùng **Internal**, giữ alpha closed-test draft theo chỉ đạo trước. Production Play không được suy là đã mở công khai.

APK ARM64 direct và AAB Play build riêng: direct có updater/REQUEST_INSTALL_PACKAGES; Play loại updater/quyền cài APK. Manifest của từng artifact được kiểm tra riêng.

## APK và landing đã xác minh

- APK: `picket-1.0.6-19-production-arm64-v8a.apk`, 80.617.780 byte, package `com.picket.mobile`, min SDK 24.
- SHA-256: `05dd46752fb370c9ff99fb32cc8c5deecd590da3835a1637c6409cab3d985bf5`.
- Signing certificate SHA-256: `07c04346fc367a7ea5c6c08f34704dd3e36e2db0d68bad6d0f722175e4568bce`, khớp bản stable trước.
- [Tải APK](https://picketfinance.com/downloads/picket-1.0.6-19-20261027-05dd4675-arm64.apk).
- Đã tải lại toàn bộ APK trên `picketfinance.com` và `picket.51-79-207-154.sslip.io`: đúng size/hash, MIME và attachment; HTTP range 206 PASS.
- Manifest và HTML đều code 19; APK code 17 cũ, privacy, account-deletion, web login và API health tiếp tục hoạt động.
- Backup metadata landing trước deploy: `/opt/picket/deploy/builds/release19-20261027/before`. Khi rollback, phục hồi metadata/trang cũ, giữ download mới để tránh link đã chia sẻ bị hỏng.
- Log riêng tư: `.artifacts/completion-20261027/release19-live-verification.json` và `release19-direct-verification.json`; artifact lưu trong `.artifacts/releases`, không commit binary.

Không coi release là kết quả camera/sinh trắc thật, Billing sandbox lifecycle, independent content review, real-data forecast hoặc pilot. Thiết bị thật do chủ dự án tự kiểm sau.

## AAB Google Play

- Build release PASS (7 phút 7 giây); `picket-1.0.6-19-google-play.aab`, 57.589.855 byte.
- SHA-256: `5657a802596f94eb423ec58136df6c605348104f81800089676234d5d15df15e`.
- jarsigner verified; certificate khớp APK direct. Manifest đúng package/version/code; 28 thư viện native đều ARM64.
- Không có REQUEST_INSTALL_PACKAGES hoặc SYSTEM_ALERT_WINDOW. Bằng chứng: `.artifacts/completion-20261027/release19-aab-verification.json`.
- Upload Internal thành công, edit ID `13844839609996567917`. Đọc lại track độc lập xác nhận **1.0.6/code 19, completed, rollout 100%**.
- Alpha vẫn code 6 draft; beta/production vẫn trống. Không mở closed test hoặc public production.
- Receipt: `.artifacts/completion-20261027/release19-play-deploy.json` và `release19-play-readback.json`.
