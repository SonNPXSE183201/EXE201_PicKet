# Trạng thái hiện hành của Picket

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


**Cập nhật source local 25/10/2026:** bộ kiểm tra hiện tại đạt 10 landing, 764 mobile, 54 web và 140 API test; mobile typecheck và lint các tệp vừa sửa đạt. Preview dòng tiền dùng lịch thiết bị cho ngày mặc định (`a9a073c7`) và chặn hai lần lưu lịch liên tiếp (`6cff0f46`). Thanh toán có nhãn/thông báo vi/en theo ngôn ngữ hiện tại và không hiển thị nguyên lỗi upstream (`ddeb59a6`, RED `f3f77afd`). Đây là kiểm tra source, không phải nghiệm thu APK/AAB mới: Play internal đang ở code 7, còn source hiện tại có thay đổi sau bản build đó.

**Redmi 7 kết nối lại 25/10:** ADB nhận thiết bị Android, Picket đang cài từ `com.android.vending`, phiên bản 1.0.4/code 7. Mở MainActivity và đọc UI hierarchy thành công, có màn Tổng quan và các tab điều hướng. Thao tác chạm qua ADB bị MIUI từ chối với `INJECT_EVENTS`; đang chờ chủ thiết bị bật USB debugging security settings hoặc thao tác thủ công. Không cài đè/gỡ app, xóa dữ liệu hay thay đổi tài chính trong lượt này; không ghi nhận các ca camera/sinh trắc/Billing là đã nghiệm thu.

**Billing concurrency follow-up 25/10:** RED `1a429641` tái hiện khôi phục bị dispatch hai lần và tiếp tục xác minh sau unmount. GREEN `cec31ba5` thêm khóa mua/khôi phục theo vòng đời màn hình và access token, kiểm tra lại trước verify/finish và trước cập nhật quyền lợi. Test callback thực thi screen với adapter giả lập cũng kiểm tra token thay thế, hai lần mua nhanh và thoát trước dispatch tới Play. Full mobile đạt 768/768 trước ca bổ sung cuối; nhóm billing cuối đạt 15/15, lint và typecheck qua hook. Không tạo giao dịch thật, không coi các test này là nghiệm thu sandbox hoặc UI native.

**Billing/Redmi follow-up tiếp theo 25/10:** `172099f2` loại phản hồi quyền lợi cũ sau một lần restore mới hơn (RED `a3e73d63`); `db5af545` phân biệt xác minh đã thành công với lỗi tải lại trạng thái gói (RED `fbfed159`). Full mobile lúc đó đạt 772/772. Trên Redmi code 7, deep link Cá nhân và Billing mở được qua Android intent; ảnh màn hình và UI hierarchy cho thấy thẻ Plus chưa có giá nhưng nút chọn vẫn bật. Không bấm mua. Source `7a4cf53b` yêu cầu cùng một offer có token và giá hiển thị trước khi bật nút hoặc dispatch mua; RED `e7a1d0e6`. Nhóm billing cuối đạt 19/19, lint/typecheck qua hook. Source mới chưa nằm trong bản code 7 trên thiết bị; kiểm thử sandbox và nghiệm thu APK/AAB mới vẫn mở. Bằng chứng local: `.artifacts/redmi-billing.png`, `.artifacts/redmi-billing-window.xml`.

**Billing catalogue recovery 25/10:** RED `4ed8f3f3`, GREEN `ea0207b9` thêm tải lại bảng giá tại màn hình, trạng thái tải, bắt lỗi Promise và cho retry sau lỗi. Catalogue đang tải chặn dispatch mua từ callback cũ; giá hiển thị và token mua lấy từ cùng offer hợp lệ. Full mobile cuối đạt **775/775**, lint/typecheck qua hook. Đây là source chưa phát hành; Redmi vẫn đang chạy code 7 và MIUI vẫn từ chối input injection.

**Gate phát hành còn mở:** rà các thay đổi local chưa commit; nghiệm thu Android thật và nội dung học; đánh giá dự báo với dữ liệu được phép; chạy vòng đời Billing sandbox qua Play; hoàn thiện Console và nhóm người thử nghiệm kín. Bản AI miễn phí hiện chỉ dùng tình huống tổng hợp, không gửi câu trả lời cá nhân hoặc dữ liệu tài chính thật. [Checkpoint triển khai 25/10](../plans/MOBILE_PLAN_IMPLEMENTATION_CHECKPOINT_20261023.md), [Play readiness 24/10](../google-play/RELEASE_READINESS_20261024.md), [checklist Android thật](../ANDROID_REAL_DEVICE_CHECKLIST.md). Các số liệu và giới hạn 22/10 bên dưới là snapshot lịch sử.

**Đọc lại Play Console 25/10 qua MCP:** bốn gói Plus/Pro tháng/năm có giá VN 19.000/199.000/49.000/499.000 ₫, nhưng mọi base plan vẫn `DRAFT`. Kênh internal có release code 7 `completed`; alpha có code 6 `draft`, production chưa có release. API tester của alpha và internal không trả Google group nào. Không suy ra giao dịch sandbox, nhóm thử nghiệm hợp lệ hoặc quyền phát hành công khai từ những kết quả đọc này.

**Web/landing production 22/10:** đã triển khai source `6993560`, có nút Đăng nhập trên landing và workspace admin riêng. GitHub đã nhận nhánh `feat/picket-platform-ocr`; smoke HTTPS đạt, không đổi mobile/API/OCR/schema. [Triển khai và rollback](../migration/WEB_PRODUCTION_20261022.md). Các dòng “chưa push/deploy” của checkpoint local bên dưới là lịch sử.

Cập nhật ngày 22/10/2026 (Asia/Saigon). **Checklist phần 1 trên máy ảo đã nghiệm thu đạt** theo [báo cáo chốt](../migration/PART1_ACCEPTANCE_20261022.md); [APK 1.0.4/code 5 đã lên landing](../migration/ANDROID_RELEASE_1_0_4_20261022.md). Đây không phải tuyên bố hoàn tất toàn roadmap/thiết bị thật/Billing. Báo cáo theo ngày trong `docs/migration` là bằng chứng từng checkpoint, không phải trạng thái phát hành mới nhất.

Source hiện tại: **415 mobile tests PASS**, không skip; typecheck đạt, lint 0 lỗi/24 cảnh báo hiện hữu; API **82 tests PASS**, analyzer không lỗi. [Dung lượng ảnh](../migration/REAL_ENOSPC_ANDROID_20261021.md) đã đạt hai ca native ENOSPC thật: mở lạnh khi đầy ổ và hết dung lượng đúng lúc restore; dùng số byte khả dụng không tính reserved blocks. [Cache preview lịch](../migration/CALENDAR_PREVIEW_CACHE_TDD_20261021.md), [picker bị ngắt](../migration/PICKER_INTERRUPTION_TDD_20261021.md) và [race reminder qua đổi owner](../migration/REMINDER_OWNER_RACE_TDD_20261021.md) đều có bằng chứng native riêng. Độ mượt và các ca mở được ghi cụ thể ở bảng dưới; số test thấp hơn trong báo cáo theo ngày là checkpoint lịch sử.

## Sản phẩm và phát hành

- Mobile chính thức: Expo/React Native Android. Có guest lưu trên máy và tài khoản cloud; không khôi phục Flutter, không làm iOS.
- Backend: Dart Frog + Supabase Auth/PostgreSQL/RLS/Storage. Giữ Next.js hiện có; landing tải APK là static site riêng trong `apps/landing`.
- Landing public: **1.0.4 / versionCode 5**, package `com.picket.mobile`, ARM64, 70.320.600 byte, SHA-256 `ee02a07682fbcb8abfadf9605ae663c45a15398ce7d82e9412508ac740f18fc7`. Tải HTTPS đầy đủ/checksum/Range, manifest, login và API health đạt; cùng khóa ký bản trước, không QA/probe.
- Cá nhân có kiểm tra/tải cập nhật và footer phiên bản. Bản 1.0.2 cần cài đè bootstrap một lần. Android vẫn yêu cầu xác nhận cài; không gỡ app hay cài im lặng.
- Production x86_64 chỉ dùng máy ảo, không thay APK ARM64 trên landing. QA AVD đã smoke cài đè 1.0.3→1.0.4 giữ kỷ vật guest và footer đúng. Các AVD khác chưa được cập nhật 1.0.4 trong lượt này; số bốn AVD ở báo cáo 1.0.3 là checkpoint lịch sử.
- Migration OCR retention `202610210001` và Partner Notice `202610210002` đã triển khai. Dòng “chưa triển khai” ở checkpoint cũ không phải hiện trạng.
- Theo phê duyệt riêng: `202610210003`/`202610210004` và API phục hồi yêu cầu hóa đơn đã triển khai; health và ma trận API thật đạt. [Báo cáo và rollback](../migration/RECEIPT_ATTEMPT_RECOVERY_TDD_20261021.md). UI phục hồi đã có trong APK public 1.0.4.

## Nghiệm thu phần 1 — đã đạt các ca trong phạm vi máy ảo

| Luồng | Bằng chứng mới nhất / điều kiện chưa đóng |
| --- | --- |
| Token hết hạn, thu hồi refresh, offline A–B–A | **PASS toàn chu kỳ** độc lập `natural-expiry-fdf29503`: hết hạn thật, server 403 trước revoke, thu hồi refresh, A offline logout/B login, B offline không có ảnh/queue A, quay A đồng bộ đúng một giao dịch và có ảnh riêng. B cloud không đổi. Lượt cũ bị ngắt không tính PASS. |
| Google callback lạnh | Dừng tiến trình QA trước màn chọn tài khoản; người dùng xác nhận Google, Android mở lại Dashboard. `part1-google-cold-callback-result.json`. Không suy thành mọi biến thể PKCE. |
| Hiệu năng lịch | PASS bản QA không debug, API HTTPS thật: 5 cold load 1,914–3,310 giây, gallery 247–406ms; 36 cử chỉ/358 frame, P95 18–26ms, không frame >100ms. Mở đầu sau reboot: lịch enabled 16,185 giây gồm UI dump/cuộn, dưới bound 20 giây, mở đúng ngày. Ảnh offline đã đạt riêng. Các lượt debug/SwiftShader lỗi được giữ nguyên; không suy thành mọi máy đạt 60fps. |
| Camera/OCR | Sáu ca capture, OCR server qua A→B và picker SIGKILL fallback/A–B–A đạt. ENOSPC thật trên AVD guest riêng cũng đạt: mở lạnh/restore tại 0 byte khả dụng giữ metadata sửa được và ảnh mã hóa nguyên vẹn; giải phóng đúng filler rồi restart mở ảnh cũ. Không nhận ảnh OS chưa giao. ANR ban đầu và các probe sai vẫn được lưu trong báo cáo, không đổi thành PASS. |
| Media kỷ vật | Cleanup/EACCES, lưu ảnh cạnh tranh và A→B→A đều đạt. [ENOSPC thật](../migration/REAL_ENOSPC_ANDROID_20261021.md) trên AVD mới riêng cũng đạt: ảnh thay thế không lưu được khi filesystem đầy; toàn row/hash ảnh cũ giữ nguyên, xóa đúng filler rồi cold restart mở ảnh cũ. Không làm đầy máy ảo chính hay ổ laptop. |
| Partner Notice | 12 ca native fixture đạt cùng phản hồi A đến muộn khi sang B/guest suppression. Bổ sung hết hạn khi app ở nền, quay lại cùng tiến trình: quảng cáo hết hạn biến mất, thông báo đối chứng vẫn hiện, không nhấn tải lại. Không suy thành push quảng cáo hay chứng nhận staff/RLS production. |
| Chữ lớn | Đã rà 35 màn × 150%/200%, 12 footer form, 10 auth và 16 bước onboarding; thêm sáu ảnh hộp thoại lịch/xóa/đăng xuất. Hai ảnh nút phục hồi hóa đơn mới tại 150%/200% đã xem: chữ xuống dòng, nút đọc được/cuộn tới được; không submit trong ca layout. TalkBack đã được người dùng xác nhận. |
| Chịu lỗi đồng bộ | Ba vòng bulk mixed và phục hồi validation đạt. Native ví offline→ba giao dịch dùng ví tạm→cold restart offline→ba vòng ngắt mạng→server cũng đạt: đúng một ví, ba giao dịch tham chiếu ID ví thật, tổng 3.006; restart lần nữa không tạo trùng. Không suy thành stress vô hạn. |
| Backup/restore | Guest ảnh qua Document Picker/Share Sheet, so toàn payload/checksum và lỗi giữa restore/rollback đạt, gồm creation ledger/tombstone. Intentional edit sau lỗi progress và ba commit đồng thời qua provider Android đạt: đúng một giao dịch/ledger; retry cũ không ghi đè tên/số tiền đã sửa. Đây là integration provider thật, không suy thành screen handler đồng thời. File Flutter thật là đầu vào riêng. |
| Cập nhật app | Luồng native QA đạt tải/verify, quyền, Play Protect, xác nhận Android, restart, footer code 5 và giữ kỷ vật guest. Candidate QA có manifest điều khiển, không phải APK public mới; không dùng ADB để cài candidate ở bước nghiệm thu. |

Các gate source hiện hành và liên kết báo cáo ở đầu tài liệu. SQL functional/cạnh tranh PostgreSQL thật đạt cho fence; APK public 1.0.4 chứa follow-up đã chốt. Các đầu vào ngoài phạm vi bên dưới vẫn chưa được nghiệm thu; phát hành không tự biến chúng thành PASS.

## Đầu vào ngoài phần 1

- Điện thoại ARM64 thật: camera, sinh trắc học, hiệu năng và cập nhật giữ dữ liệu; [từng bước và tiêu chí](../ANDROID_REAL_DEVICE_CHECKLIST.md).
- File `.picket` Flutter thật: người dùng xác nhận không có file và tập trung Expo/Next/Dart; nghiệm thu dữ liệu Flutter lịch sử được loại khỏi phạm vi MVP, không đánh dấu PASS và không xóa bộ import tương thích. Bộ export local chạy lại 15/15 PASS; không thay thế file thật.
- Play Console: đã đăng ký tài khoản cá nhân theo ảnh người dùng ngày 22/10; đang chờ Google duyệt danh tính, xác minh số điện thoại chưa hoàn tất. Thẻ xác minh website đã triển khai và commit `2c73b44`; chưa có bằng chứng Google xác minh website thành công. AAB/track/license tester/sản phẩm và Billing sandbox chưa nghiệm thu; chưa kích hoạt thanh toán production. [Hướng dẫn tới sandbox](../GOOGLE_PLAY_SANDBOX_TO_PRODUCTION.md).
- Staff/admin: 18 kiểm tra quyền/API/Android/audit đã đạt với tài khoản mới. Follow-up: API reset thật HTTP 200 và người dùng xác nhận nhận email ở inbox kiểm soát; đã xóa staff/target alias test, không đổi tài khoản chính. Settings có 8 ca PostgreSQL 16 cô lập PASS, nhưng toàn luồng Android/API staging chưa chạy. Người dùng đã chạy cleanup SQL thành công; SELECT staff xác minh độc lập còn 0 fixture. Đã tạo tài khoản admin riêng theo alias chủ sở hữu chấp thuận, API 403 trước cấp quyền/200 sau cấp quyền; chủ sở hữu tự đặt mật khẩu và xác nhận UI web theo [hướng dẫn admin](../ADMIN_WEB_ACCESS.md). Không có hai cấp staff/super-admin; tài khoản admin mới này được giữ theo yêu cầu, khác các tài khoản QA đã xóa. [Báo cáo giới hạn](../migration/STAFF_ADMIN_ACCEPTANCE_20261022.md).

Tiến độ backup/admin và tiêu chí đóng từng ca: [theo dõi 22/10](../migration/BACKUP_ADMIN_EXTERNAL_ACCEPTANCE_20261022.md). Email tới inbox thật đã được người dùng xác nhận; DB local không thay thế Android/API staging. [Audit Flutter](../migration/FLUTTER_SOURCE_AUDIT_20261022.md): không còn Flutter runtime, không xóa Dart backend hoặc TypeScript backup của Expo.

Chủ sở hữu đã tự đặt lại mật khẩu tài khoản admin riêng và xác nhận vào `/admin` thành công trong hội thoại ngày 22/10. Theo yêu cầu tiếp theo, **source web local** đã hoàn tất UI/UX responsive cloud và workspace admin riêng, login theo role, đồng bộ màu Expo. Đã kiểm tra 152 tổ hợp trang/viewport và 49 unit test; chưa push/deploy. Mobile/API/Supabase không thay đổi. Chủ sở hữu đã xác nhận giữ web cloud, không bổ sung guest/offline; không tuyên bố parity toàn bộ native hoặc production đã nghiệm thu. [Báo cáo và giới hạn](WEB_UI_ACCEPTANCE_20261022.md).

## Nguồn bằng chứng

- [Kế hoạch](../migration/APP_COMPLETION_PLAN.md)
- [Ma trận nghiệm thu](../migration/PART12_ACCEPTANCE_MATRIX_20261021.md)
- [Cập nhật app/phát hành 1.0.3](../migration/IN_APP_UPDATE_TDD_20261021.md)
- [Parity](../migration/FEATURE_PARITY.md)
- [Flutter → Expo](../migration/FLUTTER_EXPO_GAP.md)

Runtime/checksum/XML/screenshot ở `.artifacts/roadmap-qa`; không commit credential, APK hay build cache. Chỉ nâng trạng thái đúng ca có kết quả thực thi; unit test không chứng nhận toàn bộ Android E2E.
