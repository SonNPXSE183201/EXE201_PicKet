# Kế hoạch: thanh toán G11, trùng hoá đơn, xem hoá đơn D5, hiệu năng, chiều cao nút, kiểm thử chuyên sâu — 07/11/2026

Nhánh `merge/mobile-figma`, **chưa commit, không đẩy lên GitHub**. Nối tiếp hai kế hoạch `MOBILE_FIGMA_MERGE_PLAN_20261106.md` và `MOBILE_COMPLETION_API_TEST_PLAN_20261106.md`.

## 1. Tổng kết công việc tới hiện tại

| Mảng | Trạng thái |
|---|---|
| Trang quản trị web (thiết kế Figma), đăng ký và xác thực, cập nhật thời gian thực, tải trước các thẻ, mã PIN, xử lý phiên hết hạn | Đã commit trên nhánh `feat/admin-web-redesign`, đã chạy trên máy chủ thật |
| Trang giới thiệu (landing) mới | Đã chạy trên máy chủ thật |
| Gộp giao diện ứng dụng điện thoại từ nhánh Figma | Xong, chưa commit |
| Kiểm thử 73 hàm gọi máy chủ mà ứng dụng dùng | 118 đạt, 7 lỗi. Còn 5 lỗi phía máy chủ chờ bạn quyết định |
| Kiểm thử tự động của ứng dụng điện thoại | 1111/1111 đạt; kiểm tra kiểu và quy tắc mã đều sạch |

## 2. Nguyên nhân các lỗi và cách sửa

### 2.1 Ứng dụng "tải lại" khi quay vào từ màn hình chính
- **Nguyên nhân:**
  1. Mỗi lần quay lại ứng dụng (kể cả sau hộp thoại vân tay, máy ảnh, chọn ảnh), ứng dụng che toàn bộ bằng màn "Đang xác minh tài khoản" và chờ máy chủ trả lời.
  2. Khi mã phiên đăng nhập tự làm mới (khoảng mỗi giờ), toàn bộ dữ liệu bị tải lại.
  3. Cứ 30 giây và mỗi lần quay lại, ứng dụng tải lại cả sáu nhóm dữ liệu.
- **Đã sửa:**
  - Người dùng đã được xác minh trong phiên thì việc xác minh lại chạy **ngầm**, không bao giờ che màn hình. Tối đa 10 phút xác minh lại một lần.
  - Nếu máy chủ báo tài khoản bị thu hồi quyền thì vẫn đăng xuất như cũ. Chỉ khi đổi sang tài khoản khác mới hiện màn xác minh.
  - Làm mới mã phiên không còn tải lại dữ liệu.
  - Chỉ tải lại khi dữ liệu cũ hơn 60 giây hoặc mất kết nối thời gian thực.
  - Mã phiên tự làm mới theo trạng thái ứng dụng (đúng hướng dẫn của Supabase).
- **Lỗi bạn báo thêm (đã sửa):** quá thời hạn thì app khoá, nhưng mở khoá xong vẫn kẹt màn "Đang xác minh". Nguyên nhân: mốc 10 phút tính từ lần xác minh gần nhất chứ không phải từ lúc rời app. Nay việc xác minh lại luôn chạy ngầm.

### 2.2 Mở lại hoá đơn không thấy ảnh và văn bản OCR
- **Nguyên nhân:** dữ liệu vẫn lưu đúng (ảnh, văn bản OCR, liên kết giao dịch), nhưng màn chi tiết giao dịch chỉ vẽ ảnh minh hoạ, và nút xem hoá đơn bị giấu trong menu ⋯.
- **Đã sửa, theo yêu cầu "chỉ một giao diện D5":**
  - **Màn D5 "Ảnh hoá đơn":** ảnh ghim có băng dính, nút kính lúp để phóng to, thẻ giấy gồm cửa hàng, ngày giờ, **từng sản phẩm kèm giá**, tổng cộng, "Mở giao dịch ›"; hai nút "Chia sẻ" và "Lưu vào máy".
  - **Menu ⋯ của D5:** "Kiểm tra và chỉnh sửa", "Văn bản OCR đã đọc" (xem lại kết quả nhận diện, chọn và sao chép được), "Mở giao dịch".
  - **Chi tiết giao dịch:** chỉ còn một dòng "Hoá đơn đính kèm · Xem hoá đơn" kèm ảnh thu nhỏ, bấm vào là mở D5.
  - **Trình xem ảnh toàn màn hình (S5):** chụm hai ngón hoặc chạm hai lần để phóng to; "Lưu ảnh" mở bảng chia sẻ của Android.

### 2.3 Thông báo trùng hoá đơn chưa có thiết kế
- **Đã sửa:** thay hộp thoại mặc định của Android bằng bảng trượt từ dưới lên, so sánh hai hoá đơn "Đã lưu" và "Mới quét" (ảnh, cửa hàng, ngày, tổng tiền).
- **Nút:**
  - "Xem hoá đơn đã lưu".
  - "Vẫn lưu hoá đơn mới": chỉ khi ảnh khác nhau.
  - "Huỷ".

### 2.4 Màn thanh toán PayOS và Google Play chưa đồng bộ
- **Đã sửa theo frame G11 và "Đã là Pro":** hai màn dùng chung bộ thành phần giao diện:
  - Thẻ tím "Gói hiện tại" kèm số lượt quét.
  - Nút chuyển Theo tháng / Theo năm.
  - Hai ô Plus/Pro đặt cạnh nhau.
  - Khối "Gói nào cũng có".
  - Một nút "Nâng cấp lên…".
  - Thẻ cảm ơn khi đã có gói trả phí.
- **Giữ nguyên toàn bộ cách thanh toán:** đếm ngược 15 phút, mã ưu đãi, xác nhận thay link, khôi phục giao dịch Google Play.

### 2.5 Nút cao hơn ô chọn
- **Nguyên nhân:** không có chuẩn chiều cao chung. Ô nhập cao 52–56, nút cao 48; nhãn tiếng Việt dài xuống dòng làm nút cao tới 62.
- **Đã sửa:** chuẩn chung là 48, bản thu gọn là 40.
  - Nút giữ một dòng và tự thu nhỏ chữ.
  - Nút cao thêm theo cỡ chữ hệ thống thay vì cắt chữ.
  - Không tắt phần đệm phông chữ, để dấu tiếng Việt trên chữ hoa không bị cắt.

### 2.6 Lỗi giao diện tìm thấy khi kiểm thử trên máy
- **Dự định:** số tiền màu tối trên nền tím ở chế độ tối. Đã sửa sang chữ trắng.
- **Chụp hoá đơn:** nền kem chữ trắng ở chế độ tối. Đã sửa sang nền tối cố định; lớp phủ của bảng chọn và lịch cũng sửa tương tự.
- **Ví:** lưới hai cột rơi xuống một cột trên máy rộng 360. Đã sửa.
- **Tiếng Anh:** "1 items" và tên trên thanh dưới cùng. Đã sửa.
- **Ảnh trong màn chi tiết hoá đơn bị co thành dải mỏng** (do mình gây ra khi thêm nút xem ảnh). Đã sửa.

## 3. Kiểm thử trên Redmi 7 (tài khoản thật, chỉ xem, không tạo dữ liệu)

| Hạng mục | Kết quả |
|---|---|
| Quay lại sau 20 giây | Hiện ngay màn Nhà ở 0,6 giây, không còn màn "Đang xác minh" |
| Ảnh hoá đơn ở chi tiết giao dịch | Hiện ảnh thật |
| Trình xem ảnh toàn màn hình, "Lưu ảnh" | Hoạt động, mở bảng chia sẻ |
| Văn bản OCR | Hiện đầy đủ, chọn và sao chép được |
| Mở khoá app sau khi bị khoá | Vào thẳng màn Nhà, không còn kẹt "Đang xác minh" |
| Bấm vào giao dịch có hoá đơn | Mở thẳng **màn D5 gộp**: ảnh ghim, thẻ hoá đơn, Danh mục, Ví, Sửa / Hoàn tiền, Chia sẻ / Lưu vào máy |
| Tốc độ màn D5 | Lần đầu: bố cục đúng ở giây thứ 2, ảnh hiện khi tải xong. Lần sau: **dưới 1 giây** kèm ảnh (ảnh đã lưu trong bộ nhớ đệm) |
| Menu ⋯ của D5 | Chia theo danh mục, Văn bản OCR đã đọc, Sửa chi tiết hoá đơn, Lưu trữ giao dịch đều hiện đúng |
| Gói & thanh toán (đã có gói Plus) | Đúng frame "Đã là …": thẻ tím 30/30 lượt, thẻ cảm ơn, Gói nào cũng có, lịch sử |
| Chiều cao ô nhập và nút (biểu mẫu Thêm hoá đơn) | Ô nhập 47dp, ô ngày 47dp, nút 48dp: đã đồng đều |

Không chạy kiểu bấm ngẫu nhiên hàng loạt trên tài khoản thật, vì có thể làm thay đổi dữ liệu thật.

**Sự cố trong lúc kiểm thử:**
- Hai lần chạm rơi ra ngoài app QA: một lần mở ứng dụng Camera của máy, một lần mở app Picket thật. Không thao tác gì trong hai app này, dữ liệu không đổi.
- Đã thêm bước kiểm tra: công cụ chạm chỉ chạy khi app QA đang ở trước.

## 4. Thay đổi theo yêu cầu "chỉ một giao diện D5"
- Bấm vào giao dịch mở thẳng màn D5 (cùng một màn cho mọi giao dịch). Giao dịch có hoá đơn có thêm ảnh và từng sản phẩm.
- Màn "Chi tiết giao dịch" kiểu cũ đã bỏ.
- Mọi lối mở hoá đơn khác (sau khi chụp, hộp thư cần kiểm tra, thông báo trùng) tự chuyển sang màn D5 của giao dịch.
- Màn hoá đơn riêng chỉ còn dùng để **sửa từng sản phẩm**, mở từ menu ⋯ → "Sửa chi tiết hoá đơn"; lưu xong quay về D5.

## 4b. Tối ưu hiệu năng (07/11/2026, 03:40)

| Hạng mục | Trước | Sau | Cách làm |
|---|---|---|---|
| Chuyển thẻ (Nhà / Chi tiêu / Dự định / Tài khoản) | Mỗi lần bấm dựng lại màn; Dự định mất khoảng 1,5 giây | Dưới 0,4 giây, cả lần đầu | Bốn màn chuyển sang bộ điều hướng dạng thẻ, giữ màn trong bộ nhớ (nhóm `src/app/(tabs)`, đường dẫn không đổi). Sau khi màn đầu tiên hiện và máy rảnh 2 giây, app dựng sẵn các thẻ còn lại |
| Mở hoá đơn (D5) lần sau | Tải lại ảnh vài MB mỗi lần | Dưới 1 giây | Lưu ảnh đã tải vào bộ nhớ đệm của app; nhớ hoá đơn theo giao dịch |
| Ảnh hoá đơn mới | Ảnh gốc của camera, vài MB | Cạnh dài tối đa 2000 điểm ảnh, chất lượng 85% | Thu nhỏ một lần khi lưu bản nháp; OCR trên máy vẫn đọc ảnh gốc nên chất lượng nhận diện không đổi |
| Hoá đơn cũ hơn 50 bản | Không tìm thấy | Tìm theo giao dịch | Chức năng mới ở máy chủ; ứng dụng đã dùng và vẫn đúng khi máy chủ chưa cập nhật |

**OCR:**
- **Đo trên Redmi 7 với 40 ảnh mẫu:** lõi OCR trên máy mất trung vị 0,44 giây mỗi ảnh, 90% ảnh dưới 0,88 giây, chậm nhất 1,65 giây; không ảnh nào vượt ngân sách 20 giây. Phần chậm người dùng cảm thấy nằm ở tải ảnh lên và tải ảnh về (đã xử lý ở trên).
- **Tách sản phẩm cho hoá đơn dạng bảng** khi văn bản không có toạ độ (cột xếp thường hoặc đảo ngược, cột bảo hành `BH` không bị nhầm thành giá). Việc này giao cho Codex (`gpt-6.1-sol`, mức suy luận cao), mình đã kiểm chứng lại:
  - Kiểm thử OCR 258/258 đạt.
  - Bộ 40 ảnh không có ảnh nào kém đi.
  - Ảnh chụp trực tiếp có toạ độ vẫn dùng quy tắc theo vị trí cũ, nên hiệu quả với hoá đơn GEARVN cần chụp lại thật để xác nhận.

**Kiểm thử:** toàn bộ dự án đạt (`npm run test`). Ứng dụng: 1131/1131.

## 5. Việc còn lại
1. **Thử trên máy:**
   - Bảng so sánh trùng hoá đơn: cần chụp lại một hoá đơn đã lưu. Bạn thử giúp được không?
   - Cỡ chữ lớn: app khoá khi đổi cỡ chữ và chưa được mở khoá trong lúc chờ. Cỡ chữ của máy đã trả về 1,0.
2. **Hoá đơn GEARVN không có danh sách sản phẩm** dù văn bản OCR có dòng "Chuột không dây Razer Viper V3 Pro SE". Bộ tách sản phẩm của OCR chưa đọc được hoá đơn dạng bảng lật ngược. Cần cải thiện bộ tách và chạy lại bộ ảnh mẫu `/Bill/`.
3. **Ảnh hoá đơn GEARVN lộn ngược:** nhiều khả năng do hoá đơn đặt ngược khi chụp. Đã thêm nút xoay ảnh trong trình xem.
4. **Ảnh tải lần đầu còn chậm**, vì app lưu ảnh ở độ phân giải gốc của camera. Đề xuất thu nhỏ ảnh trước khi tải lên. Việc này ảnh hưởng tới OCR trên máy chủ nên cần bạn đồng ý.
5. **Hoá đơn cũ hơn 50 bản gần nhất** chưa liên kết được với giao dịch. Cần thêm chức năng tìm hoá đơn theo giao dịch ở máy chủ, triển khai cùng 5 lỗi máy chủ khi bạn duyệt.
6. Dọn tệp tạo ra khi đóng gói, rồi báo cáo cuối.
