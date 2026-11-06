# Khôi phục phiên thiết bị khi refresh offline — 2026-10-18

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Nguồn: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), mục Offline/token. Phạm vi: Expo Android, không sửa Auth server, JWT lifetime hay backend.

## Lỗi và cách sửa

SDK đang cài giữ bản ghi phiên khi refresh gặp lỗi mạng, nhưng `getSession()` trả null nếu access token đã quá hạn. `AuthProvider` trước đây lấy null làm trạng thái app và không có đường khôi phục chủ dữ liệu offline.

- Đọc lại **bản ghi SecureStore hiện hữu của SDK**, không tạo bản sao token thứ hai. Namespace `sb-<project-ref>-auth-token` giữ nguyên như SDK mặc định.
- Chỉ đi vào đường continuity sau lỗi refresh retryable hoặc sau deadline chờ SDK 8 giây. Phiên đã lưu chỉ xác định chủ cache trên thiết bị; không chứng minh token còn hiệu lực, không bỏ qua kiểm tra của API.
- Không khôi phục khi SDK trả signed-out/null không lỗi, lỗi authoritative hoặc dữ liệu lưu không đủ cấu trúc. Khi SDK đang chậm, auth event tiếp theo vẫn có quyền thay thế hoặc xóa trạng thái continuity.
- Revision guard hủy bootstrap cũ khi có sign-out/sign-in/token event hoặc unmount; `INITIAL_SESSION=null` không ghi đè tùy tiện kết quả phục hồi do mạng.
- Web không đọc fallback này. Next không thay đổi. Không chỉnh JWT, không giả token mới và không ghi token vào log.

## TDD/gates

1. RED đầu: thiếu `session-recovery`; test không import được implementation mới. GREEN: 8 ca schema, network, authoritative, owner race, storage failure.
2. Integration với `GoTrueClient` thật của SDK đang cài, `autoRefreshToken=true`, storage giả và fetch offline: xác nhận SDK trả null + `AuthRetryableFetchError` nhưng giữ record; adapter phục hồi đúng owner. Clock mock chỉ dùng để bỏ thời gian backoff trong test.
3. Runtime RED bổ sung: SDK promise không kết thúc làm test timeout sau 200 ms. GREEN sau deadline: cùng ca trả cached owner với deadline test 5 ms; production mặc định 8 giây.
4. `tsx --test --experimental-test-coverage --test-coverage-include='**/session-recovery.ts' src/features/auth/session-recovery.test.ts`: 10/10 đạt; lines 100%, branches 96.67%, functions 80%.
5. `npm run test:mobile`: 144/144 đạt; typecheck đạt; lint 0 lỗi/24 cảnh báo cũ, các file mới không có warning. Diff check không có whitespace error. Quét log/secret pattern các file mới không có kết quả; không phải audit bảo mật toàn repo.

Không tạo checkpoint commit để tránh đưa thay đổi cũ/untracked ngoài increment vào commit; lưu RED/GREEN tại đây. Không thêm dependency.

## Android: bằng chứng và giới hạn

- Package QA riêng, hai user tạm. Fixture A `QA_EXPIRY_OFFLINE_CACHE`, expense 4.321 ₫; dashboard online trước thử có 995.679 ₫. Không dùng/chỉnh tài khoản Google của package chính.
- Máy ảo từng treo lệnh UI/screenshot: khởi động lại Pixel_5 bằng cold boot, không wipe data. Sau boot, QA đọc đúng cache online.
- Thử clock +2 giờ chỉ khi airplane bật, Wi-Fi tắt, reverse bị gỡ và package production đã force-stop. Đây **không phải** token hết hạn tự nhiên trên server. Bản chưa có deadline vẫn ở spinner sau khoảng 80 giây; không tính ca đó là PASS.
- Đã khôi phục giờ theo host UTC và `auto_time=1` sau ca thử. Ca Android với deadline được ghi tiếp dưới đây sau khi chạy.

### Follow-up bản deadline 8 giây

- QA build PASS 1m13s, cài cập nhật giữ session. Dashboard online đúng QA A/995.679 ₫ trước thử.
- Airplane bật, Wi-Fi tắt, reverse bị gỡ; package chính force-stop. Dừng QA, tăng clock thiết bị 7.200 giây rồi cold-start. Bản cuối vào dashboard QA A, 995.679 ₫/chi 4.321 ₫, hiển thị “Đang dùng dữ liệu đã lưu”; ảnh đã xem trực quan.
- Từ form Android tạo `QA_EXPIRY_QUEUED` 321 ₫, nhìn thấy trong danh sách offline. Snapshot queue QA: đúng một transaction.create owner A, `enc-v1:`, WAL, không conflict.
- Khôi phục giờ host UTC + auto_time=1, bật mạng/reverse, cold-start: dashboard 995.358 ₫/chi 4.642 ₫. API xác minh đúng một transaction mới `0a531ccf-1532-4ff4-9fd6-23f47da00351`, amount 321/version 1. Sau restart queue rỗng và API vẫn chỉ hai fixture tổng cộng, không nhân đôi.
- Không đọc JWT của app để chứng minh exp claim; đây là **client clock simulation**, không chứng minh natural server expiry/refresh rotation. Khôi phục clock trước reconnect nên token có thể vẫn còn hiệu lực ở server.
- Hai user QA đã purge/xóa, QA force-stop, reverse gỡ. Giờ tự động 1, airplane 0. Không chỉnh config Auth production.
- Local evidence: `.artifacts/roadmap-qa/expiry-online-ready.xml`, `expiry-deadline-offline.xml`, `expiry-deadline-offline.png`, `expiry-queued-result.xml`, `expiry-reconnect-balance.xml`, `session-recovery-events.json`, snapshots `queue-1792278152334457600` và `queue-1792278180509575800`.

## Còn lại

- Natural expiry trên server, reconnect/refresh bằng token thật đã expired; không thay thế bằng clock mock hoặc unit 401.
- Sign-out khi đã expired và offline, revoke refresh token, owner switch giữa lúc refresh/upload đang chạy.
- Pending media A–B; không suy rộng từ queue giao dịch sang ảnh.
- Kiểm thử lifecycle React native rộng hơn; unit adapter không chứng minh toàn bộ event ordering của UI.

## APK production cuối

- Build release x86_64 PASS 1m25s, `apksigner verify` PASS. Bundle kiểm chứng có URL API HTTPS production, không có loopback QA. Cài cập nhật `adb install -r`: Success.
- `.artifacts/ui-redesign/picket-completion-emulator.apk`, SHA-256 `1FC5E7CB583AD57ED6E80574AEAC7B6F81BA07F712C33BAB3C4CB784987003EF`.
- APK này chứa deadline 8 giây cuối; bản build trước deadline không phải bản bàn giao. Không phát hành ARM64 mới trong increment này.
- Không commit/push hoặc deploy backend. QA fixture đã dọn, proxy đã dừng, Wi-Fi bật/airplane tắt/giờ tự động bật/font 1.0.
- Smoke sau cài cuối: `Son Nguyen`, baseline -261.345 ₫ còn nguyên; evidence `session-recovery-production-final.xml`, không đọc token hay sửa dữ liệu tài khoản chính.
