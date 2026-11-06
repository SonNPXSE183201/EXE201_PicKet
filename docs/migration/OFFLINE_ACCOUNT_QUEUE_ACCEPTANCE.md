# Offline A–B–A với mutation đang chờ — 2026-10-18

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Nguồn: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), mục 2. Đợt này kiểm thử hành vi đã có, không thay logic đăng nhập/queue hoặc backend. Chỉ bổ sung một regression test cho chính sách HTTP 401.

## Môi trường và phạm vi

- Pixel 5 `emulator-5554`, package riêng `com.picket.mobile.qa`; không đăng xuất Google của package chính.
- Hai Auth user QA mới sinh, API/Supabase production thật. Credential chỉ trong RAM của công cụ local. Airplane mode bật, Wi-Fi tắt và adb reverse bị gỡ ở các bước offline.
- Xóa dữ liệu cũ của **package QA riêng** trước khi bắt đầu; không reset app chính. DB snapshot chỉ đọc queue QA, không đọc kho auth/token của app chính.
- APK QA hiện có được dùng vì luồng auth/queue không đổi từ lần build đó. Không build thêm APK trong increment chỉ thêm test/tài liệu.

## Kết quả native

| Bước | Kết quả thực quan sát |
|---|---|
| Login A online, tạo giao dịch offline từ form | `QA_A_OFFLINE_ONLY`, chi 7.654 ₫, ví QA Wallet A, hiện trong danh sách Android |
| Force-stop để snapshot queue | Một `transaction.create` thuộc A `ecf7797a-8a49-440a-98fa-4f232eb64ddd`, payload `enc-v1:`, SQLite WAL; chưa có conflict |
| Mở lại offline, vào chỉnh sửa hồ sơ và xác nhận đăng xuất | Quay về màn login; queue được giữ lại |
| Nối mạng và login B | Dashboard `Roadmap QA B`, số dư 1.000.000 ₫; API A và B đều 0 giao dịch, nên queue A chưa bị replay khi B đăng nhập |
| B force-stop/restart khi offline | Tên/số dư vẫn đúng B; màn giao dịch hiện 0 giao dịch. Snapshot vẫn có một mutation A, không có conflict |
| Đăng xuất B offline, nối mạng login A | A tự gửi mutation đang chờ. Dashboard A 992.346 ₫, chi 7.654 ₫ |
| Đối chiếu API và restart sau sync | A có đúng một transaction `3d0446d3-2aea-4cba-ac6d-540aac1c6b9e`, title/amount đúng, version 1; B vẫn 0 giao dịch. Proxy có một POST `/v1/transactions` 201; queue/conflict đều rỗng sau restart và server vẫn chỉ một bản ghi |

Local evidence (ignored): `.artifacts/roadmap-qa/isolation-a-offline-saved.xml`, `isolation-logout-gate.xml`, `isolation-b-home.xml`, `isolation-b-offline-restart.xml`, `isolation-b-offline-transactions.xml`, `isolation-return-a.xml`, `account-isolation-events.json`; queue snapshots `queue-1792276643835358700`, `queue-1792276791111554400`, `queue-1792276878774225800`.

Sau test đã purge dữ liệu/xóa cả hai user QA, force-stop QA, gỡ reverse và dừng proxy. Package production được mở lại, vẫn `Son Nguyen`, -261.345 ₫ (evidence `isolation-final-production.xml`). Wi-Fi bật, airplane tắt. Không thay clock, config Auth production, migration hay dữ liệu người dùng.

## Regression/gates

- Test mới `authentication expiry remains retryable regardless of offline retry count`: HTTP 401 tại attempts 0/4/20/100 luôn `retry`; HTTP 403 vẫn `conflict`. Đây là kiểm chứng **policy hiện có**, không phải ca token expired native, không có RED/fix production để báo cáo.
- `npx --no-install tsx --test --experimental-test-coverage --test-coverage-include='**/mutation-policy.ts' src/core/sync/mutation-policy.test.ts`: 6/6 đạt; lines 100%, branches 93.33%, functions 80%.
- `npm run test:mobile`: 134/134 đạt, không skip. Mobile typecheck đạt; lint 0 lỗi/24 cảnh báo cũ. `git diff --check` file test đạt (chỉ cảnh báo chuẩn hóa CRLF từ Git).
- Không thêm dependency, không sửa production logic nên không phát sinh binary mới; giữ APK đã kiểm chứng ở increment trước. Không commit/push.

## Chưa hoàn tất

1. Token hết hạn thật khi offline, cold start và reconnect/refresh; test policy 401 không thay thế bằng chứng này.
2. Pending media/upload ảnh A–B và ảnh cache/URL hết hạn; không suy rộng từ mutation giao dịch sang media.
3. Chuyển owner giữa lúc HTTP upload/mutation đang chạy, token refresh thất bại authoritative, nhiều mutation phụ thuộc và mạng chập chờn.
4. Audit cách ly owner trên mọi resource cache; đợt này chứng minh dashboard/transaction cache và queue giao dịch của ca cụ thể.

Không nâng toàn bộ mục Offline/session thành verified chỉ từ ca này.
