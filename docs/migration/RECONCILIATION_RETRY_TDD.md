# Đối soát: kết quả ghi và lỗi tải lại

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ngày: 2026-10-18. Nguồn: mục 3 của [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md). Chỉ sửa Expo Android, không sửa BE.

## Hành vi và bằng chứng

- Khi mutation đã trả thành công nhưng refresh reject, giữ thông báo thành công và hướng dẫn tải lại, không báo dữ liệu chưa thay đổi.
- Khi chưa nhận được kết quả mutation, không tự kết luận thất bại hoặc thành công. Màn hình giữ request ID cho payload không đổi trong cùng phiên màn hình.
- Ngày sao kê phải tồn tại trên lịch và không ở tương lai; không chấp nhận việc JavaScript tự chuyển 31/02 sang tháng 3.

RED: test mới tham chiếu module `reconciliation-attempt` chưa tồn tại và thất bại ở bước import. GREEN: thêm helper và tích hợp vào `reconcile.tsx`; nhóm transaction đạt 9/9.

| Kiểm tra | Kết quả | Phạm vi chứng minh |
|---|---|---|
| `npm run test:mobile` tại root | 111/111, không skip | Các bộ test mobile hiện có, không phải toàn bộ E2E |
| `npm run typecheck --prefix apps/mobile` | PASS | TypeScript |
| `npm run lint --prefix apps/mobile` | 0 lỗi, 24 cảnh báo | Chưa xử lý cảnh báo ngoài phạm vi |
| `node --experimental-test-coverage --import tsx --test src/features/transactions/reconciliation-attempt.test.ts` tại apps/mobile | 3/3; helper 100% line/function, 95% branch | Kết quả mutation/refresh và date policy |
| Gradle `:app:assembleRelease`, x86_64 | PASS, 1m05s | APK emulator, không phải ARM64 mới |
| `apksigner verify`, `adb install -r` | PASS | Cài cập nhật giữ phiên đăng nhập |
| Android: nhập `2026-02-31`, số dư `0`, nhấn xác nhận | PASS: “Nhập ngày và số dư sao kê hợp lệ.” | Chặn trước mutation; không tạo điều chỉnh tài khoản thật |

Ảnh đã kiểm tra trực quan: `.artifacts/ui-redesign/reconcile-invalid-result.png`; XML cùng tên và `reconcile-date-2/3.xml`. Log build/test/lint: `.artifacts/ui-redesign/*reconciliation.log`. Quét các file sửa không phát hiện console.log hoặc mẫu secret đã kiểm tra; đây không phải security audit toàn dự án. Đã đọc lại source và phạm vi thay đổi; giữ nguyên dirty worktree, không tạo checkpoint commit vì chưa được yêu cầu commit đợt này.

APK: `.artifacts/ui-redesign/picket-completion-emulator.apk`.
SHA256: `0158A2CECC03976AC3C6DCAEE569287A1998B3036697613889B1E21D9FD7ACDE`.

## Chưa được chứng minh

- Chưa mô phỏng native mất response sau server commit. Unit test dùng callbacks giả lập; không thay thế ca Android + server thật.
- Test giữ ID dùng closure do caller cấp; việc màn hình giữ ID được đọc source, chưa có component test cho ref đó. ID hiện chỉ ở bộ nhớ: force-stop/rời màn có thể mất ID. Không cam kết retry idempotent qua restart từ bản sửa này.
- Refresh provider có thể tự bắt lỗi thay vì reject; trạng thái lỗi của provider vẫn phải được xét riêng.
- Hai thiết bị conflict, hai tài khoản/token hết hạn, file Flutter thật, TalkBack, thiết bị ARM và Play sandbox vẫn giữ trạng thái chờ nghiệm thu tương ứng.

Không thay đổi dữ liệu cloud trong ca Android này. Kết thúc ở mạng bật, airplane mode tắt, font scale 1.0. Chưa commit/push/deploy. Bản ARM64 cũ chưa có increment này; không phát cho điện thoại như bản đã nghiệm thu mới nhất.
