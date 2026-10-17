# Kế hoạch hoàn thiện Expo Android

Ngày rà soát: 2026-10-18. Phạm vi: Expo Android + Dart API hiện có; không khôi phục Flutter, không làm iOS. Các mục dưới đây phân biệt code đã có với bằng chứng kiểm thử còn thiếu. Không tự nâng `verified` từ unit test hoặc từ route tồn tại.

### Tiến độ increment 2026-10-18

- Kỷ vật: đã phân biệt persisted intent ảnh mới/ảnh cache, sửa metadata offline không upload lại ảnh; không xóa file cache đang dùng khi dọn outbox. Pixel 5 đạt sửa tên→restart offline→reconnect cùng ID/version 2/mediaPath gốc, Storage vẫn một object và queue rỗng; restart offline sau sync vẫn có ảnh. Bộ mobile 152/152. Queue legacy unknown, ảnh mới timeout/retry và media A–B còn thiếu. Xem [KEEPSAKE_PHOTO_INTENT_TDD.md](KEEPSAKE_PHOTO_INTENT_TDD.md).
- Kỷ vật: sửa cache write failure làm mất fresh remote/hiện snapshot cũ, cache-read failure che outbox; 148/148 test. Pixel 5 đạt ảnh cloud→restart offline và sửa metadata offline→restart→reconnect cùng ID/version 2. Phát hiện replay chỉ sửa tên vẫn upload ảnh mới, để ảnh cũ trên Storage; chưa nghiệm thu một ảnh/media A–B. Xem [KEEPSAKE_CACHE_FAILURE_TDD.md](KEEPSAKE_CACHE_FAILURE_TDD.md).
- Đã sửa bootstrap phiên offline: SDK refresh lỗi mạng/null hoặc chờ quá 8 giây có thể đọc lại phiên SecureStore hiện hữu để dùng cache đúng owner; auth event/sign-out hủy bootstrap cũ. Pixel 5 đạt cold-start offline với client clock +2 giờ, tạo 321 ₫→khôi phục giờ/reconnect→chỉ một bản ghi và queue rỗng. Bộ mobile 144/144; natural expiry/refresh revoke server chưa nghiệm thu. Xem [OFFLINE_SESSION_RECOVERY_TDD.md](OFFLINE_SESSION_RECOVERY_TDD.md).
- Offline A–B–A có queue đã đạt ca Android thực: A tạo chi 7.654 ₫ offline, logout offline; B online rồi restart offline không thấy dữ liệu A; quay lại A đồng bộ đúng một bản ghi, queue rỗng, B vẫn 0 giao dịch. Bổ sung regression policy 401, bộ mobile 134/134. Token expiry native và media A–B chưa đạt, không nâng toàn mục Offline thành verified. Xem [OFFLINE_ACCOUNT_QUEUE_ACCEPTANCE.md](OFFLINE_ACCOUNT_QUEUE_ACCEPTANCE.md).
- Đã bổ sung hóa đơn `reviewRequired` vào Review Inbox: mở/sửa/xác nhận trên Pixel 5 bằng user QA cô lập, API xác minh version 2/confirmed, quay lại Inbox tự tải lại và bỏ dòng đã xử lý. Ca API mất kết nối→thông báo→retry đạt Android. Bộ mobile 133/133, typecheck đạt, lint 0 lỗi/24 cảnh báo cũ. Danh sách review hóa đơn hiện cần mạng; chưa nâng các nhánh owner-switch/TalkBack/duplicate receipt thành verified. Xem [REVIEW_RECEIPT_INBOX_TDD.md](REVIEW_RECEIPT_INBOX_TDD.md).
- Đợt kiểm thử 8 luồng đã đạt ca Android mất response sau server commit→restart→retry cùng ID/duy nhất một adjustment; bulk 1/2 lỗi409→retry chỉ dòng lỗi; chốt tháng QA có split/refund/carry khớp API. Conflict Android+API session, hai tài khoản/cache offline, legacy JSON→encrypted WAL và >100 dòng đạt các nhánh ghi trong báo cáo, chưa toàn ma trận. Đã sửa Review Inbox dò nghi trùng O(n²), APK QA hiển thị tốt với >100 dòng; test mobile 128/128. Các phần token expiry thật, disk-full, hai Android và receipt reviewRequired còn thiếu. Xem [ANDROID_ROADMAP_QA_20261018.md](ANDROID_ROADMAP_QA_20261018.md).
- Smoke production phát hiện crash tái sử dụng channel realtime sau subscribe; đã sửa channel name theo lần subscribe và chặn callback sau cleanup. Bộ cuối đạt 129/129; APK x86_64 production đã build/cài, không chứa endpoint QA. Hai user/fixture QA đã purge, proxy đã dừng; chưa commit/push/deploy BE.

- Đã kiểm chứng trực tiếp lịch Tổng quan tháng 05/2026 → ngày 1 → ảnh hóa đơn đã lưu → chi tiết 250.000 ₫/đã xác nhận, dùng fixture cũ của tài khoản đang đăng nhập, không sửa dữ liệu.
- Đã triển khai cache metadata/ảnh receipt cloud mã hóa, phân theo user và giới hạn dung lượng. APK mới đã xác minh cả metadata và ảnh đầy đủ qua airplane mode/force-stop/mở lại, với hóa đơn 01/05/2026. Không có cache vô hạn cho mọi ảnh lịch sử; ảnh chưa tải/đã bị eviction vẫn cần mạng.
- Font 150% phát hiện FAB bị thanh điều hướng che; bản sửa clearance theo font/safe inset đã được nghiệm thu trực quan ở 150% và 200% trên APK mới. Đây chưa phải audit TalkBack/cỡ chữ của toàn bộ màn.
- Bulk archive trên Android đã đạt ca 2/2 thành công với hai fixture riêng `E2E-COMPLETE-1018-A/B`; cả hai đã được lưu trữ sau test. Còn ca lỗi một phần/retry, không nâng toàn bộ bulk thành hoàn tất.
- Đã sửa bulk phân loại nhầm mutation offline thành lỗi; APK mới xác minh thông báo chờ đồng bộ và bỏ chọn đúng, reconnect khôi phục số dư baseline. Mixed success/queued/conflict và retry chỉ mục lỗi đạt unit test; còn E2E lỗi authoritative xen thành công. Xem [BULK_OFFLINE_RESULT_TDD.md](BULK_OFFLINE_RESULT_TDD.md).
- Đã tách kết quả đối soát thành công khỏi lỗi refresh và chặn ngày không tồn tại. APK x86_64 mới đã cài cập nhật, xác minh Android từ chối `2026-02-31` trước mutation; 111/111 test mobile đạt. Ca mất response sau server commit và retry qua restart vẫn chưa nghiệm thu. Xem [RECONCILIATION_RETRY_TDD.md](RECONCILIATION_RETRY_TDD.md).
- Đã thay request ID chỉ trong RAM bằng journal SQLite mã hóa theo owner/payload; thêm khóa double tap, fail-closed khi không lưu được và không eviction yêu cầu chưa xác nhận. Bộ mobile mới đạt 120/120; APK x86_64 cài giữ đăng nhập, ca submit offline không báo thành công giả và restart không tự replay. Mất response sau commit chỉ đạt mô phỏng logic, chưa native/server thật; form chưa tự phục hồi payload. Xem [RECONCILIATION_DURABLE_REQUEST_TDD.md](RECONCILIATION_DURABLE_REQUEST_TDD.md).
- Đã bổ sung snapshot chỉ đọc và nút thử lại nguyên yêu cầu cũ, không cần nhập lại form; chặn nút stale tạo ID mới. APK mới đọc đúng entry từ bản trước qua update/force-stop và thử lại offline; 124/124 test mobile đạt, typecheck/lint 0 lỗi. Còn online retry sau server commit và đối chiếu adjustment thật. Xem [RECONCILIATION_RECOVERY_UI_TDD.md](RECONCILIATION_RECOVERY_UI_TDD.md).
- Xem bằng chứng và phạm vi chưa đạt tại [COMPLETION_ACCEPTANCE_20261018.md](COMPLETION_ACCEPTANCE_20261018.md). Các bước 2–6 không tự coi đã hoàn tất từ những ca này.

## 1. Chốt UI camera và lịch hóa đơn (ưu tiên P0)

- Dùng fixture hóa đơn thật/corpus công khai trên tài khoản test: chụp/chọn ảnh → OCR → sửa tổng tiền → xác nhận đính kèm → lưu → mở lại lịch đúng ngày → xem ảnh/chi tiết.
- Kiểm tra nhiều hóa đơn một ngày, ngày mua khác ngày tạo, tháng không có ảnh, URL ảnh hết hạn khi app mở lâu, mạng lỗi và đổi tài khoản.
- Rà tổng quan, danh sách và form trên 360/393 dp, font 100/150/200%; bảo đảm FAB không che ô lịch/nút lưu. Rà cursor khi sửa giữa chuỗi tiền đã phân nhóm, paste, xóa từng chữ số, số âm ở đối soát và số lớn.
- Kiểm tra camera bị từ chối quyền, mở Settings rồi quay lại, background/resume, hủy thư viện, đổi ảnh, xoay và bản nháp chưa lưu. Không đổi backend chỉ để chỉnh giao diện.
- Điều kiện đạt: ảnh/số tiền/ngày đúng sau restart, không có giao dịch hoặc ảnh trùng, không upload khi chưa xác nhận; checklist/screenshot từng ca. Camera, nhập tiền và ngày trống đã smoke-test; ảnh lịch đã đạt online/offline/restart cho fixture 01/05/2026, còn các nhánh mở rộng phía trên.

## 2. Offline và cách ly dữ liệu (P0)

- Hai tài khoản test A/B: online login, cache, offline edit, token hết hạn, reconnect, sign-out/sign-in và guest; không trộn cache/queue/ảnh.
- Dùng bản sao queue phiên bản cũ để thử migration JSON → encrypted SQLite, WAL/restart và lỗi thiếu dung lượng; tuyệt đối không thử phá dữ liệu tài khoản thật.
- Tạo ví offline → giao dịch phụ thuộc đã đạt trên Pixel 5: giữ ca regression, mở rộng nhiều mutation, timeout/mạng chập chờn và retry không nhân đôi.
- Cache ảnh receipt cloud đã có owner-scoping, mã hóa, giới hạn dung lượng và eviction; metadata/ảnh đã đạt offline/restart với fixture đã tải. Còn nghiệm thu đổi hai tài khoản/logout, nhiều ảnh vượt budget và URL hết hạn; không coi đây là kho offline đầy đủ mọi ảnh lịch sử.
- Điều kiện đạt: restart offline vẫn đọc đúng dữ liệu đã tải; reconnect chỉ replay một lần; lỗi authoritative không bị che thành thành công.

## 3. Tính đúng dữ liệu và luồng nâng cao (P0/P1)

- Seed >100 giao dịch trên tài khoản test: đối chiếu dashboard/ví/thống kê/lọc với API đầy đủ, gồm transfer/refund/split.
- Bulk archive: nhiều dòng thành công xen lỗi version/validation/network, retry chỉ dòng lỗi và giữ lựa chọn có ý nghĩa.
- Hai thiết bị sửa cùng giao dịch: conflict, sửa payload rồi retry, giữ bản server/cancel; chứng minh không mất thay đổi.
- Đối soát: mất response sau mutation thành công, retry cùng request ID, không tạo điều chỉnh thứ hai. Mutation thật đã đạt; ca timeout UI chưa đạt.
- Planning Android: split/refund/điều chuyển đã đạt từng bước; hoàn tất chốt tháng/chuyển dư trên tài khoản test cô lập, tháng sau đã chốt và thử sửa tháng đóng. Không dùng kỳ tài chính thật của người dùng.
- Review Inbox: chưa phân loại, nghi trùng và trạng thái review receipt; sửa xong phải cập nhật các màn liên quan.
- Điều kiện đạt: số dư/chi ròng/hạn mức/carry khớp fixture, các request và số bản ghi được đối chiếu sau từng ca.

## 4. Backup, media và nhắc việc (P1)

- Cần file `.picket` từ Flutter thật do người dùng cung cấp hoặc tạo bằng bản Flutter lịch sử trong môi trường riêng; fixture synthetic không thay thế bằng chứng này.
- Guest và cloud: xuất → Share Sheet → Document Picker → restore → xuất lại; ảnh receipt/kỷ vật, sai mật khẩu, file hỏng, file lớn, thiếu ảnh, lỗi giữa chừng và rollback.
- Media outbox airplane/force-stop/reconnect đã đạt một vòng: mở rộng sửa/xóa ảnh và hai thiết bị, đối chiếu đúng một bản ghi/ảnh.
- Guest alarm; cảnh báo ngân sách; đọc/ẩn thông báo và background refresh; Partner Notice gói Free/ngày hiệu lực/link HTTPS.
- Điều kiện đạt: phục hồi đủ dữ liệu/ảnh, không ghi đè snapshot tốt bằng bản lỗi; lịch native không trùng và được hủy khi tắt.

## 5. Thiết bị thật, quyền và thanh toán (phụ thuộc môi trường)

- Android ARM64 thật: camera/focus/torch, RAM thấp, sinh trắc học, khóa sau background/restart và khả năng hủy/mở lại.
- TalkBack spoken trên các màn có đăng nhập, thứ tự focus, sheet/dialog, lỗi form và font lớn; policy test không thay thế audit này.
- Expo admin với tài khoản staff test riêng: quyền non-staff, lọc/phân trang, audit và các thao tác có xác nhận.
- Google Play: cần Play Console/Internal testing, license tester, product IDs, service account và Pub/Sub; deploy verify/notification sau khi cấu hình đủ. Thử purchase/restore/renew/cancel/refund bằng sandbox, không mua gói thật để test.
- Điều kiện đạt: kết quả thiết bị/Play và audit tương ứng; thiếu đầu vào thì ghi dependency, không đánh dấu hoàn thành.

## 6. Nghiệm thu và phát hành

1. Mỗi increment: test RED/GREEN cho logic mới, mobile lint/typecheck/test; API test/analyze nếu có sửa API; web gates nếu có sửa web.
2. Chỉ build APK khi cần native/device acceptance; giữ một ARM64 và một x86_64 mới nhất cùng checksum. Commit/push không cần lưu CMake/Gradle intermediates.
3. Hoàn tất bảng bằng chứng route × online/offline × restart × font/TalkBack; cập nhật `FEATURE_PARITY.md` và `FLUTTER_EXPO_GAP.md`, tránh các bảng lịch sử phủ định bằng chứng mới hơn.
4. Release preflight, chữ ký và endpoint production; thử APK bằng cài cập nhật giữ dữ liệu, ghi rollback/cảnh báo tương thích dữ liệu. Chưa commit/push/deploy trong đợt dọn này.

Thứ tự thực hiện đề xuất: 1 → 2 → 3 → 4 → 5 → 6. Có thể chuẩn bị thiết bị thật/file Flutter/Play Console ngay khi làm bước 1 để tránh chờ ở cuối. Không ước lượng ngày hoàn tất khi các đầu vào ngoài chưa có.
