# Kế hoạch hệ thống quản trị Picket

Ngày: 28/10/2026. Kế hoạch đã được chấp thuận triển khai. Admin/API/web/worker và 51 migration đã đưa lên production; layout đã chỉnh lại theo góp ý sidebar/card/filter ngày 28/10. [Báo cáo nghiệm thu](migration/ADMIN_PLATFORM_ACCEPTANCE_20261028.md) là nguồn trạng thái hiện hành. Những mục “đề xuất/chưa triển khai” trong baseline dưới đây ghi yêu cầu ban đầu, không thay báo cáo hiện hành.

## 1. Phạm vi đã chốt

- Admin chỉ có giao diện web tại `app.picketfinance.com/admin`; không xây app admin mobile.
- Tài khoản có quyền quản trị không được sử dụng mobile, kể cả Google login, email/password, callback và phiên lưu từ trước. Người quản trị muốn dùng sản phẩm phải có tài khoản người dùng riêng.
- Nâng cấp admin hiện có, giữ Next.js, Dart Frog API và hạ tầng đang sử dụng.
- Theo dõi người dùng, sức khỏe hệ thống, hoạt động sản phẩm, landing, APK, Google Play, gói thanh toán và OCR.
- Bổ sung chuẩn hóa đăng ký, xác minh email, xử lý tài khoản trùng và quên mật khẩu trên web/mobile.
- Thiết kế lại UI/UX web chỉ cho `/login`, `/register`, `/forgot-password` theo landing Picket và bố cục tham khảo người dùng gửi. Không mở rộng sang toàn bộ giao diện web; phạm vi đã được chủ dự án chấp thuận triển khai.
- Không tự động publish Google Play, thay giá, hoàn tiền hoặc triển khai production chỉ từ thao tác xem dashboard.

## 2. Hiện trạng đã kiểm tra trong source

| Thành phần | Có sẵn | Cần bổ sung |
| --- | --- | --- |
| Admin web | Tổng quan, danh sách người dùng, khóa/mở, reset mật khẩu, cấp gói, settings, OCR, audit, đối tác | Điều hướng và dashboard đầy đủ, phân quyền chi tiết, tìm kiếm/lọc, trang chi tiết |
| Dart API | `GET /v1/admin/overview`, thao tác người dùng | API theo từng module; giới hạn truy vấn; xuất báo cáo; dữ liệu đo lường |
| Kiến trúc | Layout yêu cầu phiên admin; một số màn dùng API | OCR/đối tác còn Supabase RPC trực tiếp; gateway thao tác admin còn gọi Edge Function legacy |
| Landing | File tĩnh, liên kết tải APK, metadata phiên bản | Chưa thấy instrumentation truy cập/tải trong trang; Caddyfile chưa cấu hình access log cho thống kê |
| Auth | Web/mobile gọi Supabase Auth signUp/resetPasswordForEmail | Kiểm chứng cấu hình production và trường hợp email trùng, chưa xác minh, Google-only, email không tồn tại |

Đây là rà soát source, không phải khẳng định mọi quyền và cấu hình Auth production đã được nghiệm thu.

## 3. Các module và màn hình

| Module | Nội dung và thao tác |
| --- | --- |
| Tổng quan | Người dùng mới, DAU/WAU/MAU, landing sessions, APK, Play installs, thuê bao trả phí, OCR, cảnh báo; drill-down theo kỳ |
| Người dùng | Tìm email/ID; lọc trạng thái, ngày đăng ký, gói; chi tiết phiên bản, lần hoạt động gần nhất, quyền, quota, lịch sử hỗ trợ |
| Quản trị tài khoản | Khóa/mở kèm lý do, gửi reset, thu hồi phiên theo khả năng nền tảng; yêu cầu xóa tài khoản có tiến trình và audit |
| Truy cập & tải ứng dụng | Landing pageviews/sessions, nguồn/UTM, CTA, APK theo phiên bản, Google Play acquisitions; chất lượng và độ trễ dữ liệu |
| Hoạt động sản phẩm | Người dùng hoạt động, first-open quan sát được, funnel đăng ký → xác minh → sử dụng; retention D1/D7/D30 |
| Gói & thanh toán | Free/Plus/Pro; trạng thái, hạn, nguồn quyền Play/thủ công; gia hạn, grace, hold, revoke; lỗi xác minh/RTDN |
| OCR & đồng bộ | Số yêu cầu, thành công/thất bại, latency, quota từ chối, lỗi đồng bộ và phiên bản; không đọc nội dung hóa đơn |
| Vận hành | API/web/landing/OCR, database, storage, SMTP, worker, dung lượng đĩa, backup, job thất bại, uptime và lịch sử sự cố |
| Phiên bản | Phiên bản APK/Play, SHA-256, size, link tải, ngày phát hành, phân bố client version; cấu hình khuyến nghị cập nhật |
| Nội dung | Bài học VI/EN, preview, draft/review/publish, thông báo hệ thống, đối tác và thời gian chiến dịch |
| Hỗ trợ | Ticket, phân loại, mức ưu tiên, người xử lý, ghi chú nội bộ, liên kết user/sự cố và lịch sử giải quyết |
| Báo cáo | CSV có giới hạn, job nền cho báo cáo lớn, lịch sử export, quyền tải và hạn link |
| Quyền & audit | Nhân sự, vai trò, MFA, phiên quản trị; audit trước/sau đã che dữ liệu nhạy cảm |
| Cấu hình | Bảo trì, thông báo, ngưỡng cảnh báo, retention, tình trạng integration; không hiển thị secret |

Không cho admin tự sửa số dư/giao dịch riêng tư của người dùng. Nếu cần hỗ trợ dữ liệu, phải thiết kế quyền và sự đồng ý riêng, ngoài mặc định của kế hoạch này.

## 4. Định nghĩa chỉ số và nguồn dữ liệu

| Chỉ số | Định nghĩa / nguồn | Giới hạn phải hiển thị |
| --- | --- | --- |
| Landing pageviews | Event trang hiển thị hợp lệ; bỏ bot đã nhận diện, health probe và traffic QA | Có thể thiếu vì trình duyệt chặn hoặc không đồng ý đo lường |
| Landing sessions | Session first-party hết hạn sau 30 phút không hoạt động; không fingerprint | Session không đồng nghĩa một người duy nhất |
| APK click | Event bấm CTA tải, theo vị trí nút và release | Không đồng nghĩa tải thành công |
| APK served | Access log GET thành công; tách 200/206, bỏ HEAD/bot; nhóm request resume theo cửa sổ có công bố | Chỉ là lượt phục vụ/tải ước tính; không chứng minh file đã lưu đủ hoặc cài thành công |
| Google Play installs | Nhập báo cáo thống kê Google Play theo metric gốc: install events/new users/new devices | Không đổi tên các metric thành cùng một số; có độ trễ và có thể điều chỉnh lịch sử |
| Mobile first-open | Event lần mở đầu của installation ID ngẫu nhiên; source installer nếu xác định được | Không phải install chính thức, không bao phủ bản app cũ và có thể đếm lại sau cài lại |
| Người dùng mới | Tài khoản tạo trong kỳ; tách chưa xác minh và đã xác minh | Tách tài khoản QA/staff, không cộng install vào user |
| DAU/WAU/MAU | User ID khác nhau có hành động có ý nghĩa trong ngày/7 ngày/30 ngày | Chỉ quan sát app có telemetry; không suy từ số phiên đăng nhập |
| Paid subscribers | User có entitlement Play đang còn hiệu lực; tách quyền thủ công và test | Không coi tài khoản được tặng gói là doanh thu |
| Doanh thu | Báo cáo sales/earnings chính thức, refunds và tiền tệ tách biệt | Sales ước tính không phải tiền thực nhận; không suy doanh thu từ giá SKU × số gói |
| OCR | Sự kiện xử lý backend, latency p50/p95, success/error và quota denial riêng | Không tính quota denial thành lỗi engine |
| Sức khỏe | Probe chủ động + số liệu server đã xác thực + log đã redaction | Readiness không đồng nghĩa toàn bộ hệ thống hoạt động tốt |

Quy tắc chung:

- Không cộng APK served với Play installs thành tổng số người cài.
- Không dựng dữ liệu quá khứ khi trước đây chưa đo; hiển thị ngày bắt đầu theo dõi.
- Mọi biểu đồ có nguồn, timezone, thời điểm đồng bộ cuối, trạng thái thiếu/stale và bộ lọc môi trường.
- Nội bộ lưu timestamp UTC; dashboard hoạt động mặc định Asia/Ho_Chi_Minh. Báo cáo Play giữ ngày/timezone do nguồn định nghĩa; không gộp lệch kỳ.
- Play CSV lấy từ private Cloud Storage bucket của developer account; xác minh quyền và schema thật trước khi viết connector. Job hằng ngày có retry/backfill vì dữ liệu có thể trễ 3–7 ngày.
- Play Developer Reporting API dùng cho Android vitals (crash/ANR), không thay thế nguồn báo cáo installs.

## 5. Kiến trúc đề xuất

```text
Admin Next.js → Dart API /v1/admin/* → dữ liệu tổng hợp / nghiệp vụ / audit
Landing events → collector có rate limit → hàng đợi/batch → tổng hợp theo ngày
Caddy download logs → worker riêng → thống kê APK ước tính
Mobile telemetry → collector → tổng hợp sử dụng, không chứa dữ liệu tài chính
Play CSV / Reporting API → scheduled import → snapshot + trạng thái đồng bộ
Health probes / service metrics → collector vận hành → sự cố + cảnh báo
```

- Client chỉ dùng Supabase SDK cho Auth; không đưa service-role hoặc credential Google vào trình duyệt.
- Tách trang tổng quan khỏi truy vấn danh sách người dùng; API dashboard chỉ trả aggregates có giới hạn thời gian/dimensions.
- Job import độc lập với request UI; idempotency theo source/object generation/checksum và kỳ báo cáo, hỗ trợ cập nhật lại CSV cùng tên.
- Landing hiện có CSP chỉ script self và chưa có connect-src: ưu tiên collector cùng origin; cập nhật route/CSP tối thiểu, không mở wildcard.
- Bắt đầu với worker định kỳ và dữ liệu tổng hợp trên hạ tầng sẵn có; chọn thư viện biểu đồ/monitoring sau bước đánh giá dependency, không triển khai hệ BI riêng ngay.
- Thiết kế nhóm dữ liệu logical: event, daily metric, import run, health sample, incident, staff permission, support ticket, audit. Schema/migration cụ thể là deliverable giai đoạn triển khai sau khi đọc quy tắc database.
- Dự kiến API: overview, users/detail/actions, acquisition, engagement, subscriptions, ocr, health, releases, incidents, tickets, audit, integrations/status, exports. Định nghĩa OpenAPI và quyền trước triển khai.

## 6. Phân quyền và kiểm soát truy cập

| Vai trò đề xuất | Phạm vi |
| --- | --- |
| Owner | Quản lý nhân sự, quyền và cấu hình nhạy cảm |
| Operations admin | Vận hành, phiên bản, sự cố, cấu hình được cấp |
| Support | Tra cứu tài khoản tối thiểu, ticket, reset/khóa theo quyền; không cấp quyền nhân sự |
| Analyst | Chỉ đọc số liệu tổng hợp, không mặc định xem email hoặc export dữ liệu cá nhân |
| Content editor | Nội dung/chiến dịch; không tài khoản/thanh toán |

- Mặc định từ chối; kiểm tra quyền ở server cho từng endpoint và export, không chỉ ẩn menu.
- MFA cho nhân sự quản trị, xác thực lại trước thay quyền, export cá nhân, bảo trì và cấp quyền gói.
- Mọi mutation có lý do, xác nhận, chống submit lặp, audit actor/target/request ID/kết quả; audit không bị sửa qua UI.
- Tách nguồn entitlement thủ công với Play; cấp gói hỗ trợ không ghi đè subscription Google.
- Thay quyền có hiệu lực với phiên đang hoạt động; cơ chế chống tự xóa/khóa owner cuối cùng và đường phục hồi có audit.
- Không cho frontend tự gán role; không đưa token, mật khẩu, ảnh hóa đơn, ghi chú giao dịch vào log/analytics.

### Chặn tài khoản quản trị trên mobile

1. Sau email/Google callback và lúc restore phiên, lấy policy từ API trước tải dữ liệu người dùng.
2. Nếu có quyền quản trị: không vào màn chính, xóa cache/session local, hiện hướng dẫn truy cập admin web.
3. API nghiệp vụ mobile cũng kiểm tra policy; không tin client header để xác định app. Session credential Supabase riêng không tự được coi là quyền dùng tính năng mobile.
4. Tái kiểm tra khi foreground/refresh và khi quyền thay đổi; không giữ cache tài chính đã tải từ phiên cũ.
5. Nghiệm thu email login, Google login, callback, cold start, đổi role khi đang mở app; user thường vẫn sử dụng bình thường.

Giới hạn cần ghi nhận: Auth dùng chung có thể vẫn tạo credential ở bước Google/email trước kiểm tra role. Cam kết sản phẩm là admin không có phiên sử dụng mobile và không truy cập dữ liệu từ mobile; không tuyên bố IdP không bao giờ phát token. Nếu yêu cầu tách tuyệt đối credential theo kênh, cần thiết kế realm/session admin riêng và đánh giá ảnh hưởng web người dùng.

## 7. Đăng ký, xác minh và quên mật khẩu

Yêu cầu bổ sung ngày 28/10: xử lý email đã tồn tại và yêu cầu reset email chưa đăng ký.

- Kiểm tra cú pháp và chuẩn hóa khoảng trắng/case theo quy tắc Auth; không tự loại dấu chấm hoặc phần `+tag` của Gmail.
- Email có cú pháp hợp lệ chưa chứng minh hộp thư tồn tại hay thuộc người đăng ký. Dùng liên kết xác minh email; không dò SMTP hoặc Google để xác định địa chỉ tồn tại.
- Không tạo tài khoản trùng qua đăng ký lặp hoặc concurrent request; Auth là nguồn định danh duy nhất. Không thêm endpoint public `email-exists`.
- Kiểm thử Supabase signUp với email đã tồn tại vì phản hồi chống dò tài khoản có thể không phải lỗi rõ ràng; không dùng riêng `error === null` để kết luận tài khoản vừa được tạo.
- Đăng ký thành công chuyển sang trạng thái chờ xác minh; gửi lại có cooldown/rate limit. Tài khoản chưa xác minh không được vào dữ liệu sản phẩm.
- Email trùng: giữ tài khoản cũ và hướng dẫn đăng nhập/quên mật khẩu trong thông báo không tiết lộ danh sách người dùng. Admin/support được tra cứu sự tồn tại qua endpoint có quyền và audit.
- Quên mật khẩu: kiểm tra điều kiện ở trusted server/Auth; chỉ gửi khi tài khoản đủ điều kiện, không tạo user mới. UI công khai: “Nếu email đã được đăng ký, bạn sẽ nhận được hướng dẫn khôi phục.” Không trả cờ tồn tại qua status/body/timing dễ phân biệt.
- Xử lý Google-only bằng hướng dẫn phù hợp và quy tắc liên kết identity rõ ràng; không tự liên kết tài khoản chỉ dựa vào email chưa được xác minh.
- Token xác minh/reset phải hết hạn, dùng đúng mục đích, không tái sử dụng; redirect allowlist tách web/mobile; trang reset không nhận role từ query.
- Sau reset mật khẩu: chính sách thu hồi phiên và đăng nhập lại được kiểm thử, không chỉ hiển thị “đổi thành công”.
- Rate limit theo tài khoản/IP, chống spam email; redaction log và đo kết quả gửi mail không chứa token.
- Checklist: email mới/trùng/khác hoa thường/sai cú pháp/không tồn tại/chưa xác minh/Google-only/admin; token hết hạn/dùng lại; gửi liên tục; mất mạng; callback web/mobile.

## 8. UX của hậu đài

- Dùng duy nhất `PICKET-DESIGN.md`, phong cách Paper/flat hiện có; không tạo một design system MD khác.
- Sidebar nhóm Tổng quan, Người dùng, Tăng trưởng, Kinh doanh, Vận hành, Nội dung, Hệ thống; breadcrumb và thanh lọc kỳ dùng chung.
- Tổng quan: tối đa 6 KPI chính, biểu đồ tăng trưởng, funnel acquisition, health strip và sự cố cần xử lý; không nhồi mọi metric vào một màn.
- Mỗi KPI có định nghĩa, chênh lệch kỳ so sánh và link tới báo cáo; kỳ chưa đủ dữ liệu không hiện phần trăm tăng trưởng giả.
- Bảng có search, filter, sort allowlist, pagination, trạng thái lọc trong URL; trang chi tiết dùng tab và timeline.
- Có loading, empty, partial/stale, lỗi nguồn, không đủ quyền và retry từng khối; nguồn Play lỗi không làm trắng toàn dashboard.
- Không dùng màu làm tín hiệu duy nhất. Bàn phím, focus, contrast, zoom 200%, desktop/tablet và web màn hẹp phải kiểm tra.

## 9. Lộ trình triển khai theo lát cắt

### 9.1. Bổ sung: thiết kế ba trang xác thực web

**Mục tiêu:** chuyển từ form đơn lẻ giữa trang sang trải nghiệm có nhận diện Picket, nội dung giới thiệu vừa đủ và điều hướng rõ ràng giữa landing và xác thực.

**Đọc ảnh tham khảo:** ba ảnh Picket thể hiện hiện trạng form giữa nền trống; ảnh CraftVision3D tham khảo cách chia vùng giới thiệu bên trái và form bên phải, thương hiệu ở đầu trang và thông tin phụ ở cuối. Chỉ tham khảo phân cấp/bố cục; không sao chép nền vũ trụ, hiệu ứng kính, màu hồng hay nội dung của sản phẩm khác. Ảnh login Picket có liên kết về trang giới thiệu nhưng nằm cuối form, chưa đủ nổi bật; cần đưa đường về landing ra vị trí nhất quán trên cả ba trang và kiểm tra đúng đích.

**Phạm vi:** `/login`, `/register`, `/forgot-password` và component/CSS dùng riêng cho ba trang này. Không thay dashboard người dùng, toàn bộ web, mobile hoặc thiết kế landing trong hạng mục này. Verify-email/reset-password giữ nguyên bố cục ở lần triển khai này; vẫn phải kiểm thử luồng liên kết đi qua chúng để không gây đứt trải nghiệm.

#### Khung bố cục chung

- Desktop: header gọn có logo Picket bên trái và liên kết “Về trang chủ” dễ thấy; bên dưới là hai cột khoảng 55/45 trong khung có chiều rộng tối đa. Bên trái là thông điệp cùng minh họa Paper, bên phải là form rộng khoảng 400–460px, không kéo giãn input theo màn hình lớn.
- Logo và “Về trang chủ” đều trỏ trực tiếp `https://picketfinance.com/` trong cùng tab. Không dùng `history.back()` vì người dùng có thể mở link xác thực trực tiếp hoặc đến từ email; không trỏ về `/` của app rồi tạo vòng redirect.
- Tablet/màn hẹp: chuyển thành một cột theo sức chứa nội dung. Header và đường về landing luôn dễ tìm; phần giới thiệu rút gọn phía trên form, minh họa giảm kích thước hoặc ẩn khi không đủ chỗ.
- Footer nhẹ có bản quyền Picket, quyền riêng tư và liên hệ hỗ trợ; dùng link thật, không thêm danh mục dài làm loãng thao tác đăng nhập.
- Màu nền kem, chữ mực, tím mận cho CTA và điểm nhấn pastel lấy từ landing và `PICKET-DESIGN.md`. Dùng font đúng vai trò, khoảng cách và nét minh họa chung; không tạo design MD khác.
- Tái sử dụng minh họa receipt/planning/home thích hợp từ asset đã duyệt, copy file cần thiết vào thư mục web khi triển khai; không phụ thuộc runtime vào thư mục source landing hoặc thư mục asset tham khảo. Không đưa ảnh tài khoản thật vào minh họa.
- Nội dung/minh họa phải nhường chỗ cho form. Không thêm chuyển động liên tục hoặc asset lớn làm chậm nhập liệu; nếu có hiệu ứng xuất hiện thì ngắn, tôn trọng reduced motion.

#### Nội dung từng trang

| Trang | Khối giới thiệu | Form và điều hướng |
| --- | --- | --- |
| Đăng nhập | “Tiền có chỗ. Bạn có khoảng thở.”; minh họa ví/hóa đơn/dự định, mô tả ngắn đúng chức năng đang có | Email, mật khẩu có hiện/ẩn, CTA đăng nhập, Google với nhận diện đúng, quên mật khẩu, liên kết đăng ký; hỗ trợ định tuyến user/admin sau xác thực theo quyền server |
| Đăng ký | “Bắt đầu từ những khoản nhỏ mỗi ngày.”; tóm tắt ghi thu chi, giữ hóa đơn, chăm chút dự định | Email, mật khẩu, nhập lại mật khẩu, yêu cầu mật khẩu đọc được, CTA tạo tài khoản, liên kết đăng nhập và privacy; trạng thái chờ xác minh rõ ràng theo mục 7 |
| Quên mật khẩu | “Lấy lại quyền truy cập Picket.”; minh họa phong bì/chìa khóa theo bộ Paper, hướng dẫn ngắn | Email, CTA gửi hướng dẫn, trạng thái đã tiếp nhận trung tính, cooldown gửi lại, liên kết quay về đăng nhập và đường về landing trong header |

- Chuyển đăng nhập/đăng ký bằng link thật có trạng thái hiện tại rõ ràng; không dùng ARIA tab nếu vẫn là hai route riêng.
- Không thêm “Ghi nhớ tôi” khi chưa có semantics thời hạn phiên thực sự; không thêm social login chưa triển khai hoặc lời hứa bảo mật/đồng bộ chưa có bằng chứng.
- Input có label thật, autocomplete đúng mục đích, trạng thái lỗi gắn với trường; lỗi tổng thể và thành công được screen reader đọc. Không dùng placeholder thay label.
- Khi submit: chặn gửi trùng, hiển thị tiến trình, giữ email khi lỗi; không ghi mật khẩu vào URL, analytics hay storage. OAuth cancel/lỗi/mất mạng có đường thử lại rõ ràng.
- CSS giới hạn trong auth shell; tránh sửa selector toàn cục làm đổi giao diện admin/dashboard ngoài phạm vi.

#### Deliverable và nghiệm thu UI xác thực

1. Wireframe desktop và mobile cho cả ba trang, thống nhất thành phần trước khi code; cập nhật quy tắc cần thiết trong `PICKET-DESIGN.md` hiện có.
2. Ba trang dùng cùng header, spacing, font, palette, input, button và footer; vẫn có minh họa/nội dung phù hợp từng mục đích.
3. Mở trực tiếp từng URL đều quay về landing bằng logo hoặc “Về trang chủ”, không cần Back trình duyệt. Đi qua lại login/register/forgot không mất lối điều hướng này.
4. Chụp kiểm tra ở 360/390px, 768px, 1440px; không tràn ngang, không che CTA khi mở bàn phím hoặc zoom 200%; kiểm tra màn desktop thấp để form không bị cắt.
5. Kiểm tra bàn phím, focus, contrast, screen reader, hiện/ẩn mật khẩu; form không nhảy bố cục mạnh khi lỗi xuất hiện.
6. Kiểm thử email login, Google login/cancel, đăng ký mới/trùng/chờ xác minh và reset theo mục 7; UI mới không bỏ qua kiểm tra quyền admin/user.
7. Bằng chứng screenshot trước/sau và test navigation; kiểm tra dashboard/admin/landing không bị ảnh hưởng bởi CSS dùng chung.

Ước lượng bổ sung: **3–5 ngày làm việc** cho wireframe, triển khai và kiểm thử ba trang. Thực hiện sau khi chốt hợp đồng Auth ở P1, trước nghiệm thu cuối P5. Đây là phần bổ sung của kế hoạch, chưa phải thay đổi source UI.

### 9.2. Các mốc tổng thể

Ước lượng cho một lập trình viên toàn thời gian, có QA theo từng mốc; chưa phải cam kết ngày phát hành.

| Mốc | Công việc | Sản phẩm nghiệm thu | Ước lượng |
| --- | --- | --- | --- |
| P0 | Baseline admin/Auth, kiểm tra quyền nguồn Play, inventory dữ liệu và hợp đồng metric | Ma trận hiện có/còn thiếu, wireframe, OpenAPI, baseline test | 2–3 ngày |
| P1 | Role/capability, MFA, chặn admin mobile, sửa luồng đăng ký/reset, chuyển các admin call legacy qua Dart | Web-only admin; auth matrix; audit và quyền server | 5–8 ngày |
| P2 | Collector landing, Caddy download logs, mobile events, import Play, tổng hợp và dashboard acquisition | Đối chiếu nguồn; loại QA/bot; freshness; retry/backfill | 6–9 ngày |
| P3 | Người dùng/detail, gói, OCR, support và export có quyền | Tác vụ hỗ trợ từ đầu tới cuối, pagination/filter/audit | 5–7 ngày |
| P4 | Health probes, incidents, cảnh báo, backup visibility, release dashboard | Mô phỏng lỗi staging, phát hiện/phục hồi và runbook | 4–6 ngày |
| P5 | Nội dung, hoàn thiện UI, kiểm thử tải/bảo mật/quyền, staging và rollout | Nghiệm thu toàn bộ, migration/rollback và tài liệu vận hành | 4–7 ngày |

Tổng dự kiến 29–45 ngày làm việc, gồm 26–40 ngày cho hệ thống admin/Auth và 3–5 ngày cho UI ba trang xác thực web; thay đổi theo phạm vi ticket/content và khả năng truy cập dữ liệu Play. Có thể bàn giao nội bộ từng mốc nhưng chỉ gọi hệ thống đầy đủ khi tiêu chí bên dưới đạt. Ưu tiên P1 trước vì chặn sai quyền và khôi phục tài khoản ảnh hưởng trực tiếp người dùng.

## 10. Tiêu chí nghiệm thu

1. Mọi vai trò được kiểm tra allow/deny cả URL, API, mutation và export; user thường không vào admin.
2. Admin không sử dụng được mobile qua mọi luồng xác thực/restore/đổi role; không ảnh hưởng user thường.
3. Đăng ký trùng không tạo thêm account; email chưa xác minh không dùng sản phẩm; reset không tạo user và không rò danh sách email.
4. Landing/APK đo được end-to-end; retry/Range/HEAD/bot có test; con số phân biệt click, served và install.
5. Import Play chạy lại không nhân đôi, CSV thay schema/UTF-16/lỗi quyền có xử lý; số liệu đối chiếu kỳ mẫu và giữ timezone/nguồn.
6. Không dữ liệu phải hiện “chưa có/chưa đo/nguồn lỗi”, không thay bằng 0 hoặc số giả.
7. Mutation nhạy cảm có audit, kiểm soát concurrency và quyền; không xuất hiện secret trong response/log/export.
8. Dashboard với dữ liệu kiểm thử tối thiểu 100.000 user và 1 triệu event vẫn phân trang/aggregate phía server; mục tiêu p95 API đọc dưới 2 giây ở tải staging đã công bố.
9. Sự cố API/OCR/job giả lập trên staging xuất hiện cảnh báo, chống gửi trùng, rồi tự ghi phục hồi; không phá production để test.
10. Test migration, dữ liệu retention, restore backup, rollout/rollback; chạy kiểm tra phù hợp web/API/database và screenshot QA.

## 11. Quyền riêng tư, lưu trữ và vận hành

- Đề xuất ban đầu: event chi tiết 90 ngày, số liệu tổng hợp 13 tháng, access log 14 ngày; chốt chính sách trước bật thu thập. Audit nhạy cảm có retention riêng.
- Không lưu IP thô trong bảng analytics; nếu cần chống abuse, xử lý tạm tại gateway, giới hạn truy cập và hạn lưu. Không fingerprint thiết bị.
- Tách telemetry QA/test/staff khỏi production; định danh ngẫu nhiên có thể reset, xử lý yêu cầu xóa dữ liệu liên quan user.
- Cập nhật privacy notice và khai báo Google Play trước phát hành mobile có telemetry mới; cơ chế lựa chọn đo lường theo yêu cầu thị trường thực tế.
- Cảnh báo có owner, severity, ngưỡng/cửa sổ, cooldown và recovery; kênh nhận cấu hình sau, không tự gửi email/chat trong bước lập kế hoạch.
- Triển khai staging trước; backup và migration tương thích ngược; feature flag collector/dashboard; không bắt buộc cập nhật app chỉ để hiển thị dashboard.

## 12. Nguồn và điểm chưa xác minh

- Google: [Download and export monthly reports](https://support.google.com/googleplay/android-developer/answer/6135870?hl=en): CSV private bucket, phân quyền, cập nhật hàng ngày và độ trễ 3–7 ngày; không phụ thuộc giờ xuất cố định.
- Google: [Play Developer Reporting API](https://developers.google.com/play/developer/reporting): nguồn chất lượng Android vitals.
- Cần xác minh khi bắt đầu P0: bucket và report thực có của tài khoản Picket, quyền đọc, cấu hình email confirmation/rate limit production, khả năng thu hồi phiên, quyền cấp gói hiện tại và semantics maintenance.
- Bản kế hoạch ban đầu chỉ mô tả phạm vi. Implementation và rollout thực tế được ghi ở báo cáo nghiệm thu, không suy trạng thái từ baseline.
