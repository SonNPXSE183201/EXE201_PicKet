# Khôi phục yêu cầu đối soát chưa xác nhận

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ngày: 2026-10-18. Nguồn: mục 3 [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), tiếp nối [RECONCILIATION_DURABLE_REQUEST_TDD.md](RECONCILIATION_DURABLE_REQUEST_TDD.md).

## Hành vi đã triển khai

Màn đối soát đọc journal của đúng owner và hiển thị snapshot chưa xác nhận: ví, ngày, số dư, số giao dịch đã chọn, lý do. Nút **Thử lại yêu cầu** gửi nguyên snapshot và ID đã lưu, không lấy các trường đang nhập hay lọc lại selection theo lịch sử hiện tại. Không tự gửi khi mount/reconnect; không tự xóa yêu cầu chưa rõ kết quả.

Đây là phục hồi bằng snapshot chỉ đọc, không tự điền form mới. Người dùng không cần nhớ và nhập lại payload để thử lại yêu cầu cũ. Nút giải thích thao tác có thể hoàn tất lần đối soát chưa được server ghi, không chỉ đọc trạng thái.

- Journal `list` dùng cùng hàng đợi tuần tự; dữ liệu trả về không làm thay đổi store khi caller sửa mảng.
- Recovery kiểm tra expected ID vẫn đang pending. Nút cũ không được tạo ID mới khi entry đã hoàn tất hoặc ID không khớp.
- Decoder kiểm tra shape, ngày tồn tại, integer/range, selection không trùng và reason; dữ liệu hỏng được giữ nguyên, không dựng số tiền mặc định để gửi.
- Pending list/thông báo được gắn owner; bỏ kết quả đọc cũ khi đổi owner và kiểm tra owner trước khi gửi sau bước reserve. Chưa thay thế kiểm thử switch hai tài khoản thật.
- Dùng component/màu hiện có, nút touch/role theo PrimaryAction; thông báo kết quả có live region. Chưa audit spoken TalkBack.

## RED → GREEN và chất lượng

RED: `npm run test:transactions --prefix apps/mobile` có các test thất bại do thiếu `list`, thiếu decoder và reserve chưa từ chối expected ID không khớp. Sau triển khai, target đạt 22/22.

| Kiểm tra thực chạy | Kết quả |
|---|---|
| `npm run test:mobile` | 124/124, 0 fail/skip |
| `npm run typecheck --prefix apps/mobile` | PASS |
| `npm run lint --prefix apps/mobile` | 0 lỗi, 24 cảnh báo cũ; hai lỗi hooks mới đã sửa trước build cuối |
| `node --experimental-test-coverage --import tsx --test src/features/transactions/reconciliation-attempt.test.ts src/features/transactions/reconciliation-journal.test.ts` tại apps/mobile | 16/16; hai module 100% line, tổng branch 97.40%, function 97.30% |
| Gradle release x86_64 sau sửa hooks | PASS, 44s |
| `apksigner verify`, `adb install -r` | PASS, giữ đăng nhập |

Đã đọc lại source, quét console.log/mẫu secret trong file đổi: không có kết quả. Không phải security audit. `git diff --check` không có lỗi trong tracked file phạm vi; các source recovery hiện là untracked cùng nhiều thay đổi từ trước nên đã đọc trực tiếp, không dựa vào diff rỗng làm bằng chứng. Không checkpoint commit/push vì chưa được yêu cầu đợt này; giữ bằng chứng RED/GREEN ở đây.

## Android đã thực hiện

Tài khoản Son Nguyen trên emulator-5554, app `com.picket.mobile`:

1. Cài cập nhật, force-stop/mở lại. Màn đối soát đọc đúng entry đã tạo từ APK trước: Tiền mặt, 2026-10-18, số dư 0 ₫, selection 0; ô số dư của form mới vẫn trống. Không nhấn retry khi online.
2. Bật airplane mode, tắt Wi-Fi trước khi nhấn nút snapshot. Nhận thông báo chưa xác nhận được kết quả; snapshot vẫn giữ nguyên, không báo thành công giả.
3. Force-stop/mở lại khi offline: màn vẫn hiện đúng snapshot và nút retry, kèm cảnh báo history cache chưa có kết nối. Đây là bằng chứng đọc journal bền qua update/restart trên Android bằng UI thật; không trích xuất token/private key hay giải mã DB ngoài app.
4. Đã xem ảnh `recovery-offline-finished.png`: snapshot/nút đọc được, không bị cắt ở font mặc định. Không suy rộng thành nghiệm thu font lớn/toàn bộ màn.
5. Kết thúc bật mạng, airplane mode tắt, quay Tổng quan; không gửi mutation khi online trong ca này. Entry pending cũ vẫn còn, không tự replay.

Artifacts ở `.artifacts/ui-redesign/`: `recovery-online-card.xml/png`, `recovery-offline-finished.xml/png`, `recovery-restart-offline.xml`, `recovery-final-home.xml`; logs `build-reconciliation-recovery.log`, `tests-reconciliation-recovery.log`, `lint-reconciliation-recovery.log`.

APK emulator: `.artifacts/ui-redesign/picket-completion-emulator.apk`.
SHA256: `116DCC25C554539C5A8D2691EB799DFFA549FE48FFEF4E1C481D4D1285B8B138`.

## Còn thiếu

- Native mất response **sau server commit**, online retry snapshot và đối chiếu số adjustment/request ID phía server: vẫn chưa verified. Ca trên chỉ retry trước khi gửi được mạng; unit fake-server không thay thế ca này.
- Snapshot hỏng/capacity và nút stale đã đạt logic test, chưa seed phá journal của tài khoản thật để nghiệm thu UI.
- Hai tài khoản thật/token expiry, nhiều snapshot trên màn, guest recovery, TalkBack và font lớn của phần mới chưa test Android đầy đủ.
- Form mới vẫn có thể tạo payload khác; đó là yêu cầu khác, không cam kết chống trùng nếu người dùng chủ động gửi thông tin khác. Không có nút tự bỏ yêu cầu mơ hồ.
- Không sửa API/BE, không deploy. ARM64 APK cũ chưa chứa increment mới.
