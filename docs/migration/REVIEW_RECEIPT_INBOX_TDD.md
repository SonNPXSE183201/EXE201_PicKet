# Review Inbox: hóa đơn cần kiểm tra — 2026-10-18

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Nguồn: `APP_COMPLETION_PLAN.md`, mục 3. Increment này chỉ bổ sung receipt review vào Expo Android; không sửa API, schema hay triển khai backend.

## Hành vi đã bổ sung

- Inbox có hai phần riêng: hóa đơn cần kiểm tra và giao dịch chưa phân loại/nghi trùng.
- Nhận hóa đơn có `reviewRequired=true` hoặc `status=review_required`, kể cả chưa gắn giao dịch; không đưa hóa đơn đang OCR vào thao tác review.
- Mở chi tiết bằng receipt ID. Nút quay lại giữ lịch sử điều hướng; khi Inbox được focus lại, tải trạng thái mới để bỏ hóa đơn đã xác nhận.
- Request bị hủy khi mất focus; callback trễ không cập nhật màn cũ. Component được remount theo owner khi đổi tài khoản. Không ghi token/receipt vào log.
- Lỗi tải không được coi là danh sách rỗng. Có thông báo và nút thử lại; lỗi hóa đơn không che phần giao dịch.

## TDD và gates

| Bằng chứng | Kết quả |
|---|---|
| RED: `npx --no-install tsx --test src/features/transactions/review-inbox.test.ts` | 4 test mới thất bại vì thiếu `selectReceiptReviews`; 4 test giao dịch cũ đạt |
| GREEN: cùng lệnh | 8/8 đạt |
| `tsx --test --experimental-test-coverage --test-coverage-include='**/features/transactions/review-inbox.ts' src/features/transactions/review-inbox.test.ts` | Lines 100%, branches 93.33%, functions 88.89% |
| `npm run test:mobile` tại root | 133/133 đạt; không skip |
| Mobile `npm run typecheck` | Đạt |
| Mobile `npm run lint` | 0 lỗi, 24 cảnh báo có sẵn; các file của increment không có cảnh báo |
| Quét pattern token/secret/log trong Inbox và selector/test | Không có kết quả; đây không phải security audit toàn dự án |

Coverage trên là selector thuần, không đại diện coverage React lifecycle. Không tạo checkpoint commit để tránh gom các file untracked/chỉnh sửa từ nhiều đợt trước vào commit ngoài phạm vi; RED/GREEN được lưu trong báo cáo này.

## Pixel 5 / emulator-5554

Dùng package riêng `com.picket.mobile.qa`, tài khoản sinh tạm, API production qua proxy loopback. Không lấy token hay đổi dữ liệu tài khoản Google của người dùng. APK QA build thành công; sau đó chỉ thay cách kích hoạt retry từ dependency callback sang remount key để bỏ lint warning, không thay hành vi đã kiểm thử. Bản production được build lại từ source cuối.

1. Upload ảnh corpus SROIE vào thư mục của user QA. Tạo receipt không gắn giao dịch: `1ad5fb42-b4fa-43b1-a922-9a14be7013ff`, merchant `QA REVIEW SROIE`, tổng 25.000 ₫, `review_required/true`.
2. Inbox hiển thị đúng tên/tổng tiền và mở được chi tiết/ảnh.
3. Trên UI Android đổi tên thành `QA_REVIEW_CONFIRMED`, nhấn lưu. API GET xác minh `confirmed`, `reviewRequired=false`, version 2, tổng vẫn 25.000 ₫. Có một PUT 200 trong proxy log.
4. Android Back quay lại Inbox: tải lại GET `/v1/receipts`, không còn dòng QA trong phần cần kiểm tra.
5. Gỡ reverse port để cắt đường API của riêng APK QA: Inbox hiển thị “Chưa tải được trạng thái hóa đơn…”, không hiển thị câu danh sách hóa đơn rỗng. Nối lại và nhấn retry: tải được trạng thái rỗng chính xác.
6. Đã xóa ảnh QA, purge dữ liệu và xóa hai Auth user QA; force-stop QA và gỡ reverse. Đã reset dữ liệu cũ của **package QA riêng** trước đăng nhập; không reset package chính.

Evidence local (ignored): `.artifacts/roadmap-qa/review-inbox-fixture.xml`, `review-inbox-native.png` (đã xem trực quan), `review-editor.xml`, `review-after-save.xml`, `review-offline.xml`, `review-retry-online.xml`, `review-receipt-events.json`.

## APK production cuối

- x86_64 `assembleRelease`: PASS 1m20s. `apksigner verify`: PASS; kiểm tra bundle có endpoint HTTPS production, không có loopback QA.
- `.artifacts/ui-redesign/picket-completion-emulator.apk`, SHA-256 `26A16DBBE4BA704BBC3B246A870D1103C7465E5BDADF723CCD8096B27CF76153`.
- `adb install -r`: Success; cold start giữ đăng nhập Son Nguyen và baseline -261.345 ₫, log PID 28232 không có ReactNativeJS/AndroidRuntime error tại lần kiểm tra. Wi-Fi bật, airplane mode 0, font 1.0.
- Chỉ có bản emulator được cập nhật; ARM64 cũ chưa chứa increment này. Không commit/push/deploy BE.

## Chưa nghiệm thu

- Receipt Review Inbox hiện cần mạng để biết trạng thái mới; không có cache riêng cho danh sách review. Cache ảnh/lịch hiện có không bị thay đổi. Guest không có trường review receipt tương ứng và không được giả lập là cloud.
- Chưa audit font 150/200%, TalkBack, hai Android và owner-switch race trên UI cho section mới.
- Nghi trùng giao dịch vẫn là heuristic, không tự archive. Phân loại giao dịch → đồng bộ các màn và receipt duplicate nghiệp vụ đầy đủ vẫn cần ma trận kiểm thử riêng.
- Token expiry thật, disk-full/WAL crash, reconciliation ngày Việt Nam/UTC, ARM64 và các dependency thiết bị/Play còn trong roadmap; không nâng toàn roadmap thành verified.
