# Thực thi hoàn thiện dự án — 27/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).

Trạng thái chung: [PROJECT_STATUS](../PROJECT_STATUS.md). Báo cáo này ghi bằng chứng thực thi, không thay thế nghiệm thu bên ngoài.

## Đã thực hiện

1. Rà source và giữ nguyên các thay đổi local có trước; không reset working tree.
2. Chạy test toàn repo: landing 10, mobile 891, web 54, Dart API 140 — tất cả PASS.
3. Chạy lint toàn repo và typecheck mobile/web — PASS; mobile 27 warning hiện hữu.
4. Pixel 5 code 18: sign out UI → Google account chooser → Android Picket callback → Home; cold restart giữ phiên. Không ghi tài chính trên tài khoản thật.
5. Supabase: 13 migration thiếu đã áp lên project `qyokoyopodjtvfyunyde`, không seed test hoặc đưa dữ liệu cá nhân tới AI.
6. Bổ sung migration thu hồi quyền gọi trực tiếp trigger nội bộ. RED `8304d15e`; GREEN `f8c70b7b`. 13 SQL suites PGlite PASS, bao gồm kiểm tra quyền và trigger runtime.
7. Supabase sau triển khai: 49 migration, bảng mới bật RLS, hai cleanup cron active, 0 cloud lesson published. Remote quyền trigger anon/authenticated đã thu hồi.
8. Đọc trực tiếp Play sau upload: internal code 18 completed; alpha code 6 draft; production/beta trống; bốn base plan DRAFT; google_groups alpha/internal trống.
9. HTTPS smoke: landing release manifest code 17, legal pages, app login, API health 200.
10. Đồng bộ điểm vào tài liệu, tạo chỉ mục và phân biệt checkpoint lịch sử với hiện trạng.

## Build và dependency

Web build đầu tiên biên dịch thành công nhưng thoát lỗi do Next.js 16.4.0 có advisory critical. Đã đối chiếu npm audit và [advisory của Next.js](https://github.com/advisories/GHSA-2464-fhr4-w9xw), nâng Next.js/eslint-config-next lên 16.4.3. Web build và 54 tests/lint/typecheck PASS; cập nhật Zod transitive, npm audit cuối 0 vulnerability. Image web và API mới đã build/deploy trên VPS; container web xác nhận Next.js 16.4.3. Chỉ recreate web/API, giữ Caddy/OCR. Compose production đã lưu image tag mới để không quay về image cũ ở lần chạy sau.

ARM64 release candidate code 18 và AAB đều đã build thành công. Play Internal đã cập nhật code 18; landing giữ stable code 17 trong lúc chờ nghiệm thu thiết bị thật.

## Bằng chứng local

Tất cả log trong `.artifacts/completion-20261027/`: `tests.log`, `lint.log`, `types.log`, `migration-tests.log`, `trigger-red.log`, `trigger-green.log`, `migrations-push.log`, `migrations-after.json`, `schema-verification.json`, `trigger-remote-verification.json`, `live-smoke.json`, `web-audit*.json`, `web-build*.log`, `arm64-build.log`.

XML OAuth/tài khoản thực không đưa vào Git hoặc ảnh cửa hàng. APK/AAB chỉ lưu trong `.artifacts/releases`.

## Giới hạn và công việc cần đầu vào ngoài máy

Xem bảng điều kiện trong [trạng thái chung](../PROJECT_STATUS.md). Không có thiết bị vật lý kết nối ADB tại thời điểm bắt đầu; không thể thay thế camera/sinh trắc thật bằng emulator. Google closed-test/cohort, independent content review và real-history backtest cần bằng chứng thực tế.

Lệnh gộp có bước khởi động Docker Desktop bị automatic approval từ chối với thông báo `blocked by policy`; không có lý do chi tiết hơn. Không lặp lại lệnh đó. Dùng PGlite cho SQL functional tests và kiểm tra pg_cron metadata trực tiếp trên Supabase; không tuyên bố Docker/PostgreSQL container acceptance đã chạy trong lượt này.

## Production API acceptance

Dùng hai tài khoản tổng hợp một lần, tạo qua Admin API với mật khẩu ngẫu nhiên đáp ứng chính sách hiện hành; không in key/token/password. Đã xác nhận cleanup trả 200.

- Ledger wallet snapshot, schedule CRUD và wallet scope.
- Retry đồng thời cùng key, key mismatch, stale revision, owner isolation, anonymous rejection và no-store.
- Tạo giao dịch tổng hợp qua Dart API; settlement concurrent replay, stale/foreign rejection, clear và old-replay non-resurrection.
- Learning consent mặc định off, owner isolation, accept/revoke generation; job generation trả 503 khi disabled.
- Bài chưa publish trả 400; progress/activity tài khoản mới trống. Không sửa publication gate và không gọi provider.

Log: `production-acceptance.log`; lượt đầu của bản mở rộng gặp mật khẩu fixture không đáp ứng chính sách nên được sửa bằng random password có đủ nhóm ký tự. Đây là lỗi fixture, không phải lỗi sản phẩm.

## Triển khai và rollback web/API

Image mới: `picket-web:completion-20261027`, `picket-api:completion-20261027`. Source build nằm tại `/opt/picket/deploy/builds/completion-20261027`, không chứa `.env` hoặc signing material. Bản compose trước nằm tại `compose.production.before.yml` trong thư mục đó.

Rollback: khôi phục file compose từ bản backup này, rồi chạy Docker Compose từ `/opt/picket` với `--env-file deploy/.env.production -f compose.production.yml up -d --no-deps --no-build web api`. Không rollback schema bằng DROP bảng; migration mới mang tính bổ sung.

Trạng thái cuối: **chưa đủ bằng chứng để tuyên bố hoàn tất mọi gate phát hành**. Thiết bị thật, Billing license-test lifecycle, Console-only declarations, cohort thực, nội dung độc lập và backtest dữ liệu thực vẫn cần đầu vào tương ứng.

## AAB và Play Internal

AAB **1.0.5/code 18** build PASS, ký verified, 57.567.759 byte; backup `.artifacts/releases/picket-1.0.5-18-completion-play.aab`, SHA-256 `ed7fc185bfa34fd85c4ba592285eec5ba96ddfb11a1b608a0294d73a03622526`. Manifest Play không có REQUEST_INSTALL_PACKAGES/SYSTEM_ALERT_WINDOW. Internal upload thành công, edit ID `14487335250111124513`; đọc lại track completed/100%. Alpha và production không thay đổi.

Listing VI hiện có 7 phoneScreenshots. Không tải ảnh tài khoản thực lên cửa hàng. Không coi việc upload Internal là nghiệm thu thiết bị ARM64 hoặc Billing.

Advisor cuối không còn cảnh báo anon gọi SECURITY DEFINER trigger. Còn 25 cảnh báo authenticated SECURITY DEFINER cho các RPC có chủ đích và một cảnh báo leaked-password protection disabled; không tuyên bố advisor hoàn toàn sạch. Các RPC cần tiếp tục giữ kiểm tra owner/role; không thu hồi blanket gây hỏng API.

## Giới hạn truy cập Play Console

Browser inventory không có browser được kết nối; tạo Chrome tab trả `Browser is not available: chrome`. Thử mở URL Play Console trên Pixel 5 qua ADB cũng bị automatic approval từ chối trước thực thi, lý do duy nhất được trả là `blocked by policy`. Không thử bypass hoặc giả xác nhận các khai báo. Đây là blocker cho Finance category/RTDN Send Test Message/Console-only declarations, không ảnh hưởng các API read và upload Internal đã thành công.

## Tổng kết kiểm tra

- 1.095 tests toàn repo PASS; 13 SQL suites PASS. Coverage không đo trong lượt này, repo không đặt threshold.
- Lint/typecheck/analyzer PASS trong phạm vi báo cáo; mobile còn 27 warning hiện hữu.
- Npm audit toàn bộ web sau cập nhật: 0 vulnerability.
- Scan credential pattern trong source/docs được rà: không thấy private key, secret-key token hoặc Gemini key khớp mẫu. Đây không phải chứng nhận security audit toàn dự án.
- Rà 130 Markdown docs: không thiếu local link target; whitespace các docs vừa sửa không lỗi.
- Các thay đổi local từ trước vẫn giữ nguyên; không reset/clean hoặc tự khôi phục DOCX đã bị xóa.

Commit của lượt này: `8304d15e` (SQL RED), `f8c70b7b` (SQL GREEN), `2f9b80d9` (web dependency patch). Tài liệu và các thay đổi UI có trước vẫn nằm trong working tree để không trộn vào các commit sửa lỗi có phạm vi hẹp.

## APK tải trực tiếp

APK **1.0.5/code 18 ARM64** build PASS, apksigner verified, backup `.artifacts/releases/picket-1.0.5-18-completion-arm64.apk`. SHA-256 `2a498a67bb8f8683f39d18d53b559dce829b5ba6f374465e0cc280223f8d0c23`. Manifest direct có REQUEST_INSTALL_PACKAGES và không có SYSTEM_ALERT_WINDOW; AAB Play không có cả hai quyền đó. Chi tiết kích thước/hash: `release-artifacts.json` trong task artifacts.

Bản APK đầu đã build PASS nhưng prebuild kênh Play thay output trước khi backup; đã build lại và backup bản cuối ở trên. Một lần gọi Gradle retry bị PowerShell tách property có dấu chấm; đã quote argument và build cuối PASS. Không dùng các lượt lỗi làm bằng chứng PASS.

Landing vẫn phục vụ code 17; không công bố code 18 là đã nghiệm thu ARM64 thật. Ánh xạ ổ P: do lượt này tạo đã được gỡ sau build.

## Tiếp tục theo phân công của chủ dự án

Chủ dự án xác nhận tự test chức năng trên điện thoại thật sau; agent tiếp tục các phần khác. Checklist thiết bị thật được cập nhật sang code 18 và giữ trạng thái chờ chủ dự án nghiệm thu. Bắt đầu lượt mobile cloud UI/offline/owner isolation bằng hai tài khoản tổng hợp riêng; không dùng dữ liệu tài chính thật để tạo fixture.

## Mobile cloud UI và CI follow-up

Đã hoàn tất thêm [mobile cloud CRUD/offline/A–B–A](MOBILE_CLOUD_ACCEPTANCE_20261027.md) trên Pixel 5 code 18. Đã khôi phục Google session, bật lại Wi-Fi/data, xóa đúng hai fixture và xác minh không còn user test. Thiết bị thật do chủ dự án tự nghiệm thu sau theo chỉ đạo mới.

Đóng khoảng trống CI: `validate.mjs` trước đây chỉ nạp migration đến `202610210004`; nay giữ các regression cũ rồi nạp migration mới và chạy 13 SQL suite. Thêm `npm run test:db`, gắn vào `npm test` và job backend CI. Đây là tích hợp các regression đã có vào test pipeline, không tuyên bố một vòng RED/GREEN mới cho nghiệp vụ.

Validation cuối sau tích hợp DB: `npm test` exit 0, gồm 10 landing/891 mobile/54 web/140 Dart API và toàn bộ legacy SQL + 13 suite mới. Commit `1c378641` gắn migration regression vào root test và workflow backend. Workflow đã được cấu hình trong source; chưa tuyên bố có GitHub Actions run mới vì chưa push các chỉnh sửa local có trước. Rà docs sau bổ sung báo cáo cloud: 131 Markdown files, không thiếu local link target.

## Giáo trình hoàn thiện theo yêu cầu tiếp theo

Chủ dự án chọn giữ closed test ở draft và yêu cầu hoàn thiện nội dung. Đã bổ sung bản biên tập 2 VI/EN: 12 bài, 36 quiz, 108 lời giải lựa chọn, 12 bài tự kiểm tra theo bước và 60 phép kiểm số học. ID/version quiz/đáp án giữ nguyên; không thay migration hoặc publication gate. [Giáo trình](../learning/README.md) và [hồ sơ nguồn](../learning/CONTENT_PACK_EDITORIAL_20261027.md).

Test RED `a5513c58`; kiểm tra cuối: 10 landing/894 mobile/54 web/140 API và 13 SQL suites PASS; typecheck/lint PASS, Android Hermes export PASS. Generator tái tạo byte-identical; ZIP nội dung 7 file đã kiểm archive integrity. Phần biên tập mới nằm trong source, chưa nằm trong bản Play code 18 được upload trước đó.

## Lượt hoàn thiện và phát hành tiếp theo — code 19

Đã sửa race/callback và bản dịch VI/EN của conflict editor; native acceptance với hai fixture xác nhận merge giữ tiêu đề local/số tiền server và đúng version 3. Fixture/credential đã dọn. [Báo cáo conflict](SYNC_CONFLICT_COMPLETION_20261027.md).

Kiểm tra toàn repo mới nhất: **10 landing + 908 mobile + 54 web + 140 API = 1.112 tests PASS**, cùng legacy SQL và 13 suite mới; lint/analyzer/typecheck PASS, mobile 0 lỗi/0 cảnh báo. Tài liệu hiện có 135 Markdown, không thiếu đích liên kết nội bộ.

Theo yêu cầu phát hành mới của chủ dự án, **1.0.6/code 19** đã lên landing và Google Play Internal. APK tải lại trên cả hai domain khớp SHA-256/size; Internal đọc lại completed 100%. Alpha giữ draft, production không mở. Giáo trình biên tập 2 đã đóng gói nhưng publication gate không thay đổi. [Artifact, checksum, receipt và rollback](ANDROID_RELEASE_1_0_6_20261027.md).

Ánh xạ P: phục vụ build đã gỡ. Không còn tài khoản test/credential của native conflict acceptance. Camera/sinh trắc/cập nhật ARM64 thật do chủ dự án tự kiểm sau; Billing, Console-only verification, independent content review và pilot vẫn là các điều kiện bên ngoài được ghi tại trạng thái chung.
