# Hồ sơ khai báo PicKet — bản chuẩn bị ngày 24/10/2026

<!-- project-status-link -->
> Đồng bộ tài liệu 27/10/2026: [Trạng thái hiện hành](../PROJECT_STATUS.md). Báo cáo/kế hoạch này giữ phạm vi và bằng chứng tại checkpoint được ghi trong tài liệu. Các mục chưa làm và phiên bản cũ cần đối chiếu với hiện trạng chung.

Đối chiếu bản Android phát hành thực tế trước khi gửi. Tài liệu này không xác nhận Google đã nhận hoặc duyệt các khai báo. Những mục Console không cung cấp qua Android Publisher API phải được hoàn tất trong giao diện Console.

## Trang cửa hàng

- Tên: **PicKet - Quản lý thu chi**.
- Loại: ứng dụng. Danh mục đề xuất: **Tài chính**.
- Email hỗ trợ: **picketfinance@gmail.com**.
- Website: https://picket.51-79-207-154.sslip.io/
- Chính sách quyền riêng tư: https://picket.51-79-207-154.sslip.io/privacy.html
- Yêu cầu xóa tài khoản: https://picket.51-79-207-154.sslip.io/account-deletion.html
- Mô tả VI/EN trong `store-listings.json`. Chưa được commit lên Play: API kiểm tra hợp lệ nhưng không cho lưu với `changesNotSentForReview=true`; không gửi bộ hồ sơ thiếu asset để xét duyệt.

## Data safety: bảng nguồn để điền

Không chọn “không thu thập dữ liệu”: app có đăng nhập và đồng bộ. Chỉ dữ liệu không rời thiết bị mới không tính là thu thập theo định nghĩa của biểu mẫu. Phân biệt “thu thập” và “chia sẻ” theo ngoại lệ nhà cung cấp dịch vụ của Google; không tự chọn tất cả là chia sẻ chỉ vì sử dụng Supabase.

| Dữ liệu | Chức năng / bên xử lý | Mục đích | Điều cần xác nhận khi khai báo |
| --- | --- | --- | --- |
| Email, user ID, tên hiển thị | Supabase Auth, hồ sơ PicKet; Google nếu chọn Google Sign-In | Quản lý tài khoản, chức năng ứng dụng | Chọn các loại thông tin cá nhân tương ứng. Người dùng có thể dùng guest; dữ liệu này cần khi chọn tài khoản. |
| Giao dịch, số dư nhập, ngân sách, hóa đơn, khoản định kỳ | Cơ sở dữ liệu Supabase qua API PicKet khi đồng bộ | Chức năng ứng dụng | Thông tin tài chính / thông tin tài chính khác theo câu hỏi thực tế. Chỉ nhập tay, không tự truy cập tài khoản ngân hàng. |
| Ảnh hóa đơn/ảnh người dùng chọn | Storage; OCR trên VPS nếu người dùng dùng chức năng cloud | Chức năng ứng dụng | Ảnh: có thu thập khi tải lên. Không đánh dấu chỉ xử lý tạm thời nếu ảnh vẫn được lưu. |
| Lịch sử mua và trạng thái gói | Google Play, verifier Supabase, purchase token | Chức năng ứng dụng, phòng chống gian lận | Lịch sử mua. PicKet không nhận số thẻ hoặc mã bảo mật thẻ. |
| Ghi chú trong giao dịch, tên ví/danh mục | Đồng bộ cùng bản ghi | Chức năng ứng dụng | Kiểm tra mục nội dung do người dùng cung cấp / nội dung khác của biểu mẫu. |
| IP, thời gian yêu cầu, phản hồi/lỗi | VPS, Supabase và nhà cung cấp hạ tầng | Bảo mật, vận hành | Xác nhận chính sách log/retention thực tế trước khi khai các nhóm chẩn đoán, thiết bị/định danh hoặc vị trí suy ra từ IP. Không tự nói “không có log”. |

Các giá trị cần giữ đúng: dữ liệu gửi qua HTTPS; có đường xóa tài khoản trong ứng dụng và trang yêu cầu ngoài ứng dụng. Không có bằng chứng dùng quảng cáo, tracking quảng cáo, danh bạ, SMS, vị trí GPS hoặc microphone trong mã mobile đã rà. Kiểm tra cả SDK của artifact cuối; manifest chỉ có quyền không chứng minh dữ liệu đã được thu thập.

## App access — thông tin cho người xét duyệt

Chọn **Có phần bị hạn chế** vì đồng bộ và gói yêu cầu tài khoản. Chuẩn bị tài khoản riêng cho người xét duyệt; không dùng tài khoản cá nhân hay cấp service role. Tài khoản cần hoạt động, dữ liệu minh họa và không có OTP cần người phát triển hỗ trợ mỗi lần đăng nhập. Nếu cần kiểm tra gói, cung cấp quyền truy cập đầy đủ bằng cơ chế test hợp lệ, không yêu cầu reviewer mua gói.

Hướng dẫn thao tác đề xuất:

1. Mở app, chọn đăng nhập email/mật khẩu và dùng thông tin reviewer cung cấp riêng trong Console.
2. Ví: xem ví mẫu hoặc tạo ví thử; số dư nhập là dữ liệu ghi chép, không có chuyển tiền ngân hàng thật.
3. Tạo giao dịch thu/chi, chọn ví, số tiền, danh mục và lưu.
4. Quét hóa đơn: chụp/chọn một ảnh hóa đơn rõ nét, kiểm tra kết quả rồi lưu; OCR có thể cần sửa và cloud cần Internet.
5. Cá nhân: xem gói, xuất dữ liệu, khóa ứng dụng; xóa tài khoản yêu cầu vừa đăng nhập lại trong 5 phút.

**Chưa có tài khoản reviewer được tạo/kiểm thử trong đợt này. Không điền thông tin giả.**

## Các khai báo còn lại

- Quảng cáo: chọn theo artifact cuối. Chưa tìm thấy SDK quảng cáo trong mobile đã rà.
- Đối tượng: kế hoạch sản phẩm nhắm người từ 18 tuổi; chủ tài khoản xác nhận đối tượng thực tế trước khi chọn. Không chọn nhóm trẻ em để mở rộng phân phối nếu chưa đáp ứng chính sách Families.
- Phân loại nội dung: trả lời IARC dựa trên nội dung và các chức năng hiện có; không tự ghi rating chưa được tính bởi IARC.
- Tính năng tài chính: khai chức năng theo dõi chi tiêu/ngân sách nếu biểu mẫu có lựa chọn đó. Không khai cung cấp khoản vay, giao dịch chứng khoán hoặc ví chuyển tiền ngân hàng vì PicKet không thực hiện các dịch vụ đó.
- Google Play Billing: chưa bật bán; bốn ID và giá đã được chủ tài khoản duyệt trong `subscriptions.json`, và bốn sản phẩm/base plan đã được tạo, đang DRAFT. Chưa kích hoạt vì RTDN và nghiệm thu giao dịch thử chưa hoàn tất.
- Thử nghiệm kín: cần danh sách người thật và opt-in thật. Nhóm tester API trống không chứng minh danh sách email trong Console cũng trống; API tester chỉ cho thấy Google Groups. Không tự khai số người, ngày thử hoặc mức tương tác.

Nguồn: [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), [User Data](https://support.google.com/googleplay/android-developer/answer/10144311), [Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111).

## ML Kit SDK disclosure — additional evidence

The bundled dependency `com.google.mlkit:text-recognition:16.0.1` is included by `rn-mlkit-ocr`. Google’s ML Kit Android disclosure states that bundled features collect per-installation identifiers plus device/app information, performance metrics, API configuration, feature input/output sizes, feature events and error codes for diagnostics and usage analytics. Thus absence of an app-level analytics SDK does not imply no SDK analytics collection. Include relevant device/other IDs, diagnostics and feature-interaction categories/purposes when completing the current CSV template; distinguish performance events from crash stack traces (no independent evidence of crash-log uploads). SDK collection is encrypted in transit and Google says these listed SDK data are not transferred to third parties.

Source: https://developers.google.com/ml-kit/android-data-disclosure

Direct API submission is supported by `applications.dataSafety`, which accepts the CSV contents. Current owner export is needed to preserve newer account-creation/deletion fields absent from Google’s public sample. Browser-control inventory has no enabled browsers; no claim is made that the owner’s visible tab was edited.
