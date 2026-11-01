# Trạng thái hiện hành của Picket

Cập nhật **01/11/2026, Asia/Saigon**. Đây là nguồn trạng thái chung cho mobile, web, API, Supabase và phát hành. [Mục lục tài liệu](README.md). Các báo cáo theo ngày giữ bằng chứng của lần chạy đó; danh sách pending cũ không tự động là backlog hiện tại.

## Phiên bản và môi trường

| Thành phần | Trạng thái đã xác minh |
| --- | --- |
| Mobile source/release | Source khai báo **1.0.14/code 28**. Build record ghi APK ARM64+x86_64 và AAB code 28; OCR QA riêng vẫn là code 36. |
| Landing public | APK 1.0.14/code 28 ARM64; ngày 01/11, manifest live trả HTTP 200 và APK URL trả HEAD HTTP 200, kích thước 161.644.903 bytes. SHA-256 manifest khớp artifact build `1713c3dfbbe220720e5a355442d0de8b4d5cc27b7c89840c1b1f0a2a0120b17b`. |
| Google Play Internal | 1.0.14/code 28 `completed`, rollout 100%; Publisher API readback ngày 01/11. |
| Google Play closed testing (`alpha`) | 1.0.14/code 28 `completed`, rollout 100%. Có một Google Group cấu hình; số thành viên, opt-in và số ngày tham gia liên tục chưa xác minh. |
| Google Play beta/production | Chưa có release. |
| APKPure | Artifact universal 1.0.14/code 28, ký xác minh, 7 ảnh store đã chuẩn bị. Nộp/duyệt/phát hành trên portal chưa có readback hiện hành. |
| Web production | `web-20261101-responsive-839e5cb-01` đã deploy; web container only, API/DB/OCR không đổi. User/admin đã kiểm tra bằng phiên thật, dữ liệu live, chế độ chỉ đọc. Xem [báo cáo deploy](../.artifacts/picket-web-prod-20261101/DEPLOYMENT.md). |
| Domain landing | https://picketfinance.com |
| Domain web | https://app.picketfinance.com |
| Domain Dart API | https://api.picketfinance.com |
| Supabase | Project `qyokoyopodjtvfyunyde`; 51 migration sau cập nhật admin ngày 28/10 |

Thiết kế duy nhất: [PICKET-DESIGN.md](../PICKET-DESIGN.md). Danh sách việc còn mở: [BACKLOG](BACKLOG.md). [Readback Google Play, landing, APKPure artifact và web](migration/STORE_RELEASE_READBACK_20261101.md). Không dùng số liệu phiên bản trong báo cáo cũ làm hiện trạng. Bản máy ảo không thay thế nghiệm thu điện thoại ARM64 hoặc Play Billing.

## Web production — responsive release ngày 01/11

Release `web-20261101-responsive-839e5cb-01` chỉ thay web container. Production có `NODE_ENV=production`, không bật `DEV_MOCK_AUTH`; các màn user/admin đã được mở bằng phiên tài khoản thật và tải dữ liệu từ API thật ở laptop, tablet và phone. Kiểm tra thực hiện ở chế độ chỉ đọc; admin mutation cần MFA chưa chạy. Demo ngân sách công khai trên landing được chủ dự án cho phép dùng dữ liệu minh họa. Chi tiết route, viewport và giới hạn: [báo cáo deploy](../.artifacts/picket-web-prod-20261101/DEPLOYMENT.md).

## OCR mobile — QA chưa đạt gate độ chính xác tổng quát

[Báo cáo mở rộng](migration/MOBILE_OCR_EXPANDED_20261028.md) tiếp nối [đợt structured OCR](migration/MOBILE_STRUCTURED_OCR_20261028.md): QA51 trên Redmi 7 chạy đủ 40 ảnh gốc `Bill/`; trong 25 tổng có nhãn: 19 đúng, 1 sai, 5 thiếu; 1 ảnh không chấm được và 14 chưa có nhãn. Đây là đánh giá giới hạn từ QA build code 36, không chứng minh mọi hóa đơn hoặc bản release code 28 được nhận diện đúng. Bản 1.0.14/code 28 hiện ở Play Internal, closed alpha và landing; Play beta/Production chưa có release. Xem [readback track ngày 01/11](migration/STORE_RELEASE_READBACK_20261101.md) và [báo cáo OCR](migration/MOBILE_OCR_EXPANDED_20261028.md).

## Admin/Auth production — checkpoint ngày 28/10

- Production có 18 màn admin web, phân quyền owner/operations/support/analyst/content, MFA cho mutation/export; API Dart, migration mới và worker riêng. Đã apply migration và triển khai API/web/worker production ngày 28/10; HTTPS và worker probe sau rollout đã kiểm tra.
- Ba trang login/register/forgot-password dùng Paper và có đường về landing. Mobile chặn staff trước khi mở provider dữ liệu; API kiểm tra vai trò mới cho mọi request nghiệp vụ.
- Checkpoint mới: 925 mobile, 57 web, 149 API, 13 landing tests; 14 SQL suites và 14 Edge tests (12 Google lifecycle + 2 policy), quota free/plus/pro; worker 10 tests. Build web/API/worker, Hermes và APK ARM64 đều qua. Xem báo cáo nghiệm thu để phân biệt fixture, PostgreSQL cô lập và kiểm tra production.
- UI admin: 18 màn × 4 độ rộng đã kiểm tra tải trang/tràn ngang; mutation ticket và policy API đã kiểm tra qua database cô lập. Có thêm smoke HTTPS, migration/ACL, collector test tách môi trường và worker production; chưa nghiệm thu bằng phiên owner thật/MFA thật.
- Google Play không có monthly report; Reporting API chưa bật. Dashboard phải thể hiện N/A; không tạo số lượt cài/doanh thu giả.

## Các checkpoint kiểm tra ngày 27/10

- Toàn repo: **10 landing + 908 mobile + 54 web + 140 API tests PASS**; không có mobile test bị skip.
- Mobile/web typecheck PASS. Lint toàn repo không lỗi; mobile hiện 0 lỗi/0 cảnh báo. Dart analyzer không lỗi.
- 13 bộ SQL test PASS trong PGlite sau khi áp toàn bộ migration trừ pg_cron; pg_cron được kiểm tra metadata trên Supabase thật.
- Pixel 5: đăng xuất qua UI, chọn tài khoản Google có sẵn, chọn Picket tại Android callback chooser, trở lại Home thành công. Force-stop/mở lại vẫn giữ phiên và dữ liệu cloud hiển thị. Không tạo/sửa/xóa giao dịch của tài khoản thật.
- Landing, privacy, account-deletion, web login và API health HTTPS trả 200.
- Production API synthetic acceptance PASS: ledger/schedule CRUD, retry đồng thời, stale revision, foreign-wallet rejection, settlement replay/non-resurrection; learning consent/revoke/isolation, draft lesson rejection và AI-disabled gate. Đã xóa tài khoản test; không gọi AI provider.
- Đã vá Next.js/eslint-config-next lên 16.4.3 và cập nhật dependency Zod. Web build/test/lint/typecheck PASS; npm audit không còn vulnerability. Web/API đã deploy trên VPS bằng image `completion-20261027`; runtime xác nhận Next.js 16.4.3, HTTPS smoke PASS.
- APK ARM64 1.0.6/code 19 đã xác minh chữ ký và đưa lên landing theo yêu cầu chủ dự án; bản cũ vẫn tải được. Chi tiết tại [báo cáo phát hành](migration/ANDROID_RELEASE_1_0_6_20261027.md). Thiết bị thật do chủ dự án tự nghiệm thu sau.

Log và dữ liệu kiểm tra riêng tư được giữ trong `.artifacts/completion-20261027`; không commit credential, ảnh tài khoản thật hoặc APK/AAB.

### UI Paper và landing motion — đã đóng gói/phát hành code 20

[Mobile Paper](migration/MOBILE_PAPER_UNIFICATION_20261027.md) đã nằm trong APK/AAB **1.0.7/code 20**: control/thẻ/typography gọn, cảnh báo đăng xuất theo queue thực, bỏ recheck dư và sửa chia danh mục guest. 147 ảnh QA native bao phủ 50 route; không thay thế nghiệm thu thiết bị thật.

[Landing motion](migration/LANDING_MOTION_RESEARCH_20261027.md) đã deploy production: hero giấy nhiều lớp/parallax, story đổi màn theo cuộn, mô phỏng khoản chi, tự chạy motion/reduced motion, footer và liên hệ. Không sửa giao diện `app.picketfinance.com`. 13 landing + 914 mobile tests, lint/typecheck/build PASS; Play Internal completed và tải APK đúng hash đã được đọc lại. [Báo cáo phát hành 1.0.7](migration/ANDROID_RELEASE_1_0_7_20261027.md).

## Nghiệm thu bổ sung và CI

- [Xử lý xung đột đồng bộ](migration/SYNC_CONFLICT_COMPLETION_20261027.md): đã sửa callback/race và hoàn thiện VI/EN; 15 focused tests PASS. Native fixture merge xác nhận đúng tiêu đề local/số tiền server/version 3, ảnh VI/EN đã xem, fixture đã dọn.


- [Mobile cloud CRUD/offline/owner isolation](migration/MOBILE_CLOUD_ACCEPTANCE_20261027.md) đã PASS; tài khoản Google thật được khôi phục, fixture đã xóa.
- `npm run test:db` đã được thêm vào `npm test` và job backend CI (commit `1c378641`); chạy root test local exit 0. Lệnh chuẩn chạy cả legacy SQL validation và 13 suite learning/cashflow/appearance/trigger mới; không còn chỉ kiểm nhóm migration cũ. pg_cron vẫn cần kiểm riêng trên PostgreSQL.
- Chủ dự án tự nghiệm thu thiết bị thật sau; checklist đã cập nhật code 20.

## Supabase — checkpoint production ngày 27/10 (51 migrations tính đến 28/10)

SMTP đã đổi ngày 27/10 sang `picketfinance@gmail.com`, tên gửi `Picket Production`. Đăng nhập SMTP TLS và email recovery thực đến inbox đều PASS; fixture đã xóa. Không thay đổi OAuth hoặc chính sách xác thực khác. [Báo cáo SMTP](migration/SMTP_SENDER_CHANGE_20261027.md).

Đã kiểm tra migration history, dry-run, thực thi 13 migration còn thiếu từ `20261023162639` đến `20261024120000`, rồi xác minh lại remote. Bao gồm appearance/preferences và backup, learning attempts/activity, AI consent/jobs/retention, cashflow snapshot/schedules/settlements/wallet scope.

Thêm migration `20261027052550_restrict_internal_trigger_execution.sql`: thu hồi quyền gọi trực tiếp hai trigger `enforce_maintenance` và `reject_suspended_snapshot` từ PUBLIC/anon/authenticated. Test RED tái hiện quyền thừa; GREEN xác nhận không gọi trực tiếp được và trigger bảo trì/khóa tài khoản vẫn chặn ghi đúng. Remote xác nhận quyền EXECUTE đã tắt. Tổng cộng **49 migration tại checkpoint 27/10**; tổng hiện hành tăng lên **51** sau các migration admin ngày 28/10.

- Tất cả bảng learning/cashflow mới bật RLS.
- Hai cron job retention/history đang active, lịch `17 * * * *` và `31 2 * * *`.
- Không có bài học được published trên cloud (`0`); migration không tự công bố nội dung hoặc bật AI.
- Không đưa seed test lên production; không thay đổi bản ghi tài chính người dùng trong lượt migration.
- Rollback: ưu tiên forward fix. Nếu API mới cần rút lại, rollback image trước; giữ bảng/cột bổ sung để bảo toàn dữ liệu. Không DROP bảng có dữ liệu hoặc sửa migration history để giả đồng bộ.

## Phạm vi tính năng đã có

- Android Expo chính thức, guest mã hóa local và tài khoản cloud; Next.js là web cloud/admin; Dart Frog giữ nghiệp vụ.
- Paper light/dark, Nunito, Home số dư/nhịp chi/túi/giao dịch gần đây, dock năm đích và camera.
- Tùy chỉnh tên/hình/màu túi lưu mã hóa theo owner trên thiết bị; chưa có đồng bộ cloud cho appearance túi.
- Guest tạo/sửa/xóa giao dịch, gallery system picker, OCR hóa đơn tổng hợp, lưu/mở lại ảnh và lịch hóa đơn đã được kiểm thử trên AVD mới.
- Học tài chính và dòng tiền có implementation preview cùng test local; không mặc nhiên là tính năng cloud đã phát hành.
- Quyết định chi phí: miễn phí ở giai đoạn hiện tại; AI miễn phí chỉ dùng tình huống tổng hợp. Câu trả lời cá nhân giữ local; cloud grading trả phí hoãn ngoài MVP hiện tại.

## Điều kiện chưa thể đóng bằng test source

| Hạng mục | Công việc/đầu vào còn cần |
| --- | --- |
| Android thật — chủ dự án tự nghiệm thu | Camera/OCR thật, sinh trắc, thông báo, độ mượt dài hạn và dữ liệu sau cập nhật chưa có kết quả nghiệm thu mới. QA thiết bị thật chỉ dùng `com.picket.mobile.bugqa`; không cài đè, xóa dữ liệu hoặc gỡ package production `com.picket.mobile`. |
| Mobile cloud CRUD/offline/owner switch | **PASS trên Pixel 5/code 18** với hai fixture: tạo/sửa/xóa offline qua restart, A→B→A, server đúng một bản ghi và soft-delete; đã cleanup. Conflict editor và cloud receipt media không nằm trong lượt này |
| Billing | Bốn base plan ACTIVE tại VN; Publisher acknowledgement, cancel/expiry, refund/revoke, decline, offline recovery, owner rejection, grace/hold và RTDN có bằng chứng trong [báo cáo 28/10](migration/BILLING_RELEASE_ACCEPTANCE_20261028.md). Live replay duplicate/out-of-order còn chờ quyền approval; đây là gate kiểm thử độc lập với việc phát hành code 28. |
| Google Play và closed test | Internal và alpha đều có code 28 `completed`, rollout 100%; beta/production trống. Một Google Group cấu hình ở alpha; member count, opt-in và tham gia liên tục chưa xác minh. Listing được đọc lại 31/10; trạng thái xét duyệt trong Console chưa kiểm tra lại ngày 01/11. Xem [readback hiện hành](migration/STORE_RELEASE_READBACK_20261101.md). |
| APKPure | Artifact 1.0.14/code 28 và 7 ảnh đã build/chuẩn bị; chưa có readback hiện hành để xác nhận đã upload, đang duyệt hay đã xuất bản. Trạng thái Publishing/Pending Approval ngày 28/10 không còn được xem là hiện trạng. |
| Nội dung học | Đã hoàn thiện [giáo trình VI/EN bản biên tập 2](learning/README.md): 12 bài, 36 quiz, 12 bài tự kiểm tra và 60 phép tính. Đã soạn/rà nguồn; chưa gắn phê duyệt độc lập hoặc publish cloud |
| Dự báo | Dữ liệu lịch sử được phép dùng, đủ nhãn completeness và backtest 7/30 ngày; không dùng dữ liệu tổng hợp để tuyên bố độ chính xác thực |
| Pilot | Người dùng tự nguyện thực sự, thời gian sử dụng và phản hồi; không tạo bằng chứng giả |
| Khác | Các thay đổi local đã có trước lượt này cần review theo nhóm; tệp DOCX bị xóa chưa xác nhận chủ đích |

Các mục phụ thuộc thiết bị, người dùng, Google review hoặc thời gian thử nghiệm không được ghi PASS bằng suy luận. Danh sách này thay thế các danh sách pending lặp lại trong checkpoint cũ.

## Tài liệu liên quan

- [Readback phát hành và cửa hàng ngày 01/11](migration/STORE_RELEASE_READBACK_20261101.md)
- [Báo cáo web production ngày 01/11](../.artifacts/picket-web-prod-20261101/DEPLOYMENT.md)
- [APKPure build và listing artifact ngày 01/11](../.artifacts/apkpure-store-20261101/BUILD-AND-LISTING.txt)
- [Báo cáo thực thi và kết quả mới](migration/PROJECT_COMPLETION_20261027.md)
- [Paper UI và native functional acceptance](migration/PAPER_UI_VERIFICATION_20261027.md)
- [OCR/code 17 và phát hành trước đó](migration/ANDROID_OCR_CODE17_PARTIAL_RECEIPTS_20261026.md)
- [Google Play readiness](google-play/RELEASE_READINESS_20261024.md)
- [Android thiết bị thật](ANDROID_REAL_DEVICE_CHECKLIST.md)
- [Billing sandbox](GOOGLE_PLAY_SANDBOX_TO_PRODUCTION.md)
- [Snapshot trạng thái cũ](migration/PROJECT_STATUS_20261025_SNAPSHOT.md)

## Kiểm tra toàn repository sau đồng bộ 27/10/2026

914 mobile, 54 web, 13 landing, 140 Dart tests và 13 bộ SQL PGlite đạt. Lint, typecheck, build web/landing và kiểm tra liên kết tài liệu đạt. Chi tiết cleanup, bản phát hành được giữ và quy trình Git tại [báo cáo đồng bộ](migration/REPOSITORY_SYNC_20261027.md). Các checkpoint cũ ở trên là bằng chứng lịch sử, không thay thế backlog hiện hành.

## Billing trên Play Store máy ảo — checkpoint code 21

Đã cài/cập nhật code 21 từ CH Play, OAuth, tải bốn giá, mua test Plus tháng và restore cấp PLUS/30; cold restart và server readback đúng quyền. Callback sau màn onboarding Google chưa tự cập nhật đúng; ack API/lifecycle/các SKU khác còn kiểm thử. Xem [báo cáo máy ảo](migration/PLAY_BILLING_EMULATOR_20261027.md).

## Gói Paper và quota OCR — checkpoint code 22

[Kiểm thử hoàn tất trong phạm vi](migration/BILLING_COMPLETION_20261027.md): 1.0.9/code 22 đã lên Internal và cập nhật bằng CH Play; bốn SKU có server verification và BillingClient acknowledgement. Pro tháng/năm tự khôi phục quyền khi về foreground, cold restart PRO 100. Màn gói Paper có tháng/năm, icon, quota và hai mode; chữ 150% đã kiểm tra. 29 Billing/922 mobile tests, lint/typecheck và SQL suites PASS. API thật nhận đủ 3/30/100 OCR, request kế tiếp 429, retry không thêm lượt; đã đợi hết hàng đợi và xóa ba fixture user/ảnh. Paid fixture OCR không phải bằng chứng mua Play. Lifecycle cancel/refund/grace/hold/decline/pending/RTDN còn mở; không đánh đồng native acknowledgement với Publisher ack API.

## Billing lifecycle và public APK — checkpoint lịch sử 28/10/2026

[Checkpoint ngày 28/10](migration/BILLING_RELEASE_ACCEPTANCE_20261028.md) là bằng chứng lịch sử cho Billing lifecycle. Phiên bản landing, trạng thái Play alpha/closed testing và APKPure trong checkpoint này đã thay đổi hoặc chưa được xác minh lại; xem [readback ngày 01/11](migration/STORE_RELEASE_READBACK_20261101.md) để biết hiện trạng cửa hàng.
