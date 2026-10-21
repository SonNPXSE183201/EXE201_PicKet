# Trạng thái hiện hành của Picket

Cập nhật ngày 22/10/2026 (Asia/Saigon). **Checklist phần 1 trên máy ảo đã nghiệm thu đạt** theo [báo cáo chốt](migration/PART1_ACCEPTANCE_20261022.md); [APK 1.0.4/code 5 đã lên landing](migration/ANDROID_RELEASE_1_0_4_20261022.md). Đây không phải tuyên bố hoàn tất toàn roadmap/thiết bị thật/Billing. Báo cáo theo ngày trong `docs/migration` là bằng chứng từng checkpoint, không phải trạng thái phát hành mới nhất.

Source hiện tại: **415 mobile tests PASS**, không skip; typecheck đạt, lint 0 lỗi/24 cảnh báo hiện hữu; API **82 tests PASS**, analyzer không lỗi. [Dung lượng ảnh](migration/REAL_ENOSPC_ANDROID_20261021.md) đã đạt hai ca native ENOSPC thật: mở lạnh khi đầy ổ và hết dung lượng đúng lúc restore; dùng số byte khả dụng không tính reserved blocks. [Cache preview lịch](migration/CALENDAR_PREVIEW_CACHE_TDD_20261021.md), [picker bị ngắt](migration/PICKER_INTERRUPTION_TDD_20261021.md) và [race reminder qua đổi owner](migration/REMINDER_OWNER_RACE_TDD_20261021.md) đều có bằng chứng native riêng. Độ mượt và các ca mở được ghi cụ thể ở bảng dưới; số test thấp hơn trong báo cáo theo ngày là checkpoint lịch sử.

## Sản phẩm và phát hành

- Mobile chính thức: Expo/React Native Android. Có guest lưu trên máy và tài khoản cloud; không khôi phục Flutter, không làm iOS.
- Backend: Dart Frog + Supabase Auth/PostgreSQL/RLS/Storage. Giữ Next.js hiện có; landing tải APK là static site riêng trong `apps/landing`.
- Landing public: **1.0.4 / versionCode 5**, package `com.picket.mobile`, ARM64, 70.320.600 byte, SHA-256 `ee02a07682fbcb8abfadf9605ae663c45a15398ce7d82e9412508ac740f18fc7`. Tải HTTPS đầy đủ/checksum/Range, manifest, login và API health đạt; cùng khóa ký bản trước, không QA/probe.
- Cá nhân có kiểm tra/tải cập nhật và footer phiên bản. Bản 1.0.2 cần cài đè bootstrap một lần. Android vẫn yêu cầu xác nhận cài; không gỡ app hay cài im lặng.
- Production x86_64 chỉ dùng máy ảo, không thay APK ARM64 trên landing. QA AVD đã smoke cài đè 1.0.3→1.0.4 giữ kỷ vật guest và footer đúng. Các AVD khác chưa được cập nhật 1.0.4 trong lượt này; số bốn AVD ở báo cáo 1.0.3 là checkpoint lịch sử.
- Migration OCR retention `202610210001` và Partner Notice `202610210002` đã triển khai. Dòng “chưa triển khai” ở checkpoint cũ không phải hiện trạng.
- Theo phê duyệt riêng: `202610210003`/`202610210004` và API phục hồi yêu cầu hóa đơn đã triển khai; health và ma trận API thật đạt. [Báo cáo và rollback](migration/RECEIPT_ATTEMPT_RECOVERY_TDD_20261021.md). UI phục hồi đã có trong APK public 1.0.4.

## Nghiệm thu phần 1 — đã đạt các ca trong phạm vi máy ảo

| Luồng | Bằng chứng mới nhất / điều kiện chưa đóng |
| --- | --- |
| Token hết hạn, thu hồi refresh, offline A–B–A | **PASS toàn chu kỳ** độc lập `natural-expiry-fdf29503`: hết hạn thật, server 403 trước revoke, thu hồi refresh, A offline logout/B login, B offline không có ảnh/queue A, quay A đồng bộ đúng một giao dịch và có ảnh riêng. B cloud không đổi. Lượt cũ bị ngắt không tính PASS. |
| Google callback lạnh | Dừng tiến trình QA trước màn chọn tài khoản; người dùng xác nhận Google, Android mở lại Dashboard. `part1-google-cold-callback-result.json`. Không suy thành mọi biến thể PKCE. |
| Hiệu năng lịch | PASS bản QA không debug, API HTTPS thật: 5 cold load 1,914–3,310 giây, gallery 247–406ms; 36 cử chỉ/358 frame, P95 18–26ms, không frame >100ms. Mở đầu sau reboot: lịch enabled 16,185 giây gồm UI dump/cuộn, dưới bound 20 giây, mở đúng ngày. Ảnh offline đã đạt riêng. Các lượt debug/SwiftShader lỗi được giữ nguyên; không suy thành mọi máy đạt 60fps. |
| Camera/OCR | Sáu ca capture, OCR server qua A→B và picker SIGKILL fallback/A–B–A đạt. ENOSPC thật trên AVD guest riêng cũng đạt: mở lạnh/restore tại 0 byte khả dụng giữ metadata sửa được và ảnh mã hóa nguyên vẹn; giải phóng đúng filler rồi restart mở ảnh cũ. Không nhận ảnh OS chưa giao. ANR ban đầu và các probe sai vẫn được lưu trong báo cáo, không đổi thành PASS. |
| Media kỷ vật | Cleanup/EACCES, lưu ảnh cạnh tranh và A→B→A đều đạt. [ENOSPC thật](migration/REAL_ENOSPC_ANDROID_20261021.md) trên AVD mới riêng cũng đạt: ảnh thay thế không lưu được khi filesystem đầy; toàn row/hash ảnh cũ giữ nguyên, xóa đúng filler rồi cold restart mở ảnh cũ. Không làm đầy máy ảo chính hay ổ laptop. |
| Partner Notice | 12 ca native fixture đạt cùng phản hồi A đến muộn khi sang B/guest suppression. Bổ sung hết hạn khi app ở nền, quay lại cùng tiến trình: quảng cáo hết hạn biến mất, thông báo đối chứng vẫn hiện, không nhấn tải lại. Không suy thành push quảng cáo hay chứng nhận staff/RLS production. |
| Chữ lớn | Đã rà 35 màn × 150%/200%, 12 footer form, 10 auth và 16 bước onboarding; thêm sáu ảnh hộp thoại lịch/xóa/đăng xuất. Hai ảnh nút phục hồi hóa đơn mới tại 150%/200% đã xem: chữ xuống dòng, nút đọc được/cuộn tới được; không submit trong ca layout. TalkBack đã được người dùng xác nhận. |
| Chịu lỗi đồng bộ | Ba vòng bulk mixed và phục hồi validation đạt. Native ví offline→ba giao dịch dùng ví tạm→cold restart offline→ba vòng ngắt mạng→server cũng đạt: đúng một ví, ba giao dịch tham chiếu ID ví thật, tổng 3.006; restart lần nữa không tạo trùng. Không suy thành stress vô hạn. |
| Backup/restore | Guest ảnh qua Document Picker/Share Sheet, so toàn payload/checksum và lỗi giữa restore/rollback đạt, gồm creation ledger/tombstone. Intentional edit sau lỗi progress và ba commit đồng thời qua provider Android đạt: đúng một giao dịch/ledger; retry cũ không ghi đè tên/số tiền đã sửa. Đây là integration provider thật, không suy thành screen handler đồng thời. File Flutter thật là đầu vào riêng. |
| Cập nhật app | Luồng native QA đạt tải/verify, quyền, Play Protect, xác nhận Android, restart, footer code 5 và giữ kỷ vật guest. Candidate QA có manifest điều khiển, không phải APK public mới; không dùng ADB để cài candidate ở bước nghiệm thu. |

Các gate source hiện hành và liên kết báo cáo ở đầu tài liệu. SQL functional/cạnh tranh PostgreSQL thật đạt cho fence; APK public 1.0.4 chứa follow-up đã chốt. Các đầu vào ngoài phạm vi bên dưới vẫn chưa được nghiệm thu; phát hành không tự biến chúng thành PASS.

## Đầu vào ngoài phần 1

- Điện thoại ARM64 thật: camera, sinh trắc học, hiệu năng và cập nhật giữ dữ liệu; [từng bước và tiêu chí](ANDROID_REAL_DEVICE_CHECKLIST.md).
- File `.picket` xuất từ Flutter thật: xác nhận tương thích lịch sử.
- Play Console/Internal testing/license tester và sản phẩm: Billing sandbox; người dùng xác nhận chưa có Console. [Hướng dẫn từ đăng ký tới production](GOOGLE_PLAY_SANDBOX_TO_PRODUCTION.md), chưa kích hoạt thanh toán thật.
- Staff/admin: 18 kiểm tra quyền/API/Android/audit đã đạt với tài khoản mới; đã thu hồi quyền/xóa tài khoản, không thay tài khoản khác. [Báo cáo giới hạn](migration/STAFF_ADMIN_ACCEPTANCE_20261022.md): reset email thật và mutation cài đặt toàn cục chưa chạy; hai fixture đối tác ẩn chờ SQL owner cleanup. Schema chỉ có một vai trò staff, không có hai cấp admin riêng.

## Nguồn bằng chứng

- [Kế hoạch](migration/APP_COMPLETION_PLAN.md)
- [Ma trận nghiệm thu](migration/PART12_ACCEPTANCE_MATRIX_20261021.md)
- [Cập nhật app/phát hành 1.0.3](migration/IN_APP_UPDATE_TDD_20261021.md)
- [Parity](migration/FEATURE_PARITY.md)
- [Flutter → Expo](migration/FLUTTER_EXPO_GAP.md)

Runtime/checksum/XML/screenshot ở `.artifacts/roadmap-qa`; không commit credential, APK hay build cache. Chỉ nâng trạng thái đúng ca có kết quả thực thi; unit test không chứng nhận toàn bộ Android E2E.
