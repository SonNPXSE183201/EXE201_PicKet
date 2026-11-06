# Picket web: redesign và kiểm tra responsive — 22/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


**Checkpoint tiếp theo:** đã được chủ sở hữu phê duyệt push và triển khai production; source runtime `6993560`, login/admin HTTPS và smoke responsive đạt. [Báo cáo production/rollback](WEB_PRODUCTION_20261022.md). Các mô tả local/chưa deploy bên dưới là checkpoint trước phát hành.

## Phạm vi và trạng thái

Thực hiện theo yêu cầu chỉ sửa Next.js. Thay đổi runtime nằm trong `web/`; không sửa Expo/mobile, Dart API, shared packages, migration hay cấu hình production. Các commit và giao diện mới hiện ở local, **chưa push/chưa triển khai production**. Không thay đổi tài khoản admin của chủ sở hữu khi kiểm thử.

Thiết kế dùng màu cream `#FFF8F0`, peach `#FFD6BA`, mauve `#96606D`, ink `#4A2C2A` của mobile; logo hiện hữu, kiểu nút pill, trường nhập bo góc, trạng thái rõ ràng. Desktop dùng sidebar, điện thoại dùng 5 tab và menu toàn bộ chức năng. Bảng quản trị chuyển thành các thẻ có nhãn trên màn hình nhỏ. Có loading, lỗi, trống, thành công và trang không tìm thấy.

Chủ sở hữu đã xác nhận: **giữ web cloud, hoàn thiện UI/UX và admin; không bổ sung guest/offline trên web**. Phần triển khai UI/UX và admin local trong phạm vi này đã hoàn tất, qua các gate bên dưới. Kho guest, hàng đợi mutation offline và giải quyết xung đột offline của trình duyệt không thuộc phạm vi đã duyệt. Các hàng đợi Android vẫn riêng trên điện thoại. Không gọi đây là parity toàn bộ native hay nghiệm thu production.

## Ma trận màn hình

| Nhóm mobile | Màn hình/luồng web hiện có |
| --- | --- |
| Đăng nhập, đăng ký, OTP, quên/đặt mật khẩu | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, callback, onboarding |
| Tổng quan và lịch hóa đơn | `/dashboard`: số dư thực, chọn tháng, thu/chi ròng, giao dịch gần đây, lịch ảnh |
| Ví, danh mục | `/accounts`, `/categories`: tạo/sửa/lưu trữ ngay trong danh sách; không nhân bản riêng trang new/edit |
| Thu chi, chuyển tiền, chi tiết, hoàn tiền, chia danh mục, chọn nhiều | `/transactions`, `/transactions/transfer`, `/transactions/[id]`, `/refund`, `/splits`, `/transactions/bulk` |
| Ngân sách, kế hoạch, đối soát | `/budgets`, `/planning`, `/reconcile`; xem hạn mức tháng, chuyển hạn mức, chốt tháng, chọn khoản đã đối soát và xem chênh lệch |
| Hóa đơn/kỳ thanh toán/định kỳ | `/capture`, `/receipts`, `/receipts/[id]`, `/bills`, `/subscriptions`; các form tạo/sửa kỳ thanh toán gộp vào danh sách |
| Kỷ vật/đồ dùng và ảnh | `/keepsakes`: tạo/sửa/lưu trữ, ảnh riêng tư, bảo hành và đổi trả độc lập |
| Thống kê, cần kiểm tra, nhắc việc | `/insights`, `/review-inbox`, `/notifications`; tìm giao dịch chưa phân loại/nghi trùng, nhắc thanh toán/ngân sách/hạn đồ dùng |
| Hồ sơ, gói, dữ liệu, xóa tài khoản, trợ giúp | `/profile`, `/billing`, `/data`, `/help`; JSON/CSV/.picket cloud, khôi phục có xác nhận, xóa tài khoản cần đăng nhập gần đây |
| Đồng bộ | Realtime có làm mới định kỳ dự phòng; `/sync-conflicts` hướng dẫn xử lý bản mới, không giả lập danh sách outbox Android |
| Quản trị | `/admin`, `/admin/users`, `/admin/ocr`, `/admin/partners`, `/admin/settings`, `/admin/audit` |

## Admin riêng trên web

- Login thành công đi qua `/session`; staff vào `/admin`, user vào dashboard.
- Các trang và server action tài chính yêu cầu workspace user. Staff mở trực tiếp URL người dùng bị chuyển về `/admin`; endpoint export trả 403. User không vào admin.
- Lookup `is_staff` lỗi hoặc trả dữ liệu không hợp lệ sẽ fail closed. Quyền API/RLS vẫn được kiểm tra độc lập.
- Không thêm role mới hay thay quyền mobile/API. Đăng xuất web dùng `scope: local`, không thu hồi phiên mobile.
- Không test khóa/cấp gói người dùng thật hoặc bật bảo trì production. Các giới hạn nghiệm thu staging trong báo cáo admin trước đó vẫn còn hiệu lực.

## Những lỗi đã tìm và sửa trong quá trình kiểm tra

- Tổng số dư không còn tính từ chỉ trang 100 giao dịch đầu tiên. Có phân trang, chống trùng ID và không trả tổng thiếu khi một trang lỗi.
- Hoàn tiền giảm chi tiêu; chia danh mục và tháng theo múi giờ Việt Nam; ngân sách chỉ cộng ví cùng tiền tệ, fallback VND cho bản ghi cũ thiếu mã tiền tệ.
- Tràn form kiểm tra hóa đơn ở tablet; ô ngày trong bộ lọc tràn 1px ở 320; số tiền dài và menu nhỏ: đã sửa responsive.
- Reconcile tuân theo giới hạn ngày UTC của RPC hiện hữu. Request đang chờ giữ cùng ID/nội dung qua reload; kết quả không rõ không tự tạo yêu cầu mới. Có xem trước số dư được đánh dấu và chênh lệch trước xác nhận.
- OCR cloud dùng đúng field và parser trả về từ worker; giữ các sửa tay của người dùng. Ảnh chỉ upload sau consent, giới hạn dung lượng và kiểm tra owner. Đã kiểm tra lưu ảnh thủ công; chưa nghiệm thu nhận diện provider thật trên web.
- RPC export cũ trả cả giao dịch soft-delete. Web đối chiếu các tập ID còn hoạt động, loại tombstone, kiểm tra đủ dữ liệu/tham chiếu, validate import và kiểm tra revision trước tải. Không sửa RPC/backend. QA có 5 dòng trong export gốc, 3 dòng còn hoạt động: endpoint web trả 200 với đúng 3 dòng; không hồi sinh 2 dòng đã lưu trữ.
- Thiếu ảnh hoặc thiếu bản ghi còn hoạt động sẽ chặn file, không tạo backup dở dang. Khôi phục ảnh đồ dùng vào đúng namespace để vẫn sửa được sau restore.

## Bằng chứng kiểm tra local

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build` | PASS, tạo production build và 42 mục prerender; danh sách route dynamic/static xuất thành công |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, không lỗi/cảnh báo ở lần chạy chốt |
| `npm run test:auth` | 49/49 PASS; gồm auth, role, tính tiền, OCR corpus, backup crypto/guard, phân trang, reminders, reconcile, logout |
| Coverage các module được unit test tải vào | 97,41% line, 84,28% branch, 100% function; **không phải coverage toàn Next.js UI** |
| 22 trang user × 320/390/768/1440px | 88/88 không tràn ngang/không error boundary |
| Chi tiết giao dịch, refund, splits, hóa đơn có ảnh × bốn chiều rộng | 16/16 đạt với bản ghi QA hiện hữu |
| 6 trang public/auth/404 × bốn chiều rộng | 24/24 không tràn ngang, có tiêu đề; 404 đúng HTTP 404 |
| 6 trang admin × bốn chiều rộng | 24/24 không tràn ngang/không error boundary |
| Admin mở 6 URL user trực tiếp | Cả 6 về `/admin`; export 403; login tự vào admin |
| Menu điện thoại | Mở được; Escape đóng và trả focus về summary |
| Lưu hóa đơn/ảnh và ngày từ lịch | Tạo QA receipt thật, ngày được giữ, detail và ảnh riêng tư mở được |
| Đồ dùng có ảnh | Tạo/hiển thị ảnh, export giữ tham chiếu ảnh đạt |
| Backup cloud mã hóa | Crypto độc lập tương thích envelope Expo; round-trip QA 1 ví/3 giao dịch/1 đồ dùng có ảnh đạt |
| Planning | QA tạo ngân sách, thay phương pháp, điều chuyển hạn mức và chốt tháng đạt |
| Bulk | Cố ý gây version conflict: hiển thị 1 thành công/1 lỗi; chỉ retry dòng lỗi, không làm lại dòng đã thành công |
| Đối soát mất phản hồi | Cắt phản hồi sau ghi, reload/retry cùng request: chỉ một giao dịch điều chỉnh, dọn trạng thái chờ |
| `git diff --check` và diff phạm vi | Không whitespace error; không diff trong mobile/API/packages/Supabase |

Ảnh local trong `output/playwright/` (không commit): `web-final-user-390.png`, `web-final-admin-390.png` cùng các ảnh desktop/tablet trước đó. Đây là Chromium điều chỉnh viewport trên laptop, **không phải nghiệm thu điện thoại thật/Safari/VoiceOver**. Một lượt đầu mở ID receipt cũ sau restore gặp dữ liệu không còn; đã tạo lại receipt và chạy đủ 4 kích thước. Không biến lượt ID cũ thành PASS.

## Giới hạn phải giữ rõ

- Bản web cần mạng. Guest/offline/browser outbox không thuộc phạm vi theo xác nhận của chủ sở hữu; không sửa mobile để bù.
- ML Kit offline, sinh trắc học, thông báo nền OS và cài/cập nhật APK là native. Web có OCR cloud có consent, nhắc việc trong ứng dụng, và dẫn quản lý Google Play; không có checkout web.
- `.picket` hiện là định dạng tài chính cloud đang dùng, không phải bản sao đầy đủ mọi bảng/metadata. Ảnh hóa đơn chưa gắn vào giao dịch, kết quả OCR chi tiết và bản ghi lưu trữ không nằm trong định dạng. Restore thay thế dữ liệu và bộ sưu tập receipt; web đã cảnh báo rõ trước thao tác. Không tuyên bố đã chuyển đổi mọi dữ liệu guest/lịch sử Flutter.
- Camera thật, provider OCR E2E, assistive-tech audit đầy đủ, global settings E2E trên staging và triển khai production chưa nghiệm thu. Không đổi thông báo bảo trì/dữ liệu người dùng thật để làm đẹp báo cáo.

Design inventory/preview: `PICKET-DESIGN.md`, `PICKET-DESIGN.md`, `PICKET-DESIGN.md`. Skill design-system/product-ui-ux dẫn dắt token, navigation và các trạng thái; copywriting giữ trang mở đầu đúng chức năng thực tế, không hứa OCR/offline native trên web.

## Checkpoint và dọn kiểm thử

Commit runtime local: `3df26c6` (trên các checkpoint RED/GREEN trước đó). Sau chốt, đã xóa đúng **2 tài khoản QA sinh ngẫu nhiên và 5 object ảnh** trong namespace của chúng; purge dữ liệu và membership QA. Không xóa/đổi tài khoản admin của chủ sở hữu. Đã dừng helper loopback chứa credential tạm và server preview; không commit mật khẩu, token hoặc file backup QA. Dữ liệu QA đã xóa không được giữ như dữ liệu sản phẩm để khôi phục. Dev server web local còn mở để chủ sở hữu xem.
