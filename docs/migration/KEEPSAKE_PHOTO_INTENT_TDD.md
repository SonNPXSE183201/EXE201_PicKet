# Kỷ vật: giữ ảnh khi chỉ sửa metadata — 2026-10-18

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Nguồn: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), mục 2/4; lỗi tìm thấy trong [KEEPSAKE_CACHE_FAILURE_TDD.md](KEEPSAKE_CACHE_FAILURE_TDD.md). Phạm vi là Expo Android, không đổi BE/API/Storage policy.

## Hành vi và TDD

Người dùng sửa tên/ghi chú offline của món đã có ảnh cloud, restart rồi nối mạng: giữ nguyên ảnh, không upload bản sao, không xóa cache ảnh khi bỏ outbox.

- RED: bốn test mới trong `keepsake-outbox-policy.test.ts` thực thi và thất bại vì thiếu hàm policy (4 test cũ đạt).
- GREEN: persisted `photoUploadRequired` phân biệt ảnh chọn mới với ảnh tải cache; cùng target 8/8 đạt. Ảnh mới vẫn giữ intent qua các lần sửa tiếp. Intent yêu cầu upload nhưng thiếu file URI bị từ chối.
- SQLite thêm cột nullable `photo_upload_required`, không xóa queue cũ. NULL giữ trạng thái chưa biết và xử lý bảo thủ như trước, tránh bỏ ảnh thay thế từ bản cũ. Bản cache cloud mới đánh dấu false; ảnh người dùng chọn đánh dấu true.
- Replay metadata dùng mediaPath hiện hữu. Khi xóa outbox sau thành công, giữ file nếu display mới đang tham chiếu cùng URI.
- `npm run test:mobile`: 152/152 PASS. Mobile typecheck PASS; lint 0 lỗi/24 cảnh báo cũ; ESLint các file increment không có cảnh báo.
- Node test coverage policy: lines 100%, branches 96%, functions 92.31%. Đây không phải coverage của toàn bộ media hoặc SQLite adapter.
- Không checkpoint commit: giữ các thay đổi trước và không commit/push trong increment này.

## Pixel 5: nghiệm thu một ảnh

Package QA cô lập `com.picket.mobile.qa`, user A/B vừa sinh; không đọc phiên hay sửa dữ liệu Google trong package chính. Dùng ảnh corpus CORD, không chạy OCR trong ca này.

1. Seed ID `4c4a04bc-c671-4146-8816-9e05aad54fc6`, version 1, 12.345 ₫. Storage ban đầu đúng một object `f111fdac-92e4-4a01-810d-5b3f91e1ded9.jpg`, object ID `443dbc86-d5eb-4041-9b1e-9aca8ddca5d6`.
2. Cài QA APK, đăng nhập A, mở bộ sưu tập/tải ảnh. Airplane bật, Wi-Fi tắt và gỡ reverse; force-stop/restart, sửa tên qua UI thành `QA_KEEP_METADATA_FIXED`, lưu offline.
3. Snapshot SQLite của riêng package QA sau force-stop: cùng ID/version 1/mediaPath gốc, `photo_upload_required=0`. Restart offline vẫn có tên mới và ảnh đầy đủ; đã xem screenshot, không chỉ XML.
4. Nối mạng/rời/quay lại màn: API trả cùng ID/title mới/version 2/mediaPath gốc. Storage vẫn đúng một object cùng tên và object ID; queue SQLite rỗng. Proxy ghi PATCH 200 cho ID này.
5. Force-stop, tắt mạng, mở lại: ảnh và metadata còn hiển thị đầy đủ. Screenshot sau sync đã xem trực quan.
6. Dọn toàn bộ ảnh trong đúng thư mục user QA vừa tạo, audit `objects: []`; purge/xóa cả A/B. Đây là fixture dùng xong, không thể tiếp tục dùng tài khoản QA đã xóa. QA force-stop, proxy dừng, mạng/giờ tự động/font 100% khôi phục.

Evidence ignored: `.artifacts/roadmap-qa/photo-intent-*.xml`, `photo-intent-offline.png`, `photo-intent-post-sync.png`, `photo-intent-proxy-events.json`; helper `qa-keepsake-db.py` chỉ đọc DB package QA, không đọc auth.

## Giới hạn còn lại

- Queue/cache cũ chưa có intent có thể vẫn upload lại ảnh một lần; không đoán ảnh cũ hay ảnh mới từ mediaPath.
- Upload ảnh mới rồi API mất response, retry không nhân ảnh và cleanup ảnh cũ bền vững chưa hoàn tất. Không nâng toàn bộ media queue thành verified.
- Thay ảnh offline rồi sửa tiếp khi online, upload/request đồng thời, đổi owner giữa chừng, nhiều ảnh/eviction cần ca riêng.
- Không coi đây là kiểm thử migration đầy đủ mọi schema cũ hoặc disk-full native. Ảnh kỷ vật cache là file theo owner, chưa chứng minh mã hóa mọi file ảnh.
- Chưa build ARM64/kiểm thử điện thoại thật trong increment này.

## Binary và smoke

- QA build PASS; production x86_64 `assembleRelease` PASS (1m13s), `apksigner verify` PASS. Bundle có HTTPS API production và không có loopback QA.
- APK cập nhật: `.artifacts/ui-redesign/picket-completion-emulator.apk`, SHA-256 `2FC40223FC926698B17DD9A5F0FDE4F41257486E7457BD769CBE5FBADA6C56F0`.
- Install `-r` Success; cold start vẫn `Chào Son Nguyen`, số dư `-261.345 ₫`, không đổi dữ liệu chính. Lần đầu bị dialog hệ thống Android “Process system isn't responding”; chọn Wait, app mở được. Khôi phục airplane bằng `cmd connectivity airplane-mode disable`, Wi-Fi đã connected/VALIDATED, mở lại không còn banner dữ liệu cache.
- Evidence cuối: `photo-intent-final-production.xml`. Không commit/push/deploy BE. `git diff --check` không có lỗi whitespace (có cảnh báo CRLF cũ); scan giới hạn file keepsake không tìm thấy secret pattern/console.log. Đây không phải security audit toàn dự án.
