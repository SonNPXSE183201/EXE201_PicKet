# Mã đối soát bền vững trên Expo Android

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ngày 2026-10-18. Nguồn: mục 3 của [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), tiếp nối [RECONCILIATION_RETRY_TDD.md](RECONCILIATION_RETRY_TDD.md).

## Increment

Trước đây request ID nằm trong ref của màn hình. Bản này dùng `ReconciliationJournal` và adapter SQLite mã hóa sẵn có (`reconciliation-requests`), không thêm dependency hay sửa BE. Đã tìm trong repo và tái sử dụng `offline-cache` thay vì tạo kho lưu trữ mới.

- Lưu ID trước khi gọi mutation; lỗi đọc/ghi journal thì không gửi.
- Cùng owner và cùng payload chuẩn hóa lấy lại ID chưa xác nhận, kể cả sau khi khởi tạo lại journal.
- Payload khác không ghi đè ID của yêu cầu chưa rõ kết quả. Guest và từng Supabase user có owner riêng.
- Các reserve/complete cùng owner được tuần tự hóa; submit có ref khóa đồng bộ để chặn double tap trước render.
- Chỉ bỏ entry khớp payload/ID khi mutation trả thành công. Lỗi cleanup không biến thành lỗi ghi; entry còn lại cho phép hỏi lại server bằng ID cũ.
- Giới hạn 100 yêu cầu chưa xác nhận/owner: không tự eviction các yêu cầu có thể đã ghi trên server. Đây không phải queue tự replay.

## TDD và kiểm tra chất lượng

RED: `npm run test:transactions --prefix apps/mobile` thất bại do module `./reconciliation-journal` chưa tồn tại. Sau khi thêm module/adapter và tích hợp màn hình, GREEN đạt; thêm hai ca regression cho mất response và concurrent payload.

| Bằng chứng | Kết quả | Phạm vi |
|---|---|---|
| `npm run test:mobile` | 120/120, 0 fail/skip | Toàn bộ script mobile hiện có |
| `npm run typecheck --prefix apps/mobile` | PASS | TypeScript |
| `npm run lint --prefix apps/mobile` | 0 lỗi, 24 cảnh báo | Không sửa cảnh báo ngoài increment |
| `node --experimental-test-coverage --import tsx --test src/features/transactions/reconciliation-journal.test.ts` tại apps/mobile | 9/9; 100% line, 97.30% branch, 95% function | Journal, không phải coverage toàn app |
| Gradle release x86_64 | PASS, 51s | Build Android mới |
| `apksigner verify`, `adb install -r` | PASS | Chữ ký, cập nhật giữ phiên đăng nhập |

Unit tests chứng minh: owner isolation, giữ ID qua instance mới, payload mới không làm mất yêu cầu cũ, serialize concurrency, disk-full/corrupt-data fail closed, cleanup thất bại giữ ID, giới hạn không eviction. Test server giả lập commit rồi ném lỗi response; restart journal + retry trả cùng kết quả và đếm đúng một adjustment. Không gọi đây là server thật.

Đã đọc lại source tích hợp, kiểm tra `git diff --check`; quét file sửa không có console.log/mẫu secret được tìm. Không phải security audit toàn repo. Không tạo checkpoint commit do worktree có nhiều thay đổi trước đó và đợt này chưa được yêu cầu commit. Giữ bằng chứng RED/GREEN ở tài liệu này.

## Android thực tế

- Tài khoản Google hiện có trên emulator-5554. Mở đối soát ví, ngày 2026-10-18, ví mặc định Tiền mặt, số dư sao kê 0, cleared balance 0, selection 0/2.
- Bật airplane mode, tắt Wi-Fi **trước** submit. Nhấn xác nhận: nhận thông báo chưa xác nhận kết quả, hướng dẫn thử đúng thông tin; không báo thành công giả. Không gửi lại khi online.
- Force-stop/mở lại khi offline: màn hình vẫn mở bằng cache, có cảnh báo chưa kết nối; submit bị chặn bởi lỗi history provider, không tự replay mutation. Form không tự khôi phục các trường đã nhập.
- Bật lại mạng, cold restart về Tổng quan: vẫn Son Nguyen, tổng số dư `-261.345 ₫`, font 1.0, airplane mode 0. Không tạo điều chỉnh hoặc reconciliation cloud trong ca này.
- Có một entry thử nghiệm chưa xác nhận trong journal của tài khoản (payload 0 đồng trên ví mặc định); chỉ được đọc lại khi người dùng chủ động gửi đúng payload, không tự đồng bộ hay chạy nền. Không xóa entry không rõ kết quả như một thao tác dọn rác.

Artifacts: `.artifacts/ui-redesign/journal-native-{form,submit,submit2,offline}.xml`, `journal-native-offline.png` đã xem trực quan, `journal-restart-form.xml`, `journal-final-home.xml`; log `build-reconciliation-journal.log`, `tests-reconciliation-journal.log`, `lint-reconciliation-journal.log`.

APK x86_64: `.artifacts/ui-redesign/picket-completion-emulator.apk`.
SHA256: `7440870C5E47001987326D1F70F9108E88D5FC6F08E79C2E128B43E3C2004867`.

## Giới hạn còn lại

- Native mất response **sau server commit** vẫn chưa được mô phỏng; chưa nâng ca roadmap này lên verified từ unit test hoặc từ ca offline trước khi gửi.
- Chưa đối chiếu trực tiếp ID bên trong SQLite mã hóa qua force-stop trên thiết bị; unit test dùng store giả lập bền qua instance, native xác minh wiring/error handling, không thay bằng chứng persistence toàn tầng.
- Người dùng cần nhập lại chính xác payload (ví/ngày/số dư/selection/lý do). Form chưa có màn phục hồi yêu cầu chưa xác nhận. Payload khác là yêu cầu khác; không tuyên bố chống trùng khi người dùng thay đổi thông tin.
- API hiện có idempotency theo user/request ID; không thay TTL hay semantics server. Journal lỗi/corrupt/capacity cần xử lý hỗ trợ, không xóa dữ liệu tự động.
- Chưa test switch hai tài khoản thật trên Android. ARM64 APK chưa rebuild increment này. Chưa commit/push/deploy.
