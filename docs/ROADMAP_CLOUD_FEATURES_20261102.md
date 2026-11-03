# Roadmap: học tập cloud và các phần mở rộng sản phẩm

Cập nhật **02/11/2026**. Đây là kế hoạch đề xuất cho các mục 14–15 trong [backlog](BACKLOG.md), chưa phải xác nhận triển khai mọi hạng mục. Không thay đổi production, dữ liệu người dùng, migration hay cấu hình phát hành trong bước lập kế hoạch này.

## 1. Mục tiêu và hiện trạng

Mục tiêu là đưa nội dung học đã biên tập lên cloud theo cách có kiểm duyệt và dùng được khi offline; sau đó mới thử nghiệm pilot. Các phần đồng bộ diện mạo túi, liên kết hóa đơn với món đồ, dự báo và chấm bài cloud có phụ thuộc sản phẩm/quyền riêng tư riêng, nên được chia thành các lát cắt độc lập.

Hiện trạng từ repository:

- Có 12 bài học VI/EN, 36 câu quiz mỗi ngôn ngữ và nội dung tự kiểm tra; nội dung đã được đối chiếu nguồn/số học nhưng chưa có review độc lập hoặc pilot. Cloud hiện chưa công bố bài nào.
- Mobile đã có outbox, đồng bộ tiến độ/hoạt động và gửi câu trả lời quiz. API kiểm đáp án qua `learning_answer_keys`; các answer key trong migration hiện chưa được publish. Cổng cloud content trong mobile vẫn khóa bằng `publicationGate` và feature flag.
- Consent và job infrastructure cho learning AI đã có; tạo job đang tắt nếu feature flag phía API không bật. Không đồng nghĩa cloud AI grading đã được duyệt hoặc sẵn sàng dùng.
- Theme, ngôn ngữ và color scheme có trường preference tài khoản. Hình/tông riêng của từng túi vẫn lưu trên thiết bị theo owner.
- Hóa đơn và dòng hàng đã có API/database. Món đồ/keepsake chưa có liên kết hóa đơn/dòng hàng như yêu cầu; ngày liên quan hiện nhập thủ công.
- Dự báo hiện chạy local theo lịch/các khoản đã nhập; đã có công cụ đánh giá 7/30 ngày nhưng chưa có bằng chứng đủ dữ liệu được phép dùng để công bố độ chính xác.
- Import lịch sử Flutter vẫn nằm ngoài MVP vì chưa có file export thật để xác định schema và nhu cầu.

## 2. Nguyên tắc kiến trúc và quyền riêng tư

1. Mobile và web dùng Supabase Auth để xác thực phiên; nghiệp vụ và dữ liệu domain đi qua Dart API. Không thêm nghiệp vụ tài chính trực tiếp vào client Supabase.
2. Bảng chứa dữ liệu người dùng phải có owner scope, RLS và kiểm tra quyền ở API. Nội dung chung chỉ được đọc theo trạng thái publish và answer key luôn kín. Request có thể retry cần idempotency; migration phải mở rộng tương thích ngược.
3. Nội dung học là dữ liệu biên tập công khai cho người dùng đã đăng nhập; answer key vẫn tách riêng và không được trả về trong API nội dung.
4. Dự báo không được trình bày như lời khuyên tài chính hoặc số tiền “có thể chi”. Thiếu dữ liệu phải hiện là thiếu/không đủ, không điền số 0.
5. Không gửi giao dịch, số dư, câu trả lời cá nhân hay dữ liệu tài chính lên AI mặc định. Cloud grading trả phí giữ tắt cho đến khi có quyết định sản phẩm, consent cụ thể và đánh giá bảo mật/quyền riêng tư.
6. Giữ local-first và hỗ trợ guest. Không yêu cầu kết nối mạng để đọc nội dung đã tải/cached, dùng giao diện hoặc giữ draft.
7. Không bật tính năng production chỉ vì test fixture hoặc build thành công. Rollout dùng feature flag, alpha trước, có đường tắt về local và rollback API/app.

## 3. Thứ tự triển khai đề xuất

| Thứ tự | Hạng mục | Ưu tiên | Ước lượng tương đối | Điều kiện bắt đầu |
| --- | --- | --- | --- | --- |
| 0 | Quyết định phạm vi, reviewer và tiêu chí pilot | Bắt buộc | S | Chủ dự án duyệt quyết định ở mục 10 |
| 1 | Công bố nội dung học VI/EN lên cloud | Cao | M | Review độc lập hoàn tất; answer key/content version được đối chiếu |
| 2 | Pilot nội dung học với người tham gia tự nguyện | Cao sau bước 1 | S kỹ thuật + thời gian quan sát | Cloud release đã ở closed alpha, consent pilot rõ ràng |
| 3 | Đồng bộ diện mạo từng túi giữa các thiết bị | Trung bình | M | Chốt chính sách guest, xung đột và xoá tài khoản |
| 4 | Liên kết dòng hóa đơn với món đồ; ngày hạn thủ công | Trung bình | L | Chốt định nghĩa món đồ, quan hệ số lượng và loại ngày |
| 5 | Dự báo dòng tiền có đánh giá dữ liệu thực | Thấp, thử nghiệm trước | L | Có dữ liệu quan sát được phép dùng và ngưỡng đánh giá được duyệt |
| 6 | Chấm bài cloud trả phí | Hoãn, quyết định lại | XL | Duyệt giá, entitlement, consent, dữ liệu gửi và chi phí provider |
| 7 | Import lịch sử Flutter | Ngoài MVP, chưa mở | L, chưa ước lượng chính xác | Có file export thật và nhu cầu cụ thể |

Không ấn định ngày lịch ở bước này. Những hạng mục phụ thuộc review, người pilot, dữ liệu quan sát hoặc quyền dịch vụ cần thời gian ngoài công việc code.

## 4. Hạng mục 1 — Công bố nội dung học cloud VI/EN

### Phạm vi phiên bản đầu

- Phát hành 12 bài VI/EN hiện có, giữ nguyên ID lesson, phiên bản quiz và lịch sử tiến độ.
- Cho phép đọc nội dung sau khi tải; đồng bộ tiến độ/attempt qua API hiện có.
- Không thêm chấm câu tự luận bằng AI, không yêu cầu mua gói, không gửi dữ liệu tài chính cá nhân.
- Nội dung mới hoặc sửa đáp án phải tạo version mới; không sửa ngầm nội dung/answer key của attempt cũ.

### Các lát cắt

1. **Review nội dung:** reviewer độc lập kiểm tra từng locale về độ đúng nguồn, số học, ngôn ngữ, lời giải, tránh lời khuyên tuyệt đối và tính phù hợp với người trưởng thành. Ghi reviewer, ngày review, version và kết quả; mọi thay đổi cần được chủ nội dung duyệt.
2. **Đóng băng content pack:** tạo manifest có `schemaVersion`, `contentVersion`, locale, danh sách lesson ID, checksum, nguồn, trạng thái review và tương quan answer key. Kiểm tự động rằng VI/EN có cùng lesson/quiz identity và không lệch đáp án.
3. **Công bố server-side:** thêm kho release bất biến cho nội dung đã duyệt và endpoint Dart API chỉ trả nội dung `published`. Dùng migration seed/release có review qua Git; chưa cần CMS chỉnh sửa trực tiếp trong MVP. API không trả `correctIndex`/answer key.
4. **Publish answer key:** chỉ sau khi review và kiểm tra manifest, publish đúng rows trong `learning_answer_keys`; giữ bảng private và chỉ chấm qua RPC/API hiện có. Giữ phiên bản cũ để replay/idempotency và tiến độ cũ hoạt động.
5. **Client fetch/cache:** thêm client có ETag/version hoặc checksum, timeout và retry; cache bản hợp lệ theo locale/version. Guest có thể tiếp tục dùng pack local; lỗi mạng giữ cache/local, không xóa tiến độ.
6. **Mở feature flag:** mặc định tắt; bật trước cho internal/closed alpha. Theo dõi lỗi tải pack, lỗi version, attempt replay và đồng bộ; không log câu trả lời thô hoặc dữ liệu tài chính.

### API/schema dự kiến

- `GET /v1/learning/content?locale=vi|en` trả manifest và release hiện hành; có thể tải lesson theo pack hoặc theo ID nếu kích thước cần phân trang.
- Bảng release/lesson chỉ giữ payload đã duyệt, trạng thái, locale, version, checksum và metadata review. RLS chỉ đọc nội dung đã publish theo chính sách; ghi qua API/deployment có kiểm soát.
- `learning_answer_keys` tiếp tục tách biệt, không cấp quyền select cho client. `submitLearningAttempt` vẫn là đường duy nhất cấp XP; khóa idempotency và kiểm đáp án ở server được giữ nguyên.
- Khi xóa tài khoản, progress/attempt/activity tiếp tục được xóa theo quan hệ owner hiện có; content chung không bị xóa.

### Tiêu chí nghiệm thu

- Reviewer độc lập ký duyệt đủ 12 bài ở VI/EN; toàn bộ nguồn và 60 phép kiểm số học đạt.
- Test xác nhận API chỉ trả bài đã publish, không rò answer key; draft/unreviewed/version không hợp lệ bị từ chối.
- Mọi lesson ID/quiz version khớp giữa client, manifest và server; attempt gửi lặp không cấp XP lần hai.
- Người dùng có thể đọc offline, đăng nhập rồi đồng bộ; chuyển account không làm lẫn cache hoặc tiến độ.
- Feature flag tắt khôi phục hành vi local hiện có; rollout alpha không yêu cầu update nóng để đọc pack đã cache.

## 5. Hạng mục 2 — Pilot người học thật

### Thiết kế pilot đề xuất

- Mời **8–12 người trưởng thành tự nguyện** trong closed alpha trong khoảng **2 tuần**; đây là quy mô thử usability, không phải nghiên cứu chứng minh hiệu quả giáo dục.
- Người tham gia được thông báo mục đích, dữ liệu ghi nhận, thời hạn lưu và cách rút khỏi pilot. Có thể bỏ qua bài/hoạt động; không yêu cầu mua hàng, vay tiền, cung cấp OTP hoặc kết nối AI.
- Dùng bài học và quiz chuẩn VI/EN; thu phản hồi về dễ hiểu, lỗi nội dung, thời gian, lỗi offline và khả năng tìm lại bài. Không yêu cầu chia sẻ số dư/giao dịch cá nhân.
- Chỉ tổng hợp event tối thiểu (lesson start/finish, version, lỗi đồng bộ, số câu đúng) theo cohort; không đưa answer text tự do vào analytics.

### Đầu ra và cổng hoàn tất

- Báo cáo lỗi theo lesson/locale, tỉ lệ hoàn thành theo cohort, lỗi tải/đồng bộ, chủ đề gây hiểu nhầm và phản hồi tự nguyện.
- Không tuyên bố cải thiện kiến thức/tài chính từ mẫu nhỏ. Nếu muốn tuyên bố hiệu quả, thiết kế nghiên cứu riêng và có phê duyệt phù hợp.
- Đề xuất ngưỡng kỹ thuật pilot để chủ dự án duyệt: không mất tiến độ đã xác nhận, replay không nhân XP, không có rò dữ liệu chéo user, và không có lỗi chặn đọc bài/quiz trong các luồng cốt lõi.
- Kết thúc pilot bằng một quyết định: sửa nội dung, tiếp tục pilot, publish rộng hoặc tắt cloud content. Giữ local pack làm phương án dự phòng.

## 6. Hạng mục 3 — Đồng bộ diện mạo túi giữa thiết bị

### Phạm vi

- Đồng bộ `assetId` và `tone` của từng pocket đã có; theme/language/color scheme tài khoản đã có cơ sở preference riêng.
- Không tải asset ảnh từ người dùng lên cloud; chỉ đồng bộ ID trong danh sách asset được app hỗ trợ.
- Guest giữ cài đặt local. Khi guest đăng nhập, hỏi có nhập tùy chỉnh local vào account hay giữ bản cloud; không ghi đè âm thầm.

### Lát cắt và xung đột

1. Chốt schema version và allowlist asset/tone ở client + API; ID không hợp lệ dùng fallback mặc định.
2. Thêm document/bảng per-owner với revision và cập nhật có điều kiện; API Dart kiểm tra owner và pocket tồn tại.
3. Thêm outbox local: edit offline vẫn áp dụng ngay; khi online gửi delta theo pocket, không replace toàn bộ document.
4. Khi hai thiết bị đổi **cùng pocket** từ cùng revision, trả conflict kèm bản server; cho người dùng giữ bản server hoặc áp lại lựa chọn local. Các pocket khác nhau merge độc lập.
5. Tải cấu hình khi login/foreground; khi logout hoặc đổi owner phải clear state/cache trước khi hiển thị dữ liệu account tiếp theo.

### Tiêu chí nghiệm thu

- Cùng account đổi diện mạo trên thiết bị A, thiết bị B nhận được sau sync; đổi offline rồi online không mất lựa chọn.
- Không rò cài đặt giữa hai owner; account deletion xóa bản cloud; pocket đã xóa không làm client crash.
- Conflict cùng pocket có trạng thái xử lý rõ; dữ liệu cũ/ID asset chưa còn hỗ trợ vẫn fallback an toàn.
- Test backup/restore và account switch; chỉ tạo migration additive, rollback app không làm mất dữ liệu tài chính.

## 7. Hạng mục 4 — Liên kết hóa đơn, dòng hàng và món đồ

### Quyết định mô hình trước khi code

- Xác định “món đồ” là vật sở hữu/keepsake hay hàng tiêu dùng có hạn sử dụng. Không gộp ngày hết hạn thực phẩm với bảo hành/nhắc bảo trì thiết bị.
- Một dòng hóa đơn có thể đại diện nhiều món; cần chốt có tạo một item theo quantity, một nhóm item hay chỉ lưu tham chiếu và quantity.
- Bản đầu nên **liên kết do người dùng xác nhận**; không tự suy rằng mọi dòng OCR là món đồ cần quản lý.

### Lát cắt

1. Cho chọn dòng hàng đã review từ hóa đơn và liên kết món đồ đang có hoặc tạo món đồ mới.
2. Bản đầu nhập ngày hạn thủ công, loại ngày được đặt tên rõ (ví dụ best-before/expiry hoặc warranty — chỉ chọn loại phù hợp miền dữ liệu đã chốt).
3. Lưu liên kết optional theo owner và receipt line; giữ dữ liệu giá trị của hóa đơn độc lập. Unlink item không xóa hóa đơn/giao dịch; archive hóa đơn không xóa món đồ.
4. Đồng bộ API/mobile với revision/conflict, owner isolation và validation quantity/date. Tránh nhân đôi khi người dùng bấm lại sau timeout.
5. Chỉ xem OCR ngày trên bao bì ở giai đoạn sau: cần ảnh nhãn riêng, confidence, cho người dùng xác nhận và cho phép sửa; không suy ngày hạn từ hóa đơn nếu không có bằng chứng đọc được.
6. Reminder là lát cắt sau: cần chọn thời điểm nhắc, timezone, quyền notification, xử lý item đổi/xóa và lịch nhắc trùng.

### Tiêu chí nghiệm thu

- Người dùng có thể tạo/link/unlink/đổi món đồ và ngày; thao tác lặp không sinh duplicate.
- Date boundary/timezone, locale, item nhiều quantity, receipt archived/deleted, conflict và offline được kiểm thử.
- Sai owner bị từ chối tại API/DB; không sửa tổng tiền/giao dịch chỉ vì tạo hoặc sửa món đồ.
- Không bật nhận diện ngày tự động hoặc reminder cho tới khi UX, nhãn ngày và hành vi xóa/đổi ngày được duyệt.

## 8. Hạng mục 5 — Dự báo dòng tiền

### Phạm vi theo từng cấp

1. **F0 — kịch bản lịch rõ ràng:** giữ local; dựa trên số dư mở đầu và lịch đã nhập, gắn nhãn “kịch bản theo dữ liệu hiện có”, cho phép so sánh nếu mua một khoản. Hiện đã có phép tính và lưu quan sát local.
2. **F1 — chi biến thiên:** chỉ thử khi có đủ lịch sử hợp lệ; tạo baseline rõ, thể hiện độ phủ dữ liệu và nguồn; thiếu ngày/danh mục không được coi là chi bằng 0.
3. **Đánh giá offline:** dùng snapshots có quyền dùng, freeze thời điểm input, tách development/validation/holdout theo user và scenario, không leakage giữa các cửa sổ. So 7/30 ngày với baseline và đo MAE, ngày âm bị bỏ sót, báo âm giả, sai ngày đáy.
4. **Pilot hiển thị:** chỉ khi kết quả validation/holdout đạt ngưỡng được chủ dự án duyệt; người dùng thấy phạm vi, giả định và cảnh báo dữ liệu thiếu. Không ghi dự báo vào ledger và không cho hiểu là số dư chắc chắn/có thể chi.
5. **Cloud (nếu thật sự cần):** đánh giá riêng về lợi ích so với local. Mặc định không upload giao dịch/số dư; nếu cần xử lý server, phải có opt-in riêng, retention/deletion, API access controls và chính sách dữ liệu.

### Tiêu chí nghiệm thu

- Dataset có nguồn/consent, cutoff, completeness, currency và quy tắc loại trừ được review.
- Backtest báo metrics theo horizon/cohort/currency và baseline, không tự động promote mô hình.
- Không có missing truth bị điền 0; không có train/test leakage theo user/family/scenario.
- UI nêu rõ giả định, độ phủ và giới hạn; kiểm tra accessibility, tiền tệ, ngày, số dư âm và dữ liệu lớn.
- Chưa có data đủ hoặc chưa đạt ngưỡng: tiếp tục giữ F0/local, không phát ngôn độ chính xác.

## 9. Hạng mục 6–7 — Cloud grading trả phí và import Flutter

### Cloud grading trả phí — giữ ngoài MVP đến khi duyệt

1. Viết proposal riêng xác định giá trị hơn quiz cố định, người dùng mục tiêu, giá/gói/quota, giới hạn provider và chi phí mỗi lượt.
2. Chọn dữ liệu tối thiểu cần gửi. Mặc định không gửi số dư, giao dịch, merchant hay câu trả lời tự do có thông tin cá nhân. Không tự bật cho người dùng hiện tại.
3. Thiết kế consent trước lần đầu, giải thích provider/retention, thu hồi consent, xóa lịch sử, rate limit, idempotency, abuse controls và audit không chứa payload.
4. Dùng entitlement server-side, không tin cờ premium từ client; kiểm thử race, quota, retry/refund/restore và xóa account.
5. Rubric giáo dục phải tránh tư vấn đầu tư/vay cá nhân; có fallback quiz tĩnh và review của người thật. Chỉ phát hành sau privacy/security review và duyệt chi phí.

Hạ tầng consent/job đã tồn tại có thể tái sử dụng sau khi đánh giá, nhưng không được xem là phê duyệt tính năng hoặc lý do bật provider.

### Import lịch sử Flutter — chưa khởi động

- Chỉ mở việc khi chủ dự án cung cấp file export thật và xác nhận muốn import.
- Trước tiên đọc cấu trúc/phiên bản, thống kê loại record và file đính kèm mà không ghi dữ liệu vào account.
- Viết parser offline, preview mapping/count/errors, cảnh báo record trùng và cho người dùng xác nhận; không merge hoặc xóa âm thầm.
- Import qua Dart API với owner isolation, idempotency key, giới hạn file, resume/rollback theo batch và nhật ký kết quả không lộ nội dung tài chính.
- Kiểm thử file hỏng, schema cũ/mới, timezone, currency, duplicate, retry, account switch và restore trước khi mở alpha.

## 10. Quyết định cần chủ dự án duyệt trước khi triển khai

1. Cho phép bước review độc lập và công bố 12 bài học VI/EN; phiên bản đầu miễn phí hay cần entitlement.
2. Chọn reviewer, thời hạn lưu attempt/progress và quy mô pilot. Đề xuất 8–12 người trưởng thành/2 tuần chỉ là khởi điểm để duyệt.
3. Khi chuyển guest sang account, mặc định hỏi merge diện mạo túi; xác nhận hành vi conflict cùng một pocket.
4. Chốt định nghĩa item và loại ngày cần quản lý trước khi thiết kế migration liên kết receipt.
5. Dự báo giữ local-only trong MVP hay muốn có cloud; nếu muốn công bố chất lượng cần duyệt dataset và ngưỡng backtest trước.
6. Cloud grading có còn là mục tiêu không; nếu có, cần duyệt giá, quota, provider, consent và dữ liệu được phép rời thiết bị.
7. Import Flutter chỉ tiếp tục khi có file export thật và yêu cầu cụ thể.

## 11. Definition of Done dùng chung

- Mỗi tính năng có user story, non-goals, acceptance criteria và quyết định quyền riêng tư được ghi trong ticket/PR.
- Domain logic ở Dart API; migration có RLS, test policy/owner isolation và hướng rollback/forward-fix.
- TypeScript API client được cập nhật; mobile/web dùng typed contract và feature flag mặc định tắt khi rollout chưa duyệt.
- Có unit + API/database tests cho thành công, validation, retry/idempotency, conflict, offline, owner switch và deletion.
- Có QA UI laptop/tablet/phone khi ảnh hưởng web; thiết bị ARM64 thật khi ảnh hưởng camera, notification, sync nền hoặc biometric.
- Có log/metrics tối thiểu không chứa secrets, OCR raw text, giao dịch hay answer payload; có cách tắt feature và giữ dữ liệu hiện có.
- Docs trạng thái, release notes, migration và giới hạn được cập nhật sau khi có bằng chứng; không ghi PASS theo suy luận.

## Tài liệu và hiện trạng liên quan

- [Backlog hiện hành](BACKLOG.md)
- [Trạng thái dự án](PROJECT_STATUS.md)
- [Giáo trình và cổng công bố](learning/README.md)
- [Hồ sơ biên tập/review](learning/CONTENT_PACK_EDITORIAL_20261027.md)
- [Kiến trúc hệ thống](ARCHITECTURE.md)
- [Thiết kế Picket](../PICKET-DESIGN.md)
