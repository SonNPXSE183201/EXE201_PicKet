# Cache kỷ vật và offline edit — 2026-10-18

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Nguồn: `APP_COMPLETION_PLAN.md`, mục 2/4. Increment này sửa cache policy; không sửa upload protocol hoặc backend.

## Lỗi đã sửa theo TDD

Trước sửa, `loadWithKeepsakeCache` bọc API và ghi cache trong cùng try/catch. API thành công nhưng SQLite ghi thất bại sẽ bị xử lý như mất mạng: app trả snapshot cũ, thậm chí hiện lại món đã archive. Nếu đọc cache hỏng thì fallback outbox riêng cũng không được trả.

- RED: `tsx --test src/features/keepsakes/keepsake-cache-policy.test.ts`, 4/8 thất bại đúng bốn nhánh mới.
- GREEN: tách failure API khỏi cache persistence, lỗi đọc cache cho phép dùng fallback riêng; 8/8 đạt.
- Fresh remote luôn thắng snapshot cũ kể cả kết quả rỗng. Không có cache/fallback thì giữ nguyên lỗi API gốc. Không sửa/xóa snapshot tốt khi write thất bại.
- Coverage lệnh Node test coverage cho `**/keepsake-cache-policy.ts`: lines 100%, branches 92.86%, functions 75% (bao gồm declarations của interface trong báo cáo TS); chưa đạt mục tiêu functions 80% của gate. Không trình bày coverage này là toàn bộ media upload.
- `npm run test:mobile`: 148/148; mobile typecheck đạt; lint 0 lỗi/24 cảnh báo cũ. ESLint hai file thay đổi không có cảnh báo.
- Disk-full/cache-corruption là fault injection bằng dependency test, **không** fill ổ hay phá SQLite native. Không commit/push vì các source untracked/chỉnh sửa cũ ngoài increment vẫn được giữ nguyên.

## Pixel 5 QA: ảnh và sửa offline

Package `com.picket.mobile.qa`, tài khoản tạm A/B, API/Storage production thật. Không đọc token hoặc đổi dữ liệu Google ở package chính. Ảnh corpus CORD được seed như ảnh món đồ để kiểm tra tải/cache, không đánh giá OCR.

1. API seed kỷ vật `029d7db0-5029-47fc-8db1-a7f057273358`, title `QA KEEPSAKE PHOTO`, 12.345 ₫, version 1. Một lần chuẩn bị bị 400 vì tên path không hợp format; ảnh từ lần thử này được ghi nhận để dọn, không tính là ảnh do app tạo trùng.
2. QA APK mới build/cài; login A, `/keepsakes` hiển thị metadata và ảnh đầy đủ; screenshot đã xem trực quan.
3. Airplane bật/Wi-Fi tắt/gỡ adb reverse, force-stop/restart, mở lại bộ sưu tập: metadata và ảnh còn nguyên. Screenshot offline đã xem, không chỉ dựa vào XML accessibility.
4. Từ UI sửa tên thành `QA_KEEP_EDIT_OFFLINE`, lưu offline: thông báo lưu an toàn, ảnh còn nguyên. Restart offline lần nữa vẫn thấy tên mới/ảnh/12.345 ₫.
5. Bật mạng/reverse, rời/quay lại màn: API đúng một kỷ vật cùng ID, title mới/version 2; UI còn ảnh. **Nhưng mediaPath bị đổi dù chỉ sửa tên**; Storage có thêm ảnh mới và giữ ảnh cũ. Không đạt tiêu chí một ảnh.
6. Xóa món đồ trên UI có xác nhận: API list trở thành `[]`. Kiểm tra object ảnh và cleanup ghi ở phần chốt sau khi chạy.

Local evidence (ignored): `.artifacts/roadmap-qa/keepsake-online-ready.xml/.png`, `keepsake-offline-restart.xml/.png`, `keepsake-offline-edited.xml`, `keepsake-offline-edit-restart.xml`, `keepsake-reconnect-final.xml`, `keepsake-delete-confirm.xml`, `keepsake-edit-events.json`.

## Lỗi media cần sửa tiếp (chưa hoàn tất)

- Follow-up: nhánh chỉ sửa metadata đã sửa và nghiệm thu Android ở [KEEPSAKE_PHOTO_INTENT_TDD.md](KEEPSAKE_PHOTO_INTENT_TDD.md); kết quả bên dưới giữ nguyên như bằng chứng phát hiện lỗi của bản trước.
- Replay `loadKeepsakeCollection` upload mọi `photoUri` kể cả ảnh cache cloud không thay đổi. Cần persisted intent phân biệt ảnh mới với ảnh chỉ tải về; không suy đoán từ URI đơn thuần. Giữ nguyên mediaPath khi sửa metadata.
- Upload thành công nhưng API timeout cần journal path/idempotency để không upload ảnh khác ở mỗi retry; không xóa ảnh đã có thể được server commit khi response mất.
- Cleanup ảnh cũ sau commit phải có retry, không xóa trước khi biết server không tham chiếu; archive hiện chỉ cleanup mediaPath hiện tại.
- Owner switch giữa upload/request, pending media A–B, thay ảnh offline, cancel/delete pending mới, nhiều ảnh/eviction vẫn cần nghiệm thu riêng.
- Cache ảnh cloud hiện là file theo owner và metadata mã hóa; không phải chứng minh rằng mọi file ảnh kỷ vật đã được mã hóa.

Không nâng toàn mục Media thành verified từ ca cache/offline edit này.

## Cleanup và binary

- Android archive trả danh sách API rỗng, UI “Góc kỷ niệm còn trống”. Storage audit sau archive: ảnh mới đang dùng đã được app xóa; ảnh cũ và ảnh chuẩn bị 400 còn lại. Công cụ QA đã xóa các object trong thư mục của user QA vừa sinh, audit lại `objects: []`, sau đó purge/xóa cả hai Auth user.
- QA force-stop, reverse gỡ, proxy dừng; mạng khôi phục. Không thay clock trong increment này.
- Production x86_64 build PASS 1m14s, `apksigner verify` PASS, bundle có HTTPS production/không loopback QA.
- APK `.artifacts/ui-redesign/picket-completion-emulator.apk`, SHA-256 `088799A46CD9A9A996CEC1E8BF1DD3B5A9F6010F1993C4068817E533CD28CB3D`. Chỉ update bản emulator, chưa build ARM64.
- Cài cập nhật Success, cold start vẫn Son Nguyen/-261.345 ₫; evidence `keepsake-final-production.xml`. Không commit/push hoặc deploy BE.
