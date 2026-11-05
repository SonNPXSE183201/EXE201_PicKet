# Picket — Giáo trình tài chính tiếng Việt v1

> [Trạng thái hiện hành](../PROJECT_STATUS.md). Bản biên tập 3 ngày 05/11/2026: lộ trình 4 giai đoạn, thêm 18 bài (13–30); giữ ID và đáp án quiz của 12 bài cũ. [Checklist tự rà soát](REVIEW_CHECKLIST_V2_20261105.md).

Biên soạn ngày 2026-10-23; mở rộng và tự rà soát ngày 2026-11-05. **self-reviewed-pending-owner-approval**: chưa được người độc lập duyệt; chưa đủ điều kiện phát hành nội dung published.

30 bài / 4 giai đoạn, dành cho người lớn từ 18 tuổi. Nội dung và tình huống VND do Picket biên soạn mới, không sao chép giáo trình nguồn. Nguồn quốc tế chỉ dùng cho khái niệm, không áp dụng quyền hoặc luật nước ngoài cho Việt Nam. Không khẳng định nguồn đã duyệt hoặc chứng thực Picket.

JSON cùng tên là dữ liệu chuẩn của bản này. `correctIndex` bắt đầu từ 0; `reviewedAt` chỉ là ngày tác giả tự rà soát, không phải ngày phê duyệt độc lập. `workedExample.arithmeticChecks` là dữ liệu kiểm tra số học, không thực thi biểu thức trong ứng dụng. `citedFigures` ghi nguồn và ngày cho từng con số quy định.

## Cửa kiểm duyệt trước phát hành

- Owner approval of the v2 self-review checklist (docs/learning/REVIEW_CHECKLIST_V2_20261105.md)
- Independent financial-content review
- Vietnamese editorial and accessibility review
- Vietnam-relevant legal/safety review for borrowing, tax, insurance and digital safety
- Re-verification of dated figures (tax, deposit insurance, social insurance) before each release
- Pilot comprehension and Android font/TalkBack/offline checks
- Approved English translation before claiming bilingual curriculum

Thời lượng 3–5 phút chỉ là mục tiêu UX, chưa có đo thử. Số từ dưới đây đếm theo khoảng trắng tiếng Việt, không tương đương số từ vựng ngôn ngữ học.

# Giai đoạn 1: Nền tảng

Biết tiền thực nhận, ghi chép đúng và chia tiền vào từng túi.

## picket.vi.financial.v1.13 — Chương 07: Lương gộp và tiền thực nhận

**Năng lực:** income.gross-to-net  
**Mục tiêu:** Đọc phiếu lương, tách các khoản trừ và lập kế hoạch từ tiền thực nhận.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 238 đơn vị cách trắng trong thân bài

Lương ghi trong hợp đồng thường là lương gộp. Tiền về tài khoản là tiền thực nhận. Ở giữa là các khoản trừ, như bảo hiểm bắt buộc và thuế thu nhập cá nhân nếu có. Kế hoạch chi tiêu nên bắt đầu từ tiền thực nhận, vì đó là số bạn thật sự dùng được.

Với người lao động thuộc diện đóng bảo hiểm bắt buộc, phần người lao động đóng thường là 10,5% tiền lương làm căn cứ đóng. Trong đó có 8% bảo hiểm xã hội, 1,5% bảo hiểm y tế và 1% bảo hiểm thất nghiệp. Bảo hiểm xã hội Hà Nội nêu các tỷ lệ này ngày 8/9/2025. Lương làm căn cứ đóng có thể khác lương gộp và có mức trần, nên hãy xem phiếu lương thay vì tự đoán.

Ví dụ hư cấu: Lan có lương gộp 12.000.000đ, cũng là lương đóng bảo hiểm. Khoản bảo hiểm là 12.000.000 × 10,5% = 1.260.000đ. Phần còn lại là 10.740.000đ. Số này thấp hơn mức giảm trừ bản thân 15.500.000đ mỗi tháng áp dụng từ kỳ tính thuế 2026, nên trong ví dụ Lan chưa phát sinh thuế từ tiền lương. Tiền thực nhận là 10.740.000đ.

Thưởng, làm thêm giờ hoặc nhận lương từ nhiều nơi có thể làm phép tính khác. Bài này giúp bạn đọc phiếu lương. Số thuế thật phụ thuộc quy định hiện hành và chứng từ của bạn.

### Ví dụ và số học

12.000.000 × 10,5% = 1.260.000đ bảo hiểm; 12.000.000 − 1.260.000 = 10.740.000đ. Số này thấp hơn mức giảm trừ bản thân nên thu nhập tính thuế trong ví dụ bằng 0.

#### Ghi nhớ

- Lập kế hoạch từ tiền thực nhận, không từ lương gộp.
- Phần bảo hiểm bắt buộc người lao động đóng thường là 10,5% lương làm căn cứ đóng.
- Thuế từ tiền lương chỉ phát sinh khi thu nhập sau bảo hiểm vượt các khoản giảm trừ.

#### Hiểu lầm thường gặp

Nghĩ rằng con số trong hợp đồng là số tiền sẽ về tài khoản mỗi tháng.

#### Tự kiểm tra — tình huống hư cấu

Minh có lương đóng bảo hiểm 16.000.000đ, không có người phụ thuộc và không có thu nhập khác. Tính khoản bảo hiểm 10,5% và tiền thực nhận.

#### Gợi ý giải từng bước

1. Bảo hiểm: 16.000.000 × 10,5% = 1.680.000đ.
2. Còn lại: 16.000.000 − 1.680.000 = 14.320.000đ.
3. Số 14.320.000đ thấp hơn mức giảm trừ bản thân 15.500.000đ nên chưa phát sinh thuế trong giả định này.

#### Kết luận

Khoản bảo hiểm là 1.680.000đ và tiền thực nhận là 14.320.000đ trong giả định của bài.

- `12000000*105/1000 = 1260000`
- `12000000-1260000 = 10740000`
- `16000000*105/1000 = 1680000`
- `16000000-1680000 = 14320000`

### Tình huống thực hành

**1. Nên lập ngân sách tháng dựa trên số nào?**

- A. Lương gộp trong hợp đồng — Lương gộp chưa trừ bảo hiểm và thuế nên lớn hơn số tiền bạn dùng được.
- B. Tiền thực nhận sau các khoản trừ — Đúng: đây là số tiền thực sự về tài khoản.
- C. Lương gộp cộng thưởng dự kiến — Thưởng chưa nhận là giả định, không nên tính như tiền đã có.
Đáp án: **B** (`correctIndex: 1`).

**2. Lương đóng bảo hiểm 10.000.000đ, phần người lao động 10,5%. Khoản trừ bảo hiểm là bao nhiêu?**

- A. 1.050.000đ — Đúng: 10.000.000 × 10,5% = 1.050.000đ.
- B. 105.000đ — Đây là 1,05%, sai một chữ số thập phân.
- C. 10.500.000đ — Số này lớn hơn cả tiền lương, không thể là khoản trừ.
Đáp án: **A** (`correctIndex: 0`).

**3. Phiếu lương ghi khoản trừ khác với phép tính của bạn. Nên làm gì?**

- A. Bỏ qua vì chênh lệch nhỏ — Chênh lệch có thể do căn cứ đóng hoặc khoản khác; cần hiểu lý do.
- B. Coi phép tính của mình luôn đúng — Lương làm căn cứ đóng có thể khác lương gộp.
- C. Hỏi bộ phận trả lương và đối chiếu lương làm căn cứ đóng — Đúng: hỏi đúng nơi và đối chiếu căn cứ trước khi kết luận.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Nếu có phiếu lương gần nhất, ghi tiền thực nhận làm thu nhập kế hoạch trong Picket. Không cần chụp hay tải phiếu lương lên. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Số liệu có nguồn và ngày

- Employee mandatory insurance share 10.5% = 8% social + 1.5% health + 1% unemployment — nguồn `bhxh-rates`, mốc 2025-09-08
- Personal PIT deduction 15,500,000 VND/month from tax period 2026 — nguồn `pit-deduction-2026`, mốc 2026-01-01

### Nguồn đã đọc

- [Nguồn tham khảo](https://hanoi.baohiemxahoi.gov.vn/UserControls/Publishing/News/BinhLuan/pFormPrint.aspx?UrlListProcess=/content/tintuc/Lists/News&ItemID=35560&IsTA=False)
- [Nguồn tham khảo](https://hcc.nghean.gov.vn/tin-tong-hop/nghi-quyet-110-2025-ubtvqh15-dieu-chinh-muc-giam-tru-gia-canh-cua-thue-thu-nhap-ca-nhan-2448.html)
- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.01 — Chương 01: Chuyển ví không phải chi thêm

**Năng lực:** cashflow.internal-transfer  
**Mục tiêu:** Phân biệt chuyển tiền giữa ví của mình với thu nhập và chi tiêu; nêu rõ phạm vi đang xem.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 397 đơn vị cách trắng trong thân bài

Một số dư có thể nằm ở nhiều nơi: tiền mặt, tài khoản ngân hàng hoặc ví điện tử. Chuyển tiền giữa những nơi bạn sở hữu làm thay đổi chỗ giữ tiền. Để biết mình đã tiêu bao nhiêu, hãy hỏi tiền có rời khỏi toàn bộ phạm vi đang theo dõi để thanh toán một khoản hay chưa. Tên nút chuyển khoản trong ứng dụng ngân hàng chưa đủ cho câu trả lời: chuyển cho cửa hàng là thanh toán, còn chuyển sang tài khoản khác của chính mình có thể là chuyển ví.

Ví dụ minh họa: Hòa có 600.000đ tiền mặt và 1.400.000đ trong ngân hàng. Hòa rút 200.000đ, không mất phí. Sau đó tiền mặt là 800.000đ, ngân hàng còn 1.200.000đ. Tổng trước và sau đều là 2.000.000đ. Nếu ghi lần rút này thành khoản chi rồi lại ghi các lần mua bằng tiền mặt, Hòa sẽ đếm chi tiêu hai lần. Nếu ngân hàng thu thêm 3.000đ phí rút tiền, chỉ 3.000đ phí là khoản chi trong ví dụ; 200.000đ vẫn chỉ đổi nơi giữ.

Phạm vi giúp giải thích điều tưởng như mâu thuẫn. Khi chỉ xem ngân hàng, đúng là có 200.000đ đi ra khỏi ví đó. Khi xem cả hai ví, số tiền này có một phía đi ra và một phía đi vào nên triệt tiêu nhau. Vì thế một báo cáo dòng tiền theo ví có thể khác báo cáo chi tiêu toàn bộ. Không cần chọn một báo cáo là sai; cần đọc nhãn và biết những ví nào đang được cộng. Ví ngoài phạm vi cũng cần được ghi chú rõ thay vì tự coi mọi khoản ra là mua sắm.

Trong Picket, hãy rà ví nguồn, ví đích, số tiền và phí trước khi xác nhận. Việc tạo mục tiêu tiết kiệm bằng nhãn cũng không tự làm tiền biến mất. Một giao dịch chuyển thực tế chỉ nên được ghi một lần theo hai phía liên kết. Nếu lỡ nhập thành thu và chi riêng, hãy kiểm tra trước khi sửa để không xóa khoản mua thật cùng ngày. Bạn có thể học hoàn toàn bằng số liệu minh họa; không cần rút hoặc chuyển tiền thật để chứng minh đã hiểu. Điều cần nhớ là cùng một số tiền có thể đổi vị trí mà tổng tiền không tăng hoặc giảm.

### Ví dụ và số học

600.000 + 1.400.000 = 2.000.000; sau chuyển: 800.000 + 1.200.000 = 2.000.000. Phí 3.000 nếu có làm tổng còn 1.997.000.

#### Ghi nhớ

- Xác định những ví nào đang nằm trong phạm vi báo cáo trước khi cộng số dư.
- Chuyển giữa hai ví của chính mình chỉ đổi nơi giữ tiền; phí phải được ghi riêng.
- Đối chiếu đủ hai phía để tránh ghi một lần rút tiền thành hai khoản chi.

#### Hiểu lầm thường gặp

Thấy tiền ra khỏi ngân hàng rồi kết luận toàn bộ số đó đã được tiêu.

#### Tự kiểm tra — tình huống hư cấu

An có 900.000đ ở ngân hàng và 100.000đ tiền mặt. An rút 150.000đ; ngân hàng thu thêm 5.000đ phí. Tính số dư mỗi ví, tổng tiền và khoản chi thực sự.

#### Gợi ý giải từng bước

1. Ngân hàng còn 900.000 − 150.000 − 5.000 = 745.000đ.
2. Tiền mặt tăng thành 100.000 + 150.000 = 250.000đ.
3. Tổng còn 995.000đ; chỉ 5.000đ phí rời khỏi phạm vi hai ví.

#### Kết luận

Khoản chuyển là 150.000đ; khoản chi là 5.000đ. Không ghi 155.000đ thành chi tiêu toàn bộ.

- `600000+1400000 = 2000000`
- `600000+200000 = 800000`
- `1400000-200000 = 1200000`
- `2000000-3000 = 1997000`
- `900000-150000-5000 = 745000`
- `100000+150000 = 250000`
- `745000+250000 = 995000`

### Tình huống thực hành

**1. Rút 200.000đ không phí từ ngân hàng sang tiền mặt của mình. Chi tiêu toàn bộ tăng bao nhiêu?**

- A. 200.000đ — Đây là số tiền đổi chỗ, chưa phải mua hàng.
- B. 0đ — Đúng: tổng hai ví không giảm.
- C. 400.000đ — Cộng hai phía làm đếm cùng số tiền hai lần.
Đáp án: **B** (`correctIndex: 1`).

**2. Chỉ xem ví ngân hàng trong ví dụ, 200.000đ có phải tiền ra khỏi phạm vi đó?**

- A. Không, vì chuyển ví luôn bằng không — Quy tắc tổng bằng không chỉ áp dụng khi có đủ hai phía trong phạm vi.
- B. Có, nhưng chưa phải chi tiêu toàn bộ — Đúng: ví ngân hàng giảm, ví tiền mặt tăng.
- C. Là thu nhập mới — Ngân hàng giảm nên không có thu nhập mới.
Đáp án: **B** (`correctIndex: 1`).

**3. Rút 200.000đ và trả thêm phí 3.000đ. Khoản chi do thao tác này là?**

- A. 203.000đ — 203.000đ là tiền ra khỏi ngân hàng, gồm cả phần chuyển sang tiền mặt.
- B. 200.000đ — 200.000đ vẫn thuộc sở hữu của bạn.
- C. 3.000đ — Đúng: phí là phần rời tổng tài sản trong tình huống.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Xem một giao dịch chuyển ví có sẵn hoặc giải lại ví dụ, không chuyển tiền thật. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/01/financial-competence-framework-for-adults-in-the-european-union_614b8b97/510f133c-en.pdf)

## picket.vi.financial.v1.02 — Chương 01: Ghi đúng trước khi phân loại

**Năng lực:** cashflow.confirmed-records  
**Mục tiêu:** Kiểm tra số tiền và dấu thu/chi, tránh bản ghi trùng và phân biệt dữ liệu thiếu với chi bằng không.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 416 đơn vị cách trắng trong thân bài

Một danh sách giao dịch hữu ích cần phản ánh những gì thực sự xảy ra. Bắt đầu bằng ngày, số tiền, ví và loại thu hoặc chi. Danh mục giúp tìm lại và so sánh, nhưng một tên danh mục rất đẹp không sửa được số tiền bị nhập sai. Khi quét hóa đơn, hãy coi kết quả là bản nháp cần đối chiếu. Máy có thể đọc nhầm dấu chấm, dòng tổng hoặc tiền khách đưa. Ảnh phong cảnh không phải bằng chứng cho một giao dịch; không nên đoán số tiền từ ảnh đó.

Mai có ba khoản chi đã kiểm tra: ăn trưa 45.000đ, đi xe 25.000đ và mua vở 30.000đ. Tổng là 100.000đ. Mai lưu ảnh hóa đơn bữa trưa vào chính giao dịch đó; tổng vẫn là 100.000đ, không tăng thành 145.000đ. Nếu ứng dụng tải ảnh chậm, trạng thái ảnh đang xử lý khác với trạng thái giao dịch đã lưu. Khi quay lại, cần xem bản ghi nào đã có trước khi nhấn lưu thêm lần nữa. Một ảnh đính kèm và một khoản chi là hai loại thông tin, không phải hai khoản tiền.

Phân loại nên phục vụ câu hỏi của bạn. Vở dùng đi học có thể thuộc học tập; cùng món vở mua tặng người khác có thể thuộc quà tặng. Đừng chỉ dựa vào tên cửa hàng để kết luận mục đích. Có thể để khoản chưa rõ vào nhóm cần xem lại, rồi bổ sung sau khi nhớ được bối cảnh. Khi nhiều người trả chung, chỉ ghi phần của mình hoặc dùng quy tắc chia khoản nhất quán; tránh lúc ghi cả hóa đơn, lúc ghi phần cá nhân mà không ghi chú.

Cuối một khoảng thời gian, hãy so danh sách với số dư hoặc chứng từ bạn còn giữ. Nếu quên ghi hai ngày, hãy đánh dấu thiếu thông tin thay vì nói hai ngày đó chi bằng không. Một khoản chênh chưa giải thích không tự trở thành thu nhập. Có thể dừng ở mức biết rằng dữ liệu chưa đầy đủ, rồi rà thêm khi thuận tiện. Trong Picket, chỉ dùng khoản đã xác nhận cho bài học lấy dữ liệu thật; bạn có thể chọn ví dụ minh họa nếu không muốn sử dụng thông tin cá nhân. Mục tiêu của ghi chép là làm quyết định rõ hơn, không phải tạo một bảng hoàn hảo hay bắt bạn nhớ mọi chi tiết ngay từ đầu.

### Ví dụ và số học

45.000 + 25.000 + 30.000 = 100.000đ; ảnh bữa trưa đính kèm không tạo khoản chi 45.000đ thứ hai.

#### Ghi nhớ

- Ghi số tiền, ngày, ví và loại giao dịch trước khi cân nhắc danh mục.
- Ảnh hóa đơn đính kèm không phải một khoản chi mới.
- Ngày chưa ghi đủ cần được nhận diện là thiếu dữ liệu, không tự đổi thành chi bằng không.

#### Hiểu lầm thường gặp

Quét lại ảnh hoặc tải lại màn hình là lý do để tạo thêm một giao dịch giống hệt.

#### Tự kiểm tra — tình huống hư cấu

Bình đã ghi bữa trưa 40.000đ và tiền xe 30.000đ. Bình quét lại hóa đơn bữa trưa và thấy một bản nháp 40.000đ. Tổng chi thực tế là bao nhiêu, và nên kiểm tra gì trước khi lưu?

#### Gợi ý giải từng bước

1. Cộng hai khoản đã xảy ra: 40.000 + 30.000 = 70.000đ.
2. Đối chiếu ngày, số tiền và ví của bản nháp với giao dịch bữa trưa đã có.
3. Nếu cùng một lần thanh toán, không lưu thêm bản ghi; nếu là hai lần mua thật thì cần bằng chứng phân biệt.

#### Kết luận

Tổng theo dữ kiện là 70.000đ. Không tự nâng thành 110.000đ chỉ vì có thêm một ảnh hoặc bản nháp.

- `45000+25000+30000 = 100000`
- `100000+45000 = 145000`
- `40000+30000 = 70000`
- `70000+40000 = 110000`

### Tình huống thực hành

**1. Mai thêm ảnh vào giao dịch ăn trưa đã lưu. Tổng ba khoản nên là?**

- A. 100.000đ — Đúng: đính kèm không tạo thêm chi tiêu.
- B. 145.000đ — Bạn đã cộng trùng bữa trưa.
- C. 55.000đ — Bạn đã bỏ một khoản chi thực tế.
Đáp án: **A** (`correctIndex: 0`).

**2. Không có bản ghi vào thứ Ba vì quên nhập. Kết luận phù hợp?**

- A. Chắc chắn không chi — Thiếu bản ghi không chứng minh không phát sinh.
- B. Chưa biết có chi hay không — Đúng: cần giữ trạng thái chưa đủ dữ liệu.
- C. Dùng mức cao nhất của tháng làm số thật — Ước lượng không được biến thành giao dịch đã xảy ra.
Đáp án: **B** (`correctIndex: 1`).

**3. OCR đọc tổng 450.000đ nhưng hóa đơn ghi 45.000đ. Làm gì?**

- A. Giữ số máy đọc vì máy khách quan — OCR vẫn có thể nhận sai ký tự.
- B. Lưu cả hai số thành hai khoản — Một lần mua không tạo ra hai khoản chỉ vì hai cách đọc.
- C. Đối chiếu và sửa bản nháp trước khi xác nhận — Đúng: số trên bản nháp phải được kiểm tra.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Rà một giao dịch hoặc ví dụ về ngày, ví, số tiền và khả năng nhập trùng. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_spending_tracker_2018-11_ADA.pdf)

## picket.vi.financial.v1.14 — Chương 07: Chi cố định, chi biến đổi và khoản theo năm

**Năng lực:** budgeting.fixed-variable-annual  
**Mục tiêu:** Chia chi tiêu thành ba nhóm và quy khoản theo năm về mức dành mỗi tháng.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 197 đơn vị cách trắng trong thân bài

Không phải khoản chi nào cũng giống nhau. Chi cố định gần như không đổi mỗi tháng, như tiền phòng hay internet. Chi biến đổi lên xuống theo cách bạn sống, như ăn uống và đi lại. Khoản theo năm chỉ đến một hoặc vài lần mỗi năm, như học phí, phí gia hạn hay quà Tết. Khoản theo năm hay bị quên, rồi xuất hiện như một cú sốc dù năm nào cũng có.

Ví dụ hư cấu: Tú trả tiền phòng 3.000.000đ và internet 220.000đ. Chi cố định là 3.220.000đ. Ăn uống trung bình 2.500.000đ. Mỗi năm Tú có phí khóa học 1.200.000đ và quà Tết dự kiến 2.400.000đ, tổng 3.600.000đ. Chia cho 12 tháng, Tú cần dành 300.000đ mỗi tháng. Kế hoạch tháng là 3.220.000 + 2.500.000 + 300.000 = 6.020.000đ.

Chi biến đổi nên dùng số trung bình từ giao dịch thật, không phải con số mong muốn. Khoản theo năm có thể chưa biết chính xác; hãy ghi là ước tính và sửa khi có giá thật.

Khi tháng có khoản lớn đến, tiền đã có sẵn trong túi dành dần. Tháng đó không cần vay hay cắt nhu cầu thiết yếu.

### Ví dụ và số học

Cố định: 3.000.000 + 220.000 = 3.220.000đ. Theo năm: 1.200.000 + 2.400.000 = 3.600.000đ; 3.600.000 / 12 = 300.000đ/tháng. Kế hoạch: 3.220.000 + 2.500.000 + 300.000 = 6.020.000đ.

#### Ghi nhớ

- Chi cố định ít đổi, chi biến đổi lên xuống, khoản theo năm đến thưa nhưng lặp lại.
- Chia khoản theo năm cho số tháng còn lại để biết mức dành mỗi tháng.
- Dùng số trung bình từ giao dịch thật cho chi biến đổi.

#### Hiểu lầm thường gặp

Coi học phí hay quà Tết là chi phí bất ngờ chỉ vì không đến mỗi tháng.

#### Tự kiểm tra — tình huống hư cấu

Học phí ngoại ngữ 2.400.000đ đến hạn sau 6 tháng. Phí thành viên phòng tập 900.000đ đến hạn sau 3 tháng. Mỗi tháng cần dành bao nhiêu cho cả hai?

#### Gợi ý giải từng bước

1. Học phí: 2.400.000 / 6 = 400.000đ mỗi tháng.
2. Phòng tập: 900.000 / 3 = 300.000đ mỗi tháng.
3. Cộng lại: 400.000 + 300.000 = 700.000đ mỗi tháng trong 3 tháng đầu.

#### Kết luận

Ba tháng đầu cần dành 700.000đ mỗi tháng; sau khi trả phí phòng tập, chỉ còn 400.000đ cho học phí.

- `3000000+220000 = 3220000`
- `1200000+2400000 = 3600000`
- `3600000/12 = 300000`
- `3220000+2500000+300000 = 6020000`
- `2400000/6 = 400000`
- `900000/3 = 300000`
- `400000+300000 = 700000`

### Tình huống thực hành

**1. Tiền điện mỗi tháng dao động 300.000–500.000đ. Khoản này thuộc nhóm nào?**

- A. Cố định tuyệt đối — Số tiền thay đổi mỗi tháng nên không cố định tuyệt đối.
- B. Định kỳ nhưng biến đổi — Đúng: đến hằng tháng nhưng số tiền thay đổi.
- C. Khoản theo năm — Khoản này đến mỗi tháng, không phải mỗi năm.
Đáp án: **B** (`correctIndex: 1`).

**2. Một khoản 1.800.000đ đến hạn mỗi năm. Dành đều trong 12 tháng thì mỗi tháng là bao nhiêu?**

- A. 150.000đ — Đúng: 1.800.000 / 12 = 150.000đ.
- B. 180.000đ — Đây là chia cho 10, không phải 12.
- C. 1.800.000đ — Đây là cả khoản năm, không phải phần mỗi tháng.
Đáp án: **A** (`correctIndex: 0`).

**3. Tháng có Tết, chi tăng mạnh. Cách ghi nhận phù hợp là gì?**

- A. Coi là bất ngờ dù năm nào cũng có — Khoản lặp lại hằng năm có thể dự kiến được.
- B. Bỏ ra khỏi sổ để tháng trông gọn — Bỏ khỏi sổ làm số liệu sai.
- C. Đưa vào kế hoạch năm và dành dần từ trước — Đúng: biết trước thì dành dần trước.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Trong Picket, thêm một khoản theo năm vào mục Hóa đơn với ngày đến hạn, rồi tạo một túi ngân sách nhỏ cho phần dành mỗi tháng. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_spending_tracker_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_bill_calendar_tool_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.03 — Chương 02: Nhu cầu và mong muốn cần bối cảnh

**Năng lực:** planning.contextual-priorities  
**Mục tiêu:** Giải thích một ưu tiên bằng hoàn cảnh, thời điểm và phương án thay thế, không phán xét từ tên món hàng.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 418 đơn vị cách trắng trong thân bài

Nhu cầu thường liên quan đến sinh hoạt, sức khỏe, học tập hoặc trách nhiệm bạn phải đáp ứng. Mong muốn thường có phần lựa chọn linh hoạt hơn. Ranh giới này phụ thuộc hoàn cảnh chứ không nằm cố định trong tên món hàng. Internet có thể phục vụ học trực tuyến hoặc chỉ một dịch vụ giải trí bổ sung. Một chuyến xe công nghệ có thể giúp người đang chấn thương đến nơi an toàn. Vì vậy bài học không gán nhãn con người tốt hay xấu từ khoản chi, cũng không yêu cầu cắt mọi niềm vui.

Hãy thử ba câu hỏi: nếu hoãn thì hậu quả gì, cần đáp ứng trước ngày nào, có cách khác phù hợp không? Phương án rẻ hơn chỉ là lựa chọn khi thực tế đáp ứng được nhu cầu. Đi bộ không luôn thay được phương tiện trong đêm mưa hoặc khi đường không an toàn. Mua gói rẻ hơn cũng không hữu ích nếu thiếu chức năng bạn cần cho công việc. Một khoản có thể gồm phần thiết yếu và phần nâng cấp; bạn được quyền giải thích cách tách thay vì phải chọn một nhãn cho toàn bộ.

Trong tình huống giả lập, Phương còn 1.500.000đ trước kỳ thu nhập. Phương dự kiến dành 900.000đ cho tiền ở và 400.000đ cho thực phẩm. Sau hai khoản, còn 200.000đ. Tai nghe mới giá 350.000đ sẽ vượt phần còn lại 150.000đ nếu không có thay đổi khác. Phép tính không nói Phương là người thiếu kỷ luật; nó cho thấy cần hoãn, đổi phương án hoặc xác nhận thêm nguồn tiền. Nếu tai nghe cũ hỏng và công việc cần dùng ngay, bối cảnh thay đổi nhưng phép tính vẫn phải được giải quyết.

Bạn có thể đặt một khoản linh hoạt cho sở thích theo khả năng riêng. Không có một tỷ lệ ngân sách duy nhất phù hợp mọi người. Người đang phải hỗ trợ gia đình hoặc có chi phí sức khỏe cao có thể có ít lựa chọn hơn; gọi đó là yếu kém không giúp tạo tiền. Trong Picket, nhãn ưu tiên chỉ hỗ trợ suy nghĩ, không khóa lưu giao dịch và không tự quyết định thay bạn. Khi chưa rõ hoàn cảnh, câu trả lời tốt là hỏi thêm. Hãy thử ghi một câu lý do ngắn cho lựa chọn của mình; bạn có thể thay đổi lý do khi trách nhiệm, sức khỏe hoặc thời điểm thay đổi.

### Ví dụ và số học

1.500.000 − 900.000 − 400.000 = 200.000đ; 350.000 − 200.000 = 150.000đ còn thiếu cho lựa chọn này.

#### Ghi nhớ

- Phân loại nhu cầu và mong muốn theo mục đích, hoàn cảnh và thời điểm.
- Một món đồ có thể phục vụ nhiều mục đích; tên cửa hàng chưa đủ để kết luận.
- So lựa chọn với số tiền và ưu tiên của tình huống, không dùng danh mục để đánh giá con người.

#### Hiểu lầm thường gặp

Cho rằng một loại hàng luôn là mong muốn với tất cả mọi người.

#### Tự kiểm tra — tình huống hư cấu

Chi có 150.000đ. Gói kết nối 100.000đ cần cho bài thi trực tuyến ngày mai; gói giải trí 60.000đ có thể mua tuần sau. Hãy lập một phương án trong số tiền hiện có và giải thích bằng bối cảnh.

#### Gợi ý giải từng bước

1. Trong tình huống này, kết nối cho bài thi có thời hạn cụ thể và khó trì hoãn.
2. Sau gói kết nối, Chi còn 150.000 − 100.000 = 50.000đ.
3. Mua cả hai cần 160.000đ, vượt 10.000đ; có thể hoãn gói giải trí thay vì giả định có thêm thu nhập.

#### Kết luận

Một phương án phù hợp dữ kiện là mua gói cần cho bài thi và hoãn gói giải trí. Đây không phải quy tắc cấm giải trí cho mọi người.

- `1500000-900000-400000 = 200000`
- `350000-200000 = 150000`
- `150000-100000 = 50000`
- `100000+60000 = 160000`
- `160000-150000 = 10000`

### Tình huống thực hành

**1. Thấy giao dịch xe công nghệ, có đủ để kết luận đây là mong muốn không?**

- A. Có, xe công nghệ luôn không cần thiết — Nhãn cố định bỏ qua sức khỏe và hoàn cảnh.
- B. Không, cần biết bối cảnh và phương án an toàn — Đúng: cùng dịch vụ có mục đích khác nhau.
- C. Có, vì giá cao hơn xe buýt — Giá thấp không đảm bảo phương án thay thế phù hợp.
Đáp án: **B** (`correctIndex: 1`).

**2. Phương giữ nguyên hai khoản đã dự kiến. Mua tai nghe 350.000đ thì thiếu bao nhiêu?**

- A. 150.000đ — Đúng: giá 350.000đ trừ phần còn 200.000đ.
- B. 200.000đ — 200.000đ là phần còn trước mua.
- C. 350.000đ — Đã có 200.000đ, không thiếu toàn bộ giá.
Đáp án: **A** (`correctIndex: 0`).

**3. Tai nghe hỏng, cần cho công việc. Điều nào hợp lý nhất?**

- A. Nhãn nhu cầu tự tạo thêm tiền — Nhãn không thay đổi số dư.
- B. Bỏ qua mọi khoản tới hạn — Hậu quả của nghĩa vụ vẫn tồn tại.
- C. Đánh giá phương án đáp ứng công việc và tính lại phần thiếu — Đúng: bối cảnh và khả năng chi trả đều cần được xem.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Chọn một ví dụ hoặc khoản có sẵn, viết lý do có thể hoãn hay cần ưu tiên. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_prioritizing-bills_tool.pdf)

## picket.vi.financial.v1.15 — Chương 07: Chia tiền vào túi: mỗi đồng có một việc

**Năng lực:** budgeting.pocket-allocation  
**Mục tiêu:** Phân bổ toàn bộ tiền thực nhận vào các túi và điều chỉnh giữa các túi mà không làm sai tổng.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 206 đơn vị cách trắng trong thân bài

Ngân sách theo túi bắt đầu bằng một câu hỏi: tiền tháng này sẽ làm những việc gì? Bạn chia tiền thực nhận vào từng túi như nhà ở, ăn uống, đi lại, hóa đơn, dự phòng và khoản theo năm. Khi tổng các túi bằng tiền thực nhận, mỗi đồng đã có một việc. Phần chưa giao việc dễ bị tiêu mà không ai để ý.

Ví dụ hư cấu: Hưng thực nhận 10.000.000đ. Hưng chia nhà ở 3.500.000đ, ăn uống 2.800.000đ, đi lại 700.000đ, hóa đơn 600.000đ, dự phòng 1.000.000đ và khoản theo năm 300.000đ. Tổng là 8.900.000đ. Còn 1.100.000đ chưa có việc, nên Hưng đặt vào túi linh hoạt. Giữa tháng, ăn uống vượt 400.000đ. Hưng chuyển 400.000đ từ túi linh hoạt sang túi ăn uống. Túi linh hoạt còn 700.000đ. Tổng tiền không đổi; chỉ kế hoạch được sửa có chủ ý.

Không có một tỷ lệ chia túi đúng cho mọi người. Người nuôi con, người trả nợ hay người có thu nhập không đều sẽ cần cách chia khác. Điều quan trọng là tổng các túi không vượt số tiền thật sự có.

Chuyển giữa các túi không phải thất bại. Đó là cách kế hoạch theo kịp cuộc sống.

### Ví dụ và số học

Tổng túi: 3.500.000 + 2.800.000 + 700.000 + 600.000 + 1.000.000 + 300.000 = 8.900.000đ. Chưa giao việc: 10.000.000 − 8.900.000 = 1.100.000đ. Sau khi chuyển: 1.100.000 − 400.000 = 700.000đ.

#### Ghi nhớ

- Chia toàn bộ tiền thực nhận vào túi để không còn phần trôi nổi.
- Chuyển giữa các túi giữ nguyên tổng tiền.
- Tỷ lệ chia phụ thuộc hoàn cảnh riêng.

#### Hiểu lầm thường gặp

Nghĩ rằng chuyển tiền giữa các túi nghĩa là ngân sách đã hỏng.

#### Tự kiểm tra — tình huống hư cấu

Thực nhận 9.000.000đ. Đã chia nhà ở 3.000.000đ, ăn uống 2.500.000đ, đi lại 800.000đ, dự phòng 700.000đ. Phần còn lại được chia 1.200.000đ cho mục tiêu học và phần còn lại cho túi linh hoạt. Kiểm tra phần chưa giao việc.

#### Gợi ý giải từng bước

1. Đã chia: 3.000.000 + 2.500.000 + 800.000 + 700.000 = 7.000.000đ.
2. Còn: 9.000.000 − 7.000.000 = 2.000.000đ.
3. Sau khi chia: 2.000.000 − 1.200.000 − 800.000 = 0đ.

#### Kết luận

Túi linh hoạt nhận 800.000đ và phần chưa giao việc bằng 0đ.

- `3500000+2800000+700000+600000+1000000+300000 = 8900000`
- `10000000-8900000 = 1100000`
- `1100000-400000 = 700000`
- `3000000+2500000+800000+700000 = 7000000`
- `9000000-7000000 = 2000000`
- `2000000-1200000-800000 = 0`

### Tình huống thực hành

**1. Thực nhận 8.000.000đ, đã chia 7.400.000đ vào các túi. Phần chưa giao việc là bao nhiêu?**

- A. 600.000đ — Đúng: 8.000.000 − 7.400.000 = 600.000đ.
- B. 7.400.000đ — Đây là phần đã chia, không phải phần còn lại.
- C. 0đ — Vẫn còn tiền chưa có túi.
Đáp án: **A** (`correctIndex: 0`).

**2. Túi ăn uống vượt 200.000đ. Cách xử lý nhất quán là gì?**

- A. Xóa giao dịch vượt cho khớp — Xóa giao dịch thật làm sổ sai.
- B. Chuyển 200.000đ từ một túi linh hoạt và ghi lý do — Đúng: tổng giữ nguyên, kế hoạch được sửa có chủ ý.
- C. Tăng thu nhập trên giấy — Thu nhập không tăng chỉ vì sửa con số.
Đáp án: **B** (`correctIndex: 1`).

**3. Có một tỷ lệ chia túi bắt buộc cho mọi người không?**

- A. Có, ai cũng phải theo cùng tỷ lệ — Hoàn cảnh mỗi người khác nhau.
- B. Không, cách chia tùy hoàn cảnh; tổng các túi phải khớp tiền thực có — Đúng: điều kiện cốt lõi là tổng các túi không vượt tiền thật.
- C. Có, nếu ứng dụng gợi ý — Gợi ý chỉ là điểm bắt đầu, không phải quy định.
Đáp án: **B** (`correctIndex: 1`).

### Hành động tự chọn

Mở các túi ngân sách trong Picket và kiểm tra tổng hạn mức có vượt tiền thực nhận dự kiến không. Có thể chỉ xem mà không sửa. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_spending_tracker_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/01/financial-competence-framework-for-adults-in-the-european-union_614b8b97/510f133c-en.pdf)

## picket.vi.financial.v1.04 — Chương 02: Lập kế hoạch theo ngày tiền về

**Năng lực:** planning.irregular-income  
**Mục tiêu:** Lập lịch thu chi có xét ngày đến hạn và tách khoản thu chưa chắc chắn.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 414 đơn vị cách trắng trong thân bài

Tổng thu nhập trong tháng không kể hết câu chuyện. Một khoản tiền đến sau ngày trả tiền nhà không giúp thanh toán đúng hạn vào hôm trước. Người làm tự do, bán hàng nhỏ hoặc nhận tiền hỗ trợ theo đợt có thể cần lập kế hoạch theo từng kỳ tiền về. Hãy bắt đầu từ số tiền hiện có, rồi thêm những khoản thu đã xác nhận ngày và số tiền. Các khoản mới được hứa hoặc phụ thuộc công việc chưa hoàn tất nên để riêng như giả định, không coi đã nằm trong ví.

Nam có 1.200.000đ đầu tuần. Ngày thứ tư phải trả 800.000đ tiền phòng, ngày thứ sáu dự kiến cần 300.000đ cho thực phẩm. Một khách hàng hứa trả 1.000.000đ vào chủ nhật nhưng chưa xác nhận. Trước khoản thu đó, Nam chỉ còn 100.000đ sau hai khoản chi. Nếu phát sinh thêm chi phí 200.000đ vào thứ bảy thì thiếu 100.000đ trong kịch bản không nhận thêm tiền. Đưa khoản hứa trả vào đầu tuần sẽ che mất khoảng thiếu này dù tổng cuối tuần trông có vẻ dư.

Ngân sách trong hoàn cảnh đó có thể gồm phần chắc chắn và phần tùy tiền thực nhận. Đừng tự chia thu nhập tốt nhất năm cho các tuần rồi coi tuần nào cũng có mức đó. Có thể nhìn nhiều kỳ để nhận ra biến động, nhưng số trung bình không phải lời bảo đảm. Khi tiền về ít hơn dự kiến, hãy rà các khoản linh hoạt và chủ động hỏi bên nhận thanh toán về lựa chọn có thật. Không tự coi việc dời hạn là đã được đồng ý; cũng không bỏ nhu cầu ăn uống hoặc sức khỏe chỉ để làm bảng cân đối đẹp.

Trong Picket, xem lịch các ngày trước kỳ thu nhập tiếp theo giúp bạn đặt hạn mức phù hợp hơn một nhãn tháng chung chung. Hóa đơn đã trả phải được đánh dấu và đối chiếu để không trừ lần nữa. Nếu cần sửa kế hoạch, sửa giả định của tương lai; giao dịch đã xảy ra vẫn giữ đúng ngày thực tế. Bạn không cần tiết lộ mức lương để học bài này: có thể dùng ví dụ của Nam. Kết quả tốt là biết ngày nào cần chú ý, khoản nào chắc chắn và câu hỏi nào phải xác minh, chứ không phải buộc thu nhập thất thường trở nên đều đặn trên màn hình.

### Ví dụ và số học

1.200.000 − 800.000 − 300.000 = 100.000đ; thêm chi 200.000đ trước tiền về tạo mức −100.000đ.

#### Ghi nhớ

- Xếp khoản thu và khoản phải trả theo ngày, không chỉ nhìn tổng tháng.
- Tiền dự kiến về sau ngày đến hạn chưa giải quyết được thiếu hụt trước hạn.
- Chỉ sửa lịch thật khi thay đổi ngoài ứng dụng đã được xác nhận.

#### Hiểu lầm thường gặp

Tháng kết thúc còn dư thì mọi ngày trong tháng đều có đủ tiền thanh toán.

#### Tự kiểm tra — tình huống hư cấu

Dũng có 150.000đ ngày 5. Hóa đơn 200.000đ đến hạn ngày 7; thu nhập 500.000đ dự kiến về ngày 10. Nếu chưa có khoản nào khác, ngày nào thiếu và còn điều gì phải xác minh?

#### Gợi ý giải từng bước

1. Trước thu nhập, 150.000 − 200.000 = −50.000đ vào ngày 7.
2. Nếu khoản thu đến đúng ngày 10, phép tính sau đó là −50.000 + 500.000 = 450.000đ.
3. Số cuối kỳ dương không xóa khoảng thiếu trước hạn; cần kiểm ngày nhận tiền và phương án xử lý thực sự với bên liên quan.

#### Kết luận

Thiếu 50.000đ ở thời điểm ngày 7. Lịch trong Picket chỉ giúp nhìn ra vấn đề, không tự dời hạn hoặc tạo thêm tiền.

- `1200000-800000-300000 = 100000`
- `100000-200000 = -100000`
- `150000-200000 = -50000`
- `-50000+500000 = 450000`

### Tình huống thực hành

**1. Khách chưa xác nhận trả 1.000.000đ chủ nhật. Nên biểu diễn thế nào?**

- A. Tiền mặt đã có từ thứ hai — Ngày và độ chắc chắn bị thay đổi sai.
- B. Khoản thu giả định, tách khỏi số dư thực — Đúng: có thể so kịch bản nhận và chưa nhận.
- C. Thu nhập chắc chắn mỗi tuần — Một lời hứa không chứng minh lịch lặp lại.
Đáp án: **B** (`correctIndex: 1`).

**2. Trước chủ nhật, Nam chi thêm 200.000đ sau hai nghĩa vụ. Số dư kịch bản là?**

- A. 900.000đ — Con số này giả định tiền khách đã về.
- B. 100.000đ — 100.000đ là trước chi bổ sung.
- C. Âm 100.000đ — Đúng: 100.000đ trừ 200.000đ.
Đáp án: **C** (`correctIndex: 2`).

**3. Tháng có tổng thu lớn hơn tổng chi nhưng vẫn hụt giữa tháng. Vì sao?**

- A. Ngày thu có thể sau ngày cần trả — Đúng: lịch dòng tiền quan trọng bên cạnh tổng kỳ.
- B. Phép cộng không áp dụng được cho tiền — Phép cộng vẫn đúng, cần thêm trục thời gian.
- C. Chỉ cần đổi danh mục là đủ tiền — Đổi nhãn không tạo tiền.
Đáp án: **A** (`correctIndex: 0`).

### Hành động tự chọn

Xem hoặc viết lịch ba khoản tới hạn và khoản thu tiếp theo bằng dữ liệu minh họa. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_income_benefits_tool_2018-11_ADA.pdf)

# Giai đoạn 2: Ổn định

Đặt mục tiêu, dựng quỹ dự phòng, đọc số dư và hiểu thuế từ tiền lương.

## picket.vi.financial.v1.16 — Chương 08: Viết mục tiêu rõ ràng và xếp thứ tự

**Năng lực:** goals.specific-and-prioritised  
**Mục tiêu:** Viết mục tiêu có số tiền, thời hạn và cách theo dõi; xếp thứ tự khi tiền không đủ cho tất cả.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 196 đơn vị cách trắng trong thân bài

"Tiết kiệm nhiều hơn" là một mong muốn. Một mục tiêu rõ hơn trả lời được: bao nhiêu tiền, để làm gì, đến khi nào và theo dõi bằng cách nào. Mục tiêu cũng cần thực tế với thu nhập hiện tại. Nếu không, bạn dễ bỏ cuộc sau vài tuần.

Khi có nhiều mục tiêu, hãy xếp thứ tự. Nhiều người đặt trước một khoản dự phòng nhỏ và việc trả đúng hạn các hóa đơn thiết yếu. Sau đó mới đến các món mua lớn tùy chọn. Đây là cách sắp xếp phổ biến, không phải quy tắc bắt buộc.

Ví dụ hư cấu: Ngọc dư 1.500.000đ mỗi tháng. Ngọc muốn có 6.000.000đ dự phòng và 9.000.000đ mua máy tính, cả hai trong 12 tháng. Dự phòng cần 6.000.000 / 12 = 500.000đ mỗi tháng. Máy tính cần 9.000.000 / 12 = 750.000đ mỗi tháng. Tổng là 1.250.000đ. Ngọc còn 250.000đ cho việc khác. Nếu số dư hằng tháng giảm, Ngọc giữ phần dự phòng trước và dời hạn mục tiêu máy tính.

Viết mục tiêu ra giúp bạn thấy xung đột sớm. Sửa thời hạn khi hoàn cảnh đổi là điều bình thường.

### Ví dụ và số học

6.000.000 / 12 = 500.000đ; 9.000.000 / 12 = 750.000đ; 500.000 + 750.000 = 1.250.000đ; 1.500.000 − 1.250.000 = 250.000đ còn lại.

#### Ghi nhớ

- Mục tiêu rõ có số tiền, mục đích, thời hạn và cách theo dõi.
- Cộng mức góp của mọi mục tiêu để thấy xung đột.
- Khi thiếu tiền, dời hạn hoặc giảm mục tiêu thay vì vay thêm.

#### Hiểu lầm thường gặp

Nghĩ rằng đổi thời hạn mục tiêu nghĩa là đã thất bại.

#### Tự kiểm tra — tình huống hư cấu

Mục tiêu 4.800.000đ trong 8 tháng. Mỗi tháng cần bao nhiêu? Nếu chỉ dành được 400.000đ mỗi tháng thì cần mấy tháng?

#### Gợi ý giải từng bước

1. Mức góp theo kế hoạch: 4.800.000 / 8 = 600.000đ mỗi tháng.
2. Với 400.000đ mỗi tháng: 4.800.000 / 400.000 = 12 tháng.
3. Thời hạn đổi từ 8 lên 12 tháng; số tiền mục tiêu giữ nguyên.

#### Kết luận

Cần 600.000đ mỗi tháng trong 8 tháng, hoặc 12 tháng nếu chỉ góp 400.000đ.

- `6000000/12 = 500000`
- `9000000/12 = 750000`
- `500000+750000 = 1250000`
- `1500000-1250000 = 250000`
- `4800000/8 = 600000`
- `4800000/400000 = 12`

### Tình huống thực hành

**1. Mục tiêu nào rõ ràng nhất?**

- A. Tiết kiệm nhiều hơn — Không có số tiền hay thời hạn.
- B. Dành 3.000.000đ cho khóa học trong 10 tháng, xem lại mỗi tháng — Đúng: có số tiền, mục đích, thời hạn và cách theo dõi.
- C. Sau này mua một món gì đó — Không đo được tiến độ.
Đáp án: **B** (`correctIndex: 1`).

**2. Hai mục tiêu cần 400.000đ và 700.000đ mỗi tháng; bạn dư 900.000đ. Điều nào đúng?**

- A. Đủ cho cả hai — 400.000 + 700.000 = 1.100.000đ, lớn hơn 900.000đ.
- B. Thiếu 200.000đ, cần dời hạn hoặc giảm một mục tiêu — Đúng: 1.100.000 − 900.000 = 200.000đ.
- C. Thiếu 1.100.000đ — 1.100.000đ là tổng cần, không phải phần thiếu.
Đáp án: **B** (`correctIndex: 1`).

**3. Trước một món mua lớn tùy chọn, ưu tiên nào thường hợp lý?**

- A. Một khoản dự phòng nhỏ và trả đúng hạn hóa đơn thiết yếu — Đúng: giảm rủi ro trễ hạn và có đệm cho việc bất ngờ.
- B. Món mua lớn vì giá có thể tăng — Giá có thể tăng không làm món đó thành thiết yếu.
- C. Vay thêm để làm cả hai cùng lúc — Vay thêm tạo nghĩa vụ mới và chi phí lãi.
Đáp án: **A** (`correctIndex: 0`).

### Hành động tự chọn

Trong Picket, viết lại một mục tiêu có số tiền và thời hạn, rồi tạo một túi để theo dõi. Có thể chỉ viết ra giấy nếu chưa muốn tạo túi. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_SMART-goals_tool_2018-11.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.06 — Chương 03: Chia mục tiêu thành bước có thể đổi

**Năng lực:** saving.realistic-goal  
**Mục tiêu:** Tính phần còn thiếu và mức dành theo kỳ, biết điều chỉnh thời hạn khi hoàn cảnh đổi.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 422 đơn vị cách trắng trong thân bài

Một mục tiêu rõ thường có số tiền, lý do và thời điểm bạn muốn đạt. Nó vẫn là kế hoạch có thể sửa. Nếu giá thay đổi hoặc thu nhập giảm, điều chỉnh thời hạn không xóa đi những bước đã làm. Trước khi tính, hãy kiểm tra đã có bao nhiêu tiền thực sự dành cho mục tiêu này. Một khoản đã để cho tiền nhà không nên đồng thời được tính là tiền mua máy tính, trừ khi bạn chủ động đổi phân bổ và hiểu hậu quả cho tiền nhà.

Tú muốn dành 3.000.000đ cho một khóa học sau sáu kỳ thu nhập. Tú đã có 600.000đ cho mục tiêu đó. Còn thiếu 2.400.000đ; nếu chia đều sáu kỳ thì mỗi kỳ là 400.000đ. Đây là phép chia để hiểu nhịp độ, không phải mệnh lệnh phải dành đủ bất kể hoàn cảnh. Nếu thực tế chỉ có thể dành 300.000đ mỗi kỳ, tám kỳ mới đủ phần còn thiếu theo giả định giá không đổi và không có lãi. Không cần tự thêm lợi nhuận tương lai chưa chắc chắn để làm thời hạn trông đạt được.

Khi một kỳ phải ưu tiên nhu cầu khác, hãy tính lại trên số thực có, tránh vừa cộng khoản dự định vừa cộng khoản đã chuyển. Tiền vào ví tiết kiệm của chính mình vẫn là chuyển ví ở phạm vi tổng; mục tiêu thể hiện bạn muốn dùng tiền vào việc gì. Nếu chỉ cập nhật thanh tiến độ mà không có tiền tương ứng, cần ghi rõ đó là ghi nhận kế hoạch hay điều chỉnh dữ liệu. Một thanh đầy không chứng minh bạn đủ tiền thanh toán khi các khoản khác cùng cần đến số dư đó.

Trong Picket, có thể chọn thực hành xem lại mục tiêu có sẵn hoặc chỉ giải ví dụ. Không cần mở một khoản tiết kiệm thật để hoàn thành bài, không cần chứng minh bằng ảnh tài khoản. Một lời nhắc tự chọn có thể giúp bạn quay lại kế hoạch, nhưng bỏ qua không làm mất kiến thức đã học. Khi so hai phương án, hãy ghi rõ điều đang đổi: thời gian, số tiền mỗi kỳ hoặc phạm vi mục tiêu. Tránh kết luận rằng ai hoàn thành nhanh hơn là quản lý tiền giỏi hơn; nguồn lực và trách nhiệm của mỗi người khác nhau. Bước nhỏ có ích khi bạn hiểu được nó và vẫn đáp ứng các nhu cầu quan trọng hiện tại.

### Ví dụ và số học

(3.000.000 − 600.000) / 6 = 400.000đ/kỳ; 2.400.000 / 300.000 = 8 kỳ.

#### Ghi nhớ

- Mô tả mục tiêu bằng số tiền còn thiếu và mốc thời gian có thể xem lại.
- Tính lại từ số đã có khi thu nhập hoặc ưu tiên thay đổi.
- Điều chỉnh thời hạn hay quy mô là một lựa chọn, không phải thất bại cá nhân.

#### Hiểu lầm thường gặp

Đã đặt mục tiêu thì phải giữ mức góp cũ dù không còn đủ cho khoản thiết yếu.

#### Tự kiểm tra — tình huống hư cấu

Khoa muốn có 900.000đ, hiện đã có 300.000đ và dự định góp 100.000đ mỗi tuần trong 6 tuần. Hai tuần đầu thực góp 100.000đ và 40.000đ. Còn 4 tuần, Khoa chỉ có thể dành 80.000đ mỗi tuần. Kế hoạch cũ còn khớp không?

#### Gợi ý giải từng bước

1. Sau hai tuần, số đã có là 300.000 + 100.000 + 40.000 = 440.000đ.
2. Còn thiếu 900.000 − 440.000 = 460.000đ; nếu giữ 4 tuần thì cần 115.000đ mỗi tuần.
3. Khả năng 80.000đ không đáp ứng mức đó; có thể dời mốc, giảm mục tiêu hoặc xem lại một phương án khả thi, không giả định phần thiếu đã tồn tại.

#### Kết luận

Kế hoạch cũ không còn khớp. Với mức 80.000đ, thêm 6 tuần tạo được 480.000đ trước chi phí khác; đó là một kịch bản để cân nhắc, không phải cam kết.

- `3000000-600000 = 2400000`
- `2400000/6 = 400000`
- `2400000/300000 = 8`
- `300000+100000+40000 = 440000`
- `900000-440000 = 460000`
- `460000/4 = 115000`
- `6*80000 = 480000`

### Tình huống thực hành

**1. Tú đã có 600.000đ, mục tiêu 3.000.000đ. Còn thiếu?**

- A. 3.600.000đ — Đã cộng thay vì trừ phần có sẵn.
- B. 2.400.000đ — Đúng: mục tiêu trừ tiền thực đã dành.
- C. 600.000đ — Đây là số có, không phải phần thiếu.
Đáp án: **B** (`correctIndex: 1`).

**2. Chỉ dành được 300.000đ mỗi kỳ cho phần thiếu. Cần mấy kỳ theo giả định bài?**

- A. 6 — Sáu kỳ chỉ tạo 1.800.000đ.
- B. 10 — Mười kỳ là chia toàn bộ mục tiêu, bỏ qua 600.000đ đã có.
- C. 8 — Đúng: 2.400.000 chia 300.000 bằng tám.
Đáp án: **C** (`correctIndex: 2`).

**3. Một kỳ cần dùng tiền cho thuốc. Nên làm gì với mục tiêu?**

- A. Cập nhật số thực và tính lại thời hạn — Đúng: kế hoạch phục vụ hoàn cảnh, không ngược lại.
- B. Giữ tiến độ giả cho đẹp — Tiến độ không khớp tiền làm quyết định sau khó hơn.
- C. Bỏ thuốc để không đứt tiến độ — Nhu cầu sức khỏe không nên bị thay thế bằng điểm tiến độ.
Đáp án: **A** (`correctIndex: 0`).

### Hành động tự chọn

Viết một mục tiêu giả lập với số đã có, phần thiếu và hai lựa chọn thời hạn. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_SMART-goals_tool_2018-11.pdf)

## picket.vi.financial.v1.05 — Chương 03: Quỹ dự phòng khác khoản đã biết trước

**Năng lực:** resilience.emergency-vs-planned  
**Mục tiêu:** Phân biệt sự cố chưa dự kiến với chi phí theo lịch và chọn mục tiêu dự phòng phù hợp hoàn cảnh.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 428 đơn vị cách trắng trong thân bài

Tiền dự phòng giúp bạn có thêm lựa chọn khi gặp một việc bất ngờ. Ví dụ có thể là đồ dùng thiết yếu hỏng hoặc gián đoạn thu nhập. Tiền dành cho khoản biết trước, như học phí kỳ tới hay phí gia hạn hàng năm, có vai trò khác: đó là chuẩn bị theo lịch. Hai loại đều có ích. Phân biệt chúng giúp bạn không nghĩ rằng mình liên tục gặp sự cố khi thực ra một khoản thường niên chưa được đưa vào kế hoạch. Không cần phán xét khi phải dùng tiền đã dành; hãy nhìn điều gì thực sự xảy ra.

Dung có 2.000.000đ, gồm 1.200.000đ dành cho học phí và 800.000đ dự phòng. Học phí đến hạn là 1.200.000đ, trả xong Dung còn 800.000đ. Nếu ngay sau đó thiết bị học tập cần sửa bất ngờ 500.000đ, Dung còn 300.000đ. Việc trả học phí không phải một lần rút quỹ dự phòng theo cách phân chia này. Số tiền dự phòng cũng không phải số tiền có thêm ngoài 2.000.000đ; đó là một phần của tổng đang có. Gắn nhãn cùng một khoản vào hai quỹ không khiến nó phục vụ đồng thời hai lần thanh toán.

Mức dự phòng phù hợp phụ thuộc nhu cầu, người phụ thuộc, độ ổn định thu nhập và những hỗ trợ thực sự có thể tiếp cận. Một mục tiêu khởi đầu nhỏ có thể dễ thực hiện hơn một con số lớn khiến bạn bỏ cuộc. Bài này không yêu cầu mọi người giữ một số tháng giống nhau và không hứa rằng đạt một mức nào đó sẽ an toàn trước mọi biến cố. Nếu hiện chưa còn tiền sau nhu cầu cơ bản, hãy nhận diện giới hạn đó; không cần vay tiền chỉ để tạo số dư mang tên dự phòng.

Hãy cân nhắc nơi giữ tiền mà bạn hiểu phí, khả năng rút và mức độ tiếp cận khi cần, thay vì chạy theo một mức sinh lời được hứa. Không đưa toàn bộ tiền cần sớm vào lựa chọn mà bạn không hiểu hoặc không rút được đúng lúc. Trong Picket, bạn có thể xem nhãn mục tiêu và số dư riêng để tránh nhầm. Sau một lần dùng dự phòng, chỉ lập lại kế hoạch khi có điều kiện; không cần tự phạt bằng việc bỏ chi phí thiết yếu. Một bước học có thể chỉ là liệt kê khoản biết trước và việc bất ngờ, không yêu cầu gửi tiền hay mua sản phẩm tài chính.

### Ví dụ và số học

2.000.000 − 1.200.000 = 800.000đ; 800.000 − 500.000 = 300.000đ.

#### Ghi nhớ

- Tách khoản đã biết trước khỏi chi phí bất ngờ.
- Mức dự phòng phù hợp phụ thuộc hoàn cảnh; ví dụ trong bài không phải mức bắt buộc.
- Gắn nhãn để dành giúp theo dõi, nhưng không tự chuyển tiền hoặc bảo đảm số dư.

#### Hiểu lầm thường gặp

Mọi khoản lớn đều là khẩn cấp, hoặc gắn nhãn quỹ dự phòng là đã có thêm tiền.

#### Tự kiểm tra — tình huống hư cấu

Hà biết cần bảo dưỡng xe 240.000đ sau 4 tuần. Hà còn quỹ cho việc bất ngờ 90.000đ; một hỏng hóc không dự kiến vừa dùng 40.000đ. Tách hai mục tiêu và tính các số còn lại.

#### Gợi ý giải từng bước

1. Bảo dưỡng đã biết trước có thể lập mục tiêu 240.000 ÷ 4 = 60.000đ mỗi tuần theo giả định chia đều.
2. Khoản hỏng bất ngờ dùng 40.000đ từ quỹ 90.000đ, nên quỹ còn 50.000đ.
3. Hai khoản có mục đích khác nhau; đừng tính nhãn quỹ như một nguồn thu mới hoặc buộc phải dành mức vượt khả năng.

#### Kết luận

Mục tiêu bảo dưỡng là 60.000đ mỗi tuần nếu khả thi; quỹ bất ngờ còn 50.000đ. Có thể điều chỉnh kế hoạch theo thu nhập thực tế.

- `2000000-1200000 = 800000`
- `800000-500000 = 300000`
- `240000/4 = 60000`
- `90000-40000 = 50000`

### Tình huống thực hành

**1. Học phí có lịch rõ kỳ tới nên được xem là gì trong bài?**

- A. Sự cố không thể dự kiến — Đã biết ngày và số tiền nên có thể lập kế hoạch.
- B. Khoản cần chuẩn bị theo lịch — Đúng: khác sự cố chưa dự kiến.
- C. Thu nhập mới — Đây là tiền phải trả, không phải thu.
Đáp án: **B** (`correctIndex: 1`).

**2. Dung trả học phí và sửa thiết bị như ví dụ. Còn bao nhiêu?**

- A. 300.000đ — Đúng: đã trừ đủ cả hai khoản thực tế.
- B. 800.000đ — Đây là số trước khi sửa thiết bị.
- C. 1.500.000đ — Đã bỏ qua học phí trong phép tính.
Đáp án: **A** (`correctIndex: 0`).

**3. Hiện không dư sau nhu cầu cơ bản. Lựa chọn nào phù hợp nhất?**

- A. Vay để đạt một nhãn quỹ đẹp — Vay làm phát sinh nghĩa vụ, không tự tạo an toàn.
- B. Coi mình thất bại — Thiếu nguồn lực không phải đánh giá phẩm chất.
- C. Ghi nhận giới hạn và xem lại mục tiêu khi điều kiện đổi — Đúng: mục tiêu cần phù hợp hoàn cảnh thực tế.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Tách hai ví dụ thành khoản có lịch và sự cố bất ngờ; chưa cần chuyển tiền. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/)

## picket.vi.financial.v1.17 — Chương 08: Xây quỹ dự phòng theo từng mốc

**Năng lực:** resilience.emergency-fund-sizing  
**Mục tiêu:** Tính chi thiết yếu mỗi tháng, chọn mốc dự phòng theo hoàn cảnh và tính thời gian đạt mốc.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 200 đơn vị cách trắng trong thân bài

Quỹ dự phòng giúp bạn đối phó khi mất thu nhập hoặc gặp việc gấp mà không phải vay. Cách tính dễ hiểu là đo bằng số tháng chi thiết yếu. Chi thiết yếu gồm những khoản bạn vẫn phải trả nếu thu nhập dừng lại: nhà ở, ăn uống cơ bản, đi lại, hóa đơn và khoản trả nợ tối thiểu.

Không có số tháng đúng cho mọi người. Người có thu nhập không đều, có người phụ thuộc hoặc làm trong ngành dễ biến động thường cần đệm lớn hơn. Bạn có thể bắt đầu bằng một mốc nhỏ, rồi nâng dần.

Ví dụ hư cấu: Quân có chi thiết yếu gồm nhà ở 2.500.000đ, ăn uống 2.000.000đ, đi lại 500.000đ và hóa đơn 500.000đ. Tổng là 5.500.000đ mỗi tháng. Mốc đầu của Quân là 1 tháng chi thiết yếu, tức 5.500.000đ. Mốc sau là 3 tháng, tức 16.500.000đ. Nếu dành 1.100.000đ mỗi tháng, Quân cần 5 tháng để đạt mốc đầu.

Quỹ dự phòng nên ở nơi rút được khi cần, bạn hiểu rõ phí và tách khỏi tiền tiêu hằng ngày. Khi đã dùng quỹ, hãy ghi đúng khoản chi rồi lên kế hoạch bù dần.

### Ví dụ và số học

5.500.000đ = 2.500.000 + 2.000.000 + 500.000 + 500.000. Mốc 3 tháng: 5.500.000 × 3 = 16.500.000đ. Thời gian đạt mốc đầu: 5.500.000 / 1.100.000 = 5 tháng.

#### Ghi nhớ

- Đo quỹ dự phòng bằng số tháng chi thiết yếu.
- Số tháng phù hợp tùy độ ổn định thu nhập và người phụ thuộc.
- Bắt đầu bằng mốc nhỏ và bù lại sau khi dùng.

#### Hiểu lầm thường gặp

Nghĩ rằng phải có ngay một quỹ thật lớn thì mới đáng bắt đầu.

#### Tự kiểm tra — tình huống hư cấu

Chi thiết yếu 6.000.000đ mỗi tháng. Mốc đầu là 2 tháng. Đã có 3.000.000đ và dành thêm 1.500.000đ mỗi tháng. Bao lâu thì đạt mốc?

#### Gợi ý giải từng bước

1. Mốc: 6.000.000 × 2 = 12.000.000đ.
2. Còn thiếu: 12.000.000 − 3.000.000 = 9.000.000đ.
3. Thời gian: 9.000.000 / 1.500.000 = 6 tháng.

#### Kết luận

Mốc là 12.000.000đ và cần thêm 6 tháng nếu giữ mức góp 1.500.000đ.

- `2500000+2000000+500000+500000 = 5500000`
- `5500000*3 = 16500000`
- `5500000/1100000 = 5`
- `6000000*2 = 12000000`
- `(12000000-3000000)/1500000 = 6`

### Tình huống thực hành

**1. Chi thiết yếu 4.000.000đ mỗi tháng, chọn mốc 3 tháng. Mục tiêu quỹ là bao nhiêu?**

- A. 4.000.000đ — Đây chỉ là 1 tháng.
- B. 12.000.000đ — Đúng: 4.000.000 × 3 = 12.000.000đ.
- C. 7.000.000đ — Đây là cộng 3 triệu, không phải nhân 3 tháng.
Đáp án: **B** (`correctIndex: 1`).

**2. Nơi giữ quỹ dự phòng nên ưu tiên đặc điểm nào?**

- A. Lợi nhuận hứa hẹn cao nhất — Lời hứa lợi nhuận cao thường đi kèm rủi ro hoặc khó rút.
- B. Khó rút để khỏi tiêu — Khi có việc gấp mà không rút được thì quỹ mất tác dụng.
- C. Rút được khi cần, hiểu rõ phí và tách khỏi tiền tiêu hằng ngày — Đúng: quỹ cần sẵn sàng khi cần và không lẫn với chi tiêu.
Đáp án: **C** (`correctIndex: 2`).

**3. Vừa dùng 1.000.000đ từ quỹ để sửa xe đi làm. Bước tiếp theo là gì?**

- A. Ghi khoản chi thật, rồi lên kế hoạch bù dần — Đúng: quỹ được tạo ra để dùng đúng lúc như thế này.
- B. Giấu khoản rút để quỹ trông còn nguyên — Che số liệu làm kế hoạch sai.
- C. Coi quỹ đã thất bại và bỏ luôn — Dùng quỹ cho việc gấp là đúng mục đích.
Đáp án: **A** (`correctIndex: 0`).

### Hành động tự chọn

Trong Picket, cộng các túi chi thiết yếu để biết chi thiết yếu một tháng, rồi đặt mốc đầu cho túi dự phòng. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/)
- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.07 — Chương 04: Số dư chưa phải tiền có thể dành ra

**Năng lực:** forecast.obligations-and-scope  
**Mục tiêu:** Tách số dư hiện tại, nghĩa vụ tương lai và mức dự phòng khi xem một kịch bản.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 419 đơn vị cách trắng trong thân bài

Số dư trả lời bạn đang có bao nhiêu tiền trong phạm vi được xem. Nó không tự trả lời bao nhiêu tiền có thể dành cho một quyết định mới. Có những khoản chưa trừ khỏi ví nhưng sắp cần thanh toán. Bạn cũng có thể muốn giữ một phần để xử lý bất ngờ. Khi đọc một con số, hãy tìm mốc thời gian, những ví được tính và các khoản đã hoặc chưa nằm trong đó. Nếu một ví ngoại tệ chưa có tỷ giá phù hợp, đừng cộng thẳng số của nó với số VND.

Vy có 4.000.000đ trong các ví VND đang xem. Trước kỳ thu tiếp theo, Vy đã xác nhận tiền phòng 1.500.000đ và chi thực phẩm dự kiến 700.000đ. Vy muốn giữ 500.000đ làm khoảng dự phòng. Theo đúng các đầu vào đó, phần còn sau nghĩa vụ và phần dành lại là 1.300.000đ. Phép tính không nói số dư ngân hàng hiện đã giảm xuống 1.300.000đ. Nó phân biệt tiền hiện có với phần đang được cân nhắc cho quyết định mới. Khoản dự phòng là phân bổ của cùng số dư, không phải một khoản chi đã thực hiện.

Nếu tiền phòng đã trả và giao dịch đó đã trừ vào số dư 4.000.000đ, bạn không nên trừ nó lần nữa. Cần đối chiếu trạng thái hóa đơn và bản ghi thanh toán trước khi xem lịch. Tương tự, ảnh hóa đơn chưa xác nhận không được tự tạo một nghĩa vụ mới ngoài khoản đã ghi. Chuyển giữa hai ví trong phạm vi không tăng tổng tiền để dành. Các quy tắc này giúp tránh một báo cáo quá lạc quan hoặc quá bi quan vì đếm cùng khoản nhiều lần.

Con số 1.300.000đ vẫn phụ thuộc vào danh sách đã đủ chưa. Vy có thể quên chi phí đi lại hoặc có một khoản thu chưa chắc chắn. Hãy xem kết quả như một câu trả lời có điều kiện, kèm điều cần kiểm tra thêm. Trong Picket, khi chưa xác nhận lịch, tốt hơn là nói chưa đủ dữ liệu thay vì khẳng định bạn được phép tiêu một mức cụ thể. Bạn có thể tự chọn thay đổi giả định và xem kết quả, nhưng ứng dụng không quyết định thay bạn. Thực hành của bài là rà một nghĩa vụ và hỏi nó đã trả hay chưa; không cần cung cấp thông tin tài khoản ngân hàng cho bất kỳ dịch vụ mới nào.

### Ví dụ và số học

4.000.000 − 1.500.000 − 700.000 − 500.000 = 1.300.000đ theo đầu vào đã nêu.

#### Ghi nhớ

- Tách số dư đang có khỏi phần đã dành cho nghĩa vụ và chi thiết yếu.
- Giữ cùng phạm vi ví và đơn vị tiền khi tính phần chưa phân bổ.
- Đánh dấu khoản đã trả để tránh trừ nghĩa vụ đó lần thứ hai.

#### Hiểu lầm thường gặp

Toàn bộ số dư hiện trên màn hình đều sẵn để mua một món mới.

#### Tự kiểm tra — tình huống hư cấu

Lan có 1.200.000đ trong phạm vi ví đang xem. Trước kỳ thu tiếp theo, Lan dành 800.000đ tiền nhà, 250.000đ sinh hoạt và 100.000đ cho khoản dự phòng đã chọn. Theo các giả định này còn bao nhiêu chưa phân bổ?

#### Gợi ý giải từng bước

1. Các phần đã dự định dùng là 800.000 + 250.000 + 100.000 = 1.150.000đ.
2. Phần chưa phân bổ theo dữ kiện là 1.200.000 − 1.150.000 = 50.000đ.
3. Kiểm tra khoản nào đã trả, còn thiếu hoặc nằm ngoài phạm vi; kết quả này chưa phải đánh giá chắc chắn về khả năng mua của một người thật.

#### Kết luận

Còn 50.000đ chưa phân bổ theo ví dụ. Số dư 1.200.000đ không đồng nghĩa toàn bộ số tiền đó còn tự do sử dụng.

- `4000000-1500000-700000-500000 = 1300000`
- `800000+250000+100000 = 1150000`
- `1200000-1150000 = 50000`

### Tình huống thực hành

**1. 1.300.000đ trong ví dụ có ý nghĩa gì?**

- A. Số dư ngân hàng chắc chắn ngay lúc này — Ngân hàng chưa tự trừ các khoản tương lai và phân bổ dự phòng.
- B. Phần còn có điều kiện sau các khoản đã nêu — Đúng: cần giữ nguyên giả định và phạm vi để đọc số.
- C. Tiền ứng dụng vừa tạo thêm — Tính toán không tạo thêm tiền.
Đáp án: **B** (`correctIndex: 1`).

**2. Tiền phòng đã nằm trong giao dịch trừ số dư hiện tại. Trừ thêm hóa đơn đó gây gì?**

- A. Đếm nghĩa vụ hai lần — Đúng: cần đối chiếu trạng thái thanh toán.
- B. Tăng độ chính xác — Trừ trùng làm dự kiến thấp sai.
- C. Tạo thu nhập mới — Không có nguồn thu mới nào.
Đáp án: **A** (`correctIndex: 0`).

**3. Có ví 100 USD và ví 4.000.000 VND nhưng chưa có tỷ giá. Nên?**

- A. Cộng thành 4.000.100 VND — Khác đơn vị nên không cộng trực tiếp.
- B. Coi USD bằng không mà không báo — Bỏ âm thầm làm người dùng hiểu sai phạm vi.
- C. Hiển thị riêng và nói rõ chưa tổng hợp chéo tiền tệ — Đúng: giới hạn phải hiện rõ.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Rà một khoản tới hạn hoặc ví dụ để đánh dấu đã trả/chưa trả, không tạo thanh toán thật. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_bill_calendar_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.08 — Chương 04: Kịch bản giúp hỏi, không đoán chắc tương lai

**Năng lực:** forecast.scenario-and-coverage  
**Mục tiêu:** So hai kịch bản cùng giả định và giải thích vì sao thiếu dữ liệu không cho phép khẳng định dự báo.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 419 đơn vị cách trắng trong thân bài

Một kịch bản trả lời câu hỏi nếu những điều này xảy ra thì số tiền sẽ thay đổi thế nào. Dự báo cố gắng ước lượng điều có thể xảy ra từ dữ liệu và phương pháp cụ thể. Cả hai đều có giới hạn, nhưng không nên dùng hai tên thay nhau để tạo cảm giác chắc chắn. Khi bạn nhập giá một món định mua rồi xem chênh lệch, đó trước hết là phép tính có điều kiện. Nó không chứng minh người dùng sẽ thật sự mua, cũng không chứng minh mọi khoản thu chi khác đã được biết.

An có 2.000.000đ. Trong bảy ngày, An xác nhận một khoản thu 1.000.000đ và nghĩa vụ 1.500.000đ. Nếu không có khoản nào khác, cuối kỳ còn 1.500.000đ. Nếu mua món đồ 600.000đ trong kỳ với các điều kiện giữ nguyên, còn 900.000đ. Chênh lệch giữa hai phương án là 600.000đ. Đây không phải khẳng định An sẽ có chính xác 900.000đ tuần tới. Nếu khoản thu đến chậm hoặc còn chi chưa nhập, kết quả thực tế khác; cần xem thêm số dư theo từng ngày chứ không chỉ ngày cuối.

Dữ liệu thưa dễ làm câu chuyện sai. Không ghi giao dịch vào ba ngày không có nghĩa là ba ngày đều chi bằng không. Nếu chỉ theo dõi một ví, báo cáo cũng không biết mọi khoản ở ví khác. Một mô hình phức tạp không tự lấp được khoảng trống này bằng sự thật. Cách hữu ích là hỏi mức độ ghi đủ, nêu mốc đồng bộ và cho phép bạn sửa lịch đã biết. Các khoảng thấp và cao do đổi giả định chỉ là các kịch bản; không gọi là xác suất tin cậy đã kiểm chứng nếu chưa đo và hiệu chuẩn trên dữ liệu phù hợp.

Trong Picket, thử một lựa chọn không nên tự tạo giao dịch hoặc sửa ngân sách thật. Chỉ khi bạn chủ động xác nhận một sự việc đã xảy ra mới dùng luồng ghi chép tương ứng. Khi thiếu lịch sử, bài vẫn dùng số minh họa để giải thích công thức mà không bịa một ngày hết tiền. Bạn có thể chọn chưa kết luận và bổ sung đầu vào sau. Thực hành tốt là nói được câu điều kiện trước con số: nếu lịch đúng và không còn khoản nào khác, kết quả là bao nhiêu. Câu đó giúp bạn kiểm tra quyết định và nhìn ra điều còn chưa biết.

### Ví dụ và số học

Không mua: 2.000.000 + 1.000.000 − 1.500.000 = 1.500.000đ. Mua: 1.500.000 − 600.000 = 900.000đ.

#### Ghi nhớ

- Tách dữ kiện đã xác nhận khỏi giả định khi tạo kịch bản.
- So các phương án trên cùng mốc thời gian, phạm vi ví và đơn vị tiền.
- Một kết quả mô phỏng không phải lời hứa hay giao dịch đã xảy ra.

#### Hiểu lầm thường gặp

Chọn kịch bản đẹp nhất rồi coi khoản thu chưa chắc chắn là tiền đã có.

#### Tự kiểm tra — tình huống hư cấu

Minh có 400.000đ, còn khoản phải trả đã xác nhận 150.000đ. Minh cân nhắc món đồ 300.000đ và có thể nhận thêm 200.000đ nhưng chưa chắc ngày nhận. So phương án không có và có khoản thu giả định.

#### Gợi ý giải từng bước

1. Sau khoản phải trả, còn 400.000 − 150.000 = 250.000đ theo dữ kiện.
2. Nếu mua món đồ mà chưa có khoản thu thêm, kịch bản còn 250.000 − 300.000 = −50.000đ.
3. Nếu giả định 200.000đ đến đúng lúc, kết quả là 150.000đ; phải ghi rõ giả định này, không xóa cảnh báo ở phương án cơ sở.

#### Kết luận

Phương án cơ sở thiếu 50.000đ nếu mua. Kết quả 150.000đ chỉ thuộc kịch bản có khoản thu đúng lúc, không phải tiền được bảo đảm.

- `2000000+1000000-1500000 = 1500000`
- `1500000-600000 = 900000`
- `1500000-900000 = 600000`
- `400000-150000 = 250000`
- `250000-300000 = -50000`
- `-50000+200000 = 150000`

### Tình huống thực hành

**1. So hai phương án chỉ khác giá món đồ 600.000đ. Chênh lệch cuối kỳ?**

- A. 600.000đ — Đúng: các giả định khác giữ nguyên.
- B. 900.000đ — Đây là số còn của phương án mua.
- C. 1.500.000đ — Đây là số còn của phương án không mua.
Đáp án: **A** (`correctIndex: 0`).

**2. Ba ngày không ghi dữ liệu. Có thể kết luận chi tiêu bằng không?**

- A. Có vì biểu đồ trống — Biểu đồ trống có thể do chưa nhập.
- B. Chưa thể kết luận — Đúng: cần biết độ phủ ghi chép.
- C. Có nếu AI trả lời tự tin — Độ tự tin của lời văn không thay bằng chứng.
Đáp án: **B** (`correctIndex: 1`).

**3. Thử giá trên màn hình kịch bản nên làm gì với giao dịch thật?**

- A. Tạo khoản chi tự động — Thử phương án chưa phải mua thật.
- B. Sửa ngân sách để vừa kết quả — Điều chỉnh âm thầm làm mất ý nghĩa kế hoạch.
- C. Giữ nguyên, chỉ mô phỏng cho tới thao tác xác nhận riêng — Đúng: thử nghiệm và ghi nhận thực tế là hai bước khác nhau.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Giải hai kịch bản minh họa và viết một điều có thể khiến kết quả khác. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfbp_your-money-your-goals_adjust_cash_flow_tool_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/01/financial-competence-framework-for-adults-in-the-european-union_614b8b97/510f133c-en.pdf)

## picket.vi.financial.v1.18 — Chương 09: Thuế thu nhập cá nhân từ tiền lương: giảm trừ và biểu lũy tiến

**Năng lực:** tax.pit-on-wages-2026  
**Mục tiêu:** Tính thu nhập tính thuế từ tiền lương và áp dụng biểu lũy tiến từng phần trong một ví dụ đơn giản.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 239 đơn vị cách trắng trong thân bài

Thuế thu nhập cá nhân từ tiền lương không tính trên toàn bộ lương gộp. Trước hết, lấy thu nhập chịu thuế trừ bảo hiểm bắt buộc. Sau đó trừ giảm trừ gia cảnh. Phần còn lại là thu nhập tính thuế.

Theo Nghị quyết 110/2025/UBTVQH15 thông qua ngày 17/10/2025, từ kỳ tính thuế 2026, mức giảm trừ cho bản thân là 15.500.000đ mỗi tháng. Mỗi người phụ thuộc đã đăng ký được giảm trừ 6.200.000đ mỗi tháng. Luật Thuế thu nhập cá nhân 2025 có hiệu lực từ 1/7/2026. Luật dùng biểu 5 bậc tính theo tháng. Đến 10 triệu đồng chịu 5%; trên 10 đến 30 triệu chịu 10%; trên 30 đến 60 triệu chịu 20%; trên 60 đến 100 triệu chịu 30%; trên 100 triệu chịu 35%. Lũy tiến từng phần nghĩa là mỗi phần thu nhập chỉ chịu thuế suất của bậc chứa phần đó.

Ví dụ hư cấu: Hải có lương 30.000.000đ, cũng là lương đóng bảo hiểm, và 1 người phụ thuộc. Bảo hiểm là 30.000.000 × 10,5% = 3.150.000đ. Giảm trừ là 15.500.000 + 6.200.000 = 21.700.000đ. Thu nhập tính thuế là 5.150.000đ, nằm trong bậc 5%. Thuế là 257.500đ. Tiền thực nhận là 26.592.500đ.

Bài chỉ giải thích cách tính cơ bản. Thưởng, thu nhập từ nhiều nơi và quyết toán năm có quy định riêng. Hãy hỏi bộ phận trả lương hoặc cơ quan thuế khi cần số chính xác.

### Ví dụ và số học

Bảo hiểm: 30.000.000 × 10,5% = 3.150.000đ. Giảm trừ: 15.500.000 + 6.200.000 = 21.700.000đ. Tính thuế: 30.000.000 − 3.150.000 − 21.700.000 = 5.150.000đ. Thuế: 5.150.000 × 5% = 257.500đ. Thực nhận: 30.000.000 − 3.150.000 − 257.500 = 26.592.500đ.

#### Ghi nhớ

- Thu nhập tính thuế = thu nhập chịu thuế − bảo hiểm bắt buộc − giảm trừ gia cảnh.
- Từ kỳ tính thuế 2026: 15.500.000đ cho bản thân, 6.200.000đ cho mỗi người phụ thuộc mỗi tháng.
- Lũy tiến từng phần: mỗi phần chỉ chịu thuế suất của bậc chứa nó.

#### Hiểu lầm thường gặp

Nghĩ rằng lên bậc thuế cao hơn thì toàn bộ thu nhập bị tính thuế suất cao hơn.

#### Tự kiểm tra — tình huống hư cấu

Lương 40.000.000đ, cũng là lương đóng bảo hiểm, không có người phụ thuộc. Tính bảo hiểm, thu nhập tính thuế, thuế và tiền thực nhận.

#### Gợi ý giải từng bước

1. Bảo hiểm: 40.000.000 × 10,5% = 4.200.000đ.
2. Tính thuế: 40.000.000 − 4.200.000 − 15.500.000 = 20.300.000đ.
3. Bậc 1: 10.000.000 × 5% = 500.000đ; bậc 2: 10.300.000 × 10% = 1.030.000đ; tổng 1.530.000đ.
4. Thực nhận: 40.000.000 − 4.200.000 − 1.530.000 = 34.270.000đ.

#### Kết luận

Thuế là 1.530.000đ và tiền thực nhận là 34.270.000đ trong giả định của bài.

- `30000000*105/1000 = 3150000`
- `15500000+6200000 = 21700000`
- `30000000-3150000-21700000 = 5150000`
- `5150000*5/100 = 257500`
- `30000000-3150000-257500 = 26592500`
- `10000000*5/100+15000000*10/100 = 2000000`
- `40000000*105/1000 = 4200000`
- `40000000-4200000-15500000 = 20300000`
- `10000000*5/100 = 500000`
- `(20300000-10000000)*10/100 = 1030000`
- `500000+1030000 = 1530000`
- `40000000-4200000-1530000 = 34270000`

### Tình huống thực hành

**1. Thu nhập tính thuế 25.000.000đ mỗi tháng theo biểu 5 bậc. Thuế là bao nhiêu?**

- A. 2.500.000đ — Đây là áp 10% cho toàn bộ, sai cách lũy tiến từng phần.
- B. 2.000.000đ — Đúng: 10.000.000 × 5% + 15.000.000 × 10% = 500.000 + 1.500.000.
- C. 1.250.000đ — Đây là áp 5% cho toàn bộ.
Đáp án: **B** (`correctIndex: 1`).

**2. Từ kỳ tính thuế 2026, mức giảm trừ cho bản thân mỗi tháng là bao nhiêu?**

- A. 11.000.000đ — Đây là mức trước kỳ tính thuế 2026.
- B. 6.200.000đ — Đây là mức cho mỗi người phụ thuộc.
- C. 15.500.000đ — Đúng: theo Nghị quyết 110/2025/UBTVQH15.
Đáp án: **C** (`correctIndex: 2`).

**3. Thu nhập tính thuế đã vượt sang bậc 10%. Điều nào đúng?**

- A. Chỉ phần trên 10.000.000đ chịu 10%; 10.000.000đ đầu chịu 5% — Đúng: đây là ý nghĩa của lũy tiến từng phần.
- B. Toàn bộ thu nhập chịu 10% — Thuế suất bậc cao chỉ áp cho phần nằm trong bậc đó.
- C. Không phải nộp thuế — Có thu nhập tính thuế dương thì có thuế.
Đáp án: **A** (`correctIndex: 0`).

### Hành động tự chọn

Nếu có phiếu lương, đối chiếu dòng giảm trừ và thuế với cách tính trong bài. Câu hỏi cụ thể hãy gửi bộ phận trả lương. Không cần nhập phiếu lương vào Picket. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Số liệu có nguồn và ngày

- Personal deduction 15,500,000 VND/month and 6,200,000 VND/month per dependant; Resolution 110/2025/UBTVQH15 adopted 2025-10-17, applies from tax period 2026 — nguồn `pit-deduction-2026`, mốc 2026-01-01
- Monthly 5-bracket schedule: to 10m 5%; 10-30m 10%; 30-60m 20%; 60-100m 30%; over 100m 35%; PIT Law 2025 effective 2026-07-01 — nguồn `pit-law-2025`, mốc 2026-07-01
- Employee mandatory insurance share 10.5% — nguồn `bhxh-rates`, mốc 2025-09-08

### Nguồn đã đọc

- [Nguồn tham khảo](https://hcc.nghean.gov.vn/tin-tong-hop/nghi-quyet-110-2025-ubtvqh15-dieu-chinh-muc-giam-tru-gia-canh-cua-thue-thu-nhap-ca-nhan-2448.html)
- [Nguồn tham khảo](https://pbgdpl.cantho.gov.vn/tu-ngay-0172026-nhieu-diem-moi-cua-luat-thue-thu-nhap-ca-nhan-can-luu-y)
- [Nguồn tham khảo](https://hanoi.baohiemxahoi.gov.vn/UserControls/Publishing/News/BinhLuan/pFormPrint.aspx?UrlListProcess=/content/tintuc/Lists/News&ItemID=35560&IsTA=False)

# Giai đoạn 3: Bảo vệ

Hiểu chi phí vay, tránh lừa đảo, đọc hợp đồng bảo hiểm và dùng quyền người tiêu dùng.

## picket.vi.financial.v1.09 — Chương 05: Nhìn tổng chi phí trước khoản trả nhỏ

**Năng lực:** borrowing.total-cost  
**Mục tiêu:** Tính tổng phải trả từ lịch và phí; phân biệt lãi suất quảng cáo với toàn bộ chi phí của ví dụ.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 410 đơn vị cách trắng trong thân bài

Một khoản vay không chỉ có tiền gốc. Bạn cần biết số tiền thực nhận, lịch trả, tổng lãi và các loại phí có thể phát sinh. Một mức trả từng kỳ nhỏ không tự chứng minh khoản vay rẻ hơn. Muốn so hai lựa chọn cần cùng hiểu số tiền được sử dụng, số kỳ, thời điểm và điều kiện. Nếu thông tin chưa đủ, câu trả lời đúng có thể là chưa so được, thay vì chọn mức phần trăm nhìn thấp nhất trên một dòng quảng cáo.

Trong hợp đồng giả lập A, Linh nhận 3.000.000đ và trả ba kỳ, mỗi kỳ 1.080.000đ. Có thêm phí 60.000đ trả riêng lúc bắt đầu. Tổng tiền trả là 3.300.000đ; phần vượt tiền nhận là 300.000đ. Hợp đồng giả lập B cũng cho nhận đủ 3.000.000đ, trả ba kỳ 1.110.000đ và không có phí khác: tổng 3.330.000đ. Theo đúng các điều kiện đã cho, A thấp hơn 30.000đ về tổng số tiền. Đây là so sánh số học, không phải giới thiệu bên cho vay hay kết luận tính hợp pháp của bất kỳ sản phẩm nào.

Đọc kỹ phí có được khấu trừ ngay khỏi tiền nhận hay trả riêng. Hai cách có thể làm số tiền thực dùng khác nhau dù cùng gọi là vay 3.000.000đ. Kiểm tra thêm phí trả chậm, điều kiện trả trước và khoản dịch vụ kèm theo. Đừng tự suy ra lãi suất năm từ phép chia đơn giản khi lịch trả và số dư gốc thay đổi theo kỳ. Cũng không nên gắn tên một chỉ số nước ngoài vào một phép tính chưa đúng định nghĩa. Trong bài này chúng ta chỉ tính tổng các khoản tiền đã được nêu rõ.

Trước quyết định thật, bạn cần thông tin hợp đồng áp dụng tại Việt Nam và có thể hỏi người có chuyên môn phù hợp nếu điều khoản khó hiểu. Nguồn quốc tế ở cuối bài hỗ trợ cách nhìn chi phí, không thay thế luật Việt Nam và không tạo quyền hay thời hạn pháp lý ở đây. Bạn không cần nhập khoản vay thật hoặc bấm đăng ký để hoàn thành. Trong Picket, hãy phân biệt dữ liệu mô phỏng với nghĩa vụ đã có; chỉ ghi lịch thật khi đã kiểm tra. Nếu bị thúc ép ký khi còn câu hỏi chưa được trả lời, việc dừng để xác minh giúp giữ quyền chủ động của bạn.

### Ví dụ và số học

A: 3 × 1.080.000 + 60.000 = 3.300.000đ, chi phí 300.000đ. B: 3 × 1.110.000 = 3.330.000đ; chênh 30.000đ.

#### Ghi nhớ

- So tổng tiền, số kỳ, tiền thực nhận và mọi phí đã biết trước khi so khoản trả mỗi kỳ.
- Khoản trả nhỏ hơn có thể đi kèm nhiều kỳ hơn và tổng tiền lớn hơn.
- Không biến phép tính tổng tiền đơn giản thành lãi suất năm hoặc kết luận pháp lý.

#### Hiểu lầm thường gặp

Khoản trả mỗi kỳ thấp nhất chắc chắn là phương án rẻ nhất.

#### Tự kiểm tra — tình huống hư cấu

Hai hợp đồng giả lập đều cho nhận đủ 2.000.000đ. A có hai kỳ 1.050.000đ và phí 30.000đ trả riêng. B có ba kỳ 720.000đ, không phí khác. Tính tổng, chi phí vượt tiền nhận và điểm còn phải xem trước khi quyết định.

#### Gợi ý giải từng bước

1. A trả 2 × 1.050.000 + 30.000 = 2.130.000đ; phần vượt tiền nhận là 130.000đ.
2. B trả 3 × 720.000 = 2.160.000đ; tổng cao hơn A 30.000đ dù mỗi kỳ thấp hơn.
3. Kỳ hạn và thời điểm khác nhau vẫn cần được xem; kiểm điều kiện chậm trả, trả trước và thông tin hợp đồng, không suy ra APR từ các tổng này.

#### Kết luận

A có tổng thấp hơn 30.000đ theo đúng phí đã nêu. Đây chỉ là so sánh số học của hợp đồng hư cấu, không phải giới thiệu một khoản vay.

- `3*1080000+60000 = 3300000`
- `3300000-3000000 = 300000`
- `3*1110000 = 3330000`
- `3330000-3300000 = 30000`
- `2*1050000+30000 = 2130000`
- `2130000-2000000 = 130000`
- `3*720000 = 2160000`
- `2160000-2130000 = 30000`

### Tình huống thực hành

**1. Tổng phải trả của A theo ví dụ?**

- A. 3.240.000đ — Đã bỏ phí trả riêng 60.000đ.
- B. 3.300.000đ — Đúng: cộng ba kỳ và phí.
- C. 3.060.000đ — Đã bỏ phần lớn các khoản trả theo kỳ.
Đáp án: **B** (`correctIndex: 1`).

**2. Chỉ biết lãi suất quảng cáo của hai hợp đồng. Đã chọn được rẻ hơn chưa?**

- A. Chưa, cần lịch, tiền thực nhận và phí — Đúng: một chỉ số chưa thể hiện toàn bộ tiền phải trả.
- B. Rồi, cứ chọn số nhỏ — Phí và cách tính có thể khác.
- C. Rồi, chọn bên hứa giải ngân nhanh — Tốc độ không cho biết chi phí.
Đáp án: **A** (`correctIndex: 0`).

**3. Nguồn CFPB nói về công bố TILA tại Mỹ. Áp dụng thế nào trong bài Việt Nam?**

- A. Coi đó là luật Việt Nam — Nguồn nước ngoài không trở thành luật Việt Nam.
- B. Hứa mọi hợp đồng Việt Nam cùng biểu mẫu — Chưa có bằng chứng cho kết luận đó.
- C. Chỉ tham khảo khái niệm chi phí, kiểm điều khoản và luật áp dụng riêng — Đúng: phân biệt khái niệm với yêu cầu pháp lý từng nơi.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

So hai bảng tiền giả lập; ghi một câu hỏi về phí còn thiếu, không đăng ký vay. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.consumerfinance.gov/ask-cfpb/what-is-a-truth-in-lending-disclosure-for-an-auto-loan-en-787/)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_auto_loans_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.10 — Chương 05: Lịch trả quan trọng như tổng tiền

**Năng lực:** borrowing.repayment-timing  
**Mục tiêu:** Nhận ra thiếu hụt trước ngày thu nhập và kiểm tra điều kiện trước khi đổi lịch hoặc vay bù.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 413 đơn vị cách trắng trong thân bài

Sau khi hiểu tổng chi phí, hãy đặt từng khoản trả lên lịch cùng thu nhập và nhu cầu sinh hoạt. Một hợp đồng có tổng thấp hơn vẫn có thể gây áp lực nếu các kỳ trả không phù hợp ngày bạn có tiền. Điều này không tự khiến một lựa chọn khác tốt hơn; nó cho bạn thêm tiêu chí cần kiểm tra. Số dư cuối tháng dương không bảo đảm mọi ngày trong tháng đều đủ tiền. Đặc biệt với thu nhập theo dự án, ngày khách hứa trả và ngày tiền thực về có thể khác nhau.

Bình có 900.000đ đầu kỳ. Ngày mười phải trả một khoản theo hợp đồng 700.000đ. Trước ngày mười lăm, Bình cần 300.000đ cho nhu cầu thiết yếu. Thu nhập 1.200.000đ dự kiến về ngày mười lăm. Trước ngày thu, phép tính là 900.000 − 700.000 − 300.000 = âm 100.000đ. Đến khi tiền về đủ và không có khoản khác, còn 1.100.000đ. Chỉ nhìn số cuối kỳ sẽ bỏ qua thiếu hụt 100.000đ trước đó. Đổi ngày trên ứng dụng không tự đổi ngày đến hạn trong hợp đồng.

Nếu thấy khoảng thiếu, hãy xác minh ngày thu và hỏi bên liên quan về lựa chọn thực tế trước hạn. Mọi thay đổi lịch cần được xác nhận, gồm phí và ảnh hưởng của nó. Trả một khoản phí gia hạn không nhất thiết làm giảm tiền gốc; phải đọc cách ghi nhận của chính hợp đồng. Vay mới để bù kỳ cũ có thể thêm nghĩa vụ, nên cần nhìn lịch tổng của tất cả khoản chứ không chỉ một kỳ đang gấp. Bài học không chọn sản phẩm vay hoặc khuyên bỏ một khoản thiết yếu để trả bằng mọi giá.

Trong Picket, lịch nhắc chỉ giúp nhớ; dấu hoàn thành phải khớp một khoản thanh toán thật đã được xác nhận. Nếu số tiền đã nằm trong giao dịch, đừng nhập thêm lần nữa từ lời nhắc. Có thể dùng ghi chú cho điều chưa rõ và quay lại sau. Khi nhận cảnh báo, bạn được quyền xem công thức và phạm vi thay vì chấp nhận một câu kết luận tuyệt đối. Thực hành bài này chỉ yêu cầu đánh dấu một ngày thiếu trong ví dụ và nghĩ một câu hỏi cần xác minh. Không cần cung cấp số hợp đồng, giấy tờ cá nhân hay thực hiện khoản trả thật để học được cách đọc lịch.

### Ví dụ và số học

Trước thu: 900.000 − 700.000 − 300.000 = −100.000đ. Sau thu: −100.000 + 1.200.000 = 1.100.000đ.

#### Ghi nhớ

- Đọc ngày trả và ngày thu bên cạnh tổng chi phí.
- Thiếu tiền trước hạn cần được nhận diện riêng, kể cả khi cuối kỳ còn dư.
- Một thay đổi lịch chỉ có thật khi bên liên quan đã đồng ý và điều kiện được xác nhận.

#### Hiểu lầm thường gặp

Sửa ngày trên ứng dụng là đã thay đổi nghĩa vụ với bên cho vay.

#### Tự kiểm tra — tình huống hư cấu

Nam có 120.000đ, khoản trả 200.000đ đến hạn ngày 18; thu nhập 500.000đ dự kiến ngày 25 và chi sinh hoạt 100.000đ ngày 27. Chỉ ra khoảng thiếu và hai việc cần kiểm tra trước khi sửa lịch.

#### Gợi ý giải từng bước

1. Ngày 18 thiếu 200.000 − 120.000 = 80.000đ.
2. Nếu tất cả khoản sau đó xảy ra đúng giả định, cuối kỳ là 120.000 − 200.000 + 500.000 − 100.000 = 320.000đ.
3. Cần kiểm ngày thu thực tế và liên hệ kênh chính thức để hỏi phương án, phí và điều kiện; chỉ cập nhật lịch khi có xác nhận, không mặc nhiên vay mới để bù.

#### Kết luận

Cuối kỳ dự kiến còn 320.000đ nhưng trước hạn vẫn thiếu 80.000đ. Picket không tự thương lượng hoặc gia hạn thay bạn.

- `900000-700000-300000 = -100000`
- `-100000+1200000 = 1100000`
- `200000-120000 = 80000`
- `120000-200000+500000-100000 = 320000`

### Tình huống thực hành

**1. Trước ngày mười lăm, Bình thiếu bao nhiêu theo ví dụ?**

- A. Không thiếu vì cuối kỳ dương — Tiền chưa về không trả được nhu cầu đến trước.
- B. 100.000đ — Đúng: đầu vào cho mức âm 100.000đ.
- C. 1.100.000đ — 1.100.000đ là số sau khoản thu.
Đáp án: **B** (`correctIndex: 1`).

**2. Bình sửa ngày nhắc trong Picket. Hạn hợp đồng có tự đổi không?**

- A. Có — Ứng dụng không sửa thỏa thuận với bên cho vay.
- B. Có nếu tắt thông báo — Tắt nhắc không đổi nghĩa vụ.
- C. Không, phải được bên liên quan xác nhận — Đúng: cần xác nhận thay đổi và điều kiện thực tế.
Đáp án: **C** (`correctIndex: 2`).

**3. Đóng phí gia hạn có chắc giảm tiền gốc không?**

- A. Không, cần đọc cách phân bổ trong hợp đồng — Đúng: phí và gốc có thể là hai khoản khác nhau.
- B. Chắc chắn giảm đủ bằng phí — Không có dữ kiện để khẳng định.
- C. Chắc chắn xóa nợ — Gia hạn không có nghĩa xóa nghĩa vụ.
Đáp án: **A** (`correctIndex: 0`).

### Hành động tự chọn

Đánh dấu khoảng thiếu trong lịch giả lập và viết câu hỏi về ngày trả hoặc phí. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_income_benefits_tool_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_auto_loans_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.19 — Chương 10: Quy đổi lãi suất để so sánh và nhận diện vay nặng lãi

**Năng lực:** borrowing.rate-conversion  
**Mục tiêu:** Quy đổi chi phí vay theo ngày, tháng về cùng một đơn vị năm và nhận ra dấu hiệu vay nặng lãi.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 225 đơn vị cách trắng trong thân bài

Lời mời vay có thể nêu chi phí theo ngày, theo tháng hoặc theo năm. Con số theo ngày trông rất nhỏ. Muốn so sánh, hãy quy về cùng một đơn vị, thường là phần trăm mỗi năm. Cách quy đổi đơn giản là nhân tỷ lệ tháng với 12, hoặc dùng 12 tháng 30 ngày. Phép tính này chưa gồm lãi kép, nên chi phí thật có thể còn cao hơn.

Ví dụ hư cấu: một ứng dụng quảng cáo "chỉ 3.000đ mỗi ngày cho mỗi 1.000.000đ". Mai vay 2.000.000đ, nên chi phí là 6.000đ mỗi ngày. Sau 30 ngày, Mai trả 180.000đ tiền chi phí. So với 2.000.000đ, đó là 9% mỗi tháng. Quy đổi đơn giản ra năm là 9 × 12 = 108%.

Bộ luật Dân sự 2015, Điều 468, quy định lãi suất thỏa thuận trong vay dân sự không vượt quá 20% mỗi năm, trừ trường hợp luật khác có quy định khác. Chi phí quy đổi cao hơn nhiều lần mức này là tín hiệu cần dừng lại và tìm hiểu kỹ.

Các dấu hiệu khác cần cảnh giác: đòi chuyển phí trước khi giải ngân, đòi quyền truy cập danh bạ, hối thúc ký ngay, hoặc không có hợp đồng rõ ràng. Trước khi vay, hãy đọc tổng số phải trả, lịch trả và mọi loại phí.

### Ví dụ và số học

3.000 × 2 = 6.000đ/ngày; 6.000 × 30 = 180.000đ/tháng; 180.000 / 2.000.000 = 9%/tháng; 9 × 12 = 108%/năm theo cách quy đổi đơn giản.

#### Ghi nhớ

- Quy chi phí vay về cùng một đơn vị năm trước khi so sánh.
- Phí theo ngày nhỏ có thể tương đương chi phí năm rất cao.
- Đòi phí trước, đòi danh bạ hoặc hối thúc là dấu hiệu cần dừng lại.

#### Hiểu lầm thường gặp

Nghĩ rằng 3.000đ mỗi ngày là rẻ vì con số nhỏ.

#### Tự kiểm tra — tình huống hư cấu

Vay 5.000.000đ, sau 2 tháng phải trả 5.400.000đ. Tính chi phí, tỷ lệ mỗi tháng và quy đổi đơn giản ra năm.

#### Gợi ý giải từng bước

1. Chi phí: 5.400.000 − 5.000.000 = 400.000đ.
2. Mỗi tháng: 400.000 / 2 = 200.000đ, tức 200.000 / 5.000.000 = 4%.
3. Quy đổi đơn giản: 4 × 12 = 48% mỗi năm.

#### Kết luận

Chi phí 400.000đ, tương đương 4% mỗi tháng hay khoảng 48% mỗi năm theo cách quy đổi đơn giản.

- `3000*2 = 6000`
- `6000*30 = 180000`
- `180000*100/2000000 = 9`
- `9*12 = 108`
- `5400000-5000000 = 400000`
- `400000/2 = 200000`
- `200000*100/5000000 = 4`
- `4*12 = 48`

### Tình huống thực hành

**1. Lãi 2% mỗi tháng, quy đổi đơn giản ra năm là bao nhiêu?**

- A. 2% — Đây vẫn là tỷ lệ một tháng.
- B. 24% — Đúng: 2 × 12 = 24%.
- C. 12% — Đây là nhân 6, không phải 12.
Đáp án: **B** (`correctIndex: 1`).

**2. Một lời mời vay yêu cầu chuyển "phí hồ sơ" trước khi giải ngân. Phản ứng an toàn là gì?**

- A. Chuyển phí cho nhanh — Chuyển tiền trước cho bên chưa xác minh có thể mất luôn khoản đó.
- B. Gửi ảnh căn cước để được duyệt nhanh — Gửi giấy tờ cho bên chưa xác minh làm tăng rủi ro bị lạm dụng.
- C. Dừng, không chuyển tiền trước và kiểm tra bên cho vay qua kênh chính thức — Đúng: xác minh trước, không chuyển tiền theo áp lực.
Đáp án: **C** (`correctIndex: 2`).

**3. Khoản A: vay 1.000.000đ, trả 1.050.000đ sau 1 tháng. Khoản B: vay 1.000.000đ, trả 1.100.000đ sau 2 tháng. So sánh nào đúng?**

- A. Cùng 5% mỗi tháng, nhưng tổng tiền lãi của B lớn hơn — Đúng: A 50.000đ/1 tháng, B 100.000đ/2 tháng; cùng 5% mỗi tháng.
- B. A rẻ hơn mỗi tháng — Mỗi tháng hai khoản như nhau.
- C. B rẻ hơn mỗi tháng — Mỗi tháng hai khoản như nhau, B chỉ kéo dài hơn.
Đáp án: **A** (`correctIndex: 0`).

### Hành động tự chọn

Nếu bạn đang có khoản vay, thêm lịch trả vào mục Hóa đơn của Picket và ghi tổng phải trả trong ghi chú. Không cần đăng ký hay so sánh sản phẩm vay thật. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Số liệu có nguồn và ngày

- Civil Code 2015 Article 468: agreed civil-loan interest may not exceed 20%/year unless another law provides otherwise — nguồn `civil-interest-cap`, mốc 2018-12-04

### Nguồn đã đọc

- [Nguồn tham khảo](https://baochinhphu.vn/huong-dan-ap-dung-phap-luat-ve-lai-suat-trong-giao-dich-dan-su-102248799.htm)
- [Nguồn tham khảo](https://www.consumerfinance.gov/ask-cfpb/what-is-a-truth-in-lending-disclosure-for-an-auto-loan-en-787/)
- [Nguồn tham khảo](https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304)

## picket.vi.financial.v1.20 — Chương 10: Khi có nhiều khoản nợ: giữ hạn tối thiểu, dồn phần dư

**Năng lực:** borrowing.multiple-debts  
**Mục tiêu:** Lập danh sách nợ, trả tối thiểu đúng hạn cho mọi khoản và chọn một cách dồn phần dư.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 229 đơn vị cách trắng trong thân bài

Khi có nhiều khoản nợ, hãy lập một danh sách: dư nợ, lãi suất, khoản trả tối thiểu và ngày đến hạn. Bước đầu tiên là trả đủ khoản tối thiểu của mọi khoản đúng hạn. Trễ hạn thường kéo theo phí phạt, lãi quá hạn và ảnh hưởng đến lịch sử tín dụng.

Phần tiền còn dư sau các khoản tối thiểu có thể dồn vào một khoản mục tiêu. Có hai cách phổ biến. Cách lãi cao trước dồn vào khoản có lãi suất cao nhất, thường giúp trả ít lãi hơn. Cách số dư nhỏ trước dồn vào khoản nhỏ nhất, giúp sớm xóa được một khoản và giữ động lực. Cách nào cũng được, miễn bạn duy trì được.

Ví dụ hư cấu: Khoa có thẻ A dư nợ 4.000.000đ, lãi 2,5% mỗi tháng, tối thiểu 200.000đ. Khoản B dư nợ 6.000.000đ, lãi 1% mỗi tháng, tối thiểu 500.000đ. Khoản C dư nợ 1.000.000đ, lãi 1,5% mỗi tháng, tối thiểu 100.000đ. Tổng tối thiểu là 800.000đ. Khoa có 1.300.000đ mỗi tháng, nên dư 500.000đ. Theo cách lãi cao trước, Khoa trả thẻ A 700.000đ. Lãi tháng đầu của thẻ A khoảng 100.000đ.

Chỉ trả tối thiểu thẻ tín dụng thì phần dư nợ còn lại vẫn có thể bị tính lãi. Vay khoản mới để trả khoản cũ cần đọc kỹ tổng chi phí trước.

### Ví dụ và số học

Tối thiểu: 200.000 + 500.000 + 100.000 = 800.000đ. Dư: 1.300.000 − 800.000 = 500.000đ. Trả thẻ A: 200.000 + 500.000 = 700.000đ. Lãi tháng đầu thẻ A: 4.000.000 × 2,5% = 100.000đ.

#### Ghi nhớ

- Lập danh sách nợ gồm dư nợ, lãi suất, khoản tối thiểu và ngày đến hạn.
- Trả đủ tối thiểu mọi khoản trước, rồi mới dồn phần dư.
- Lãi cao trước thường tiết kiệm lãi; số dư nhỏ trước giúp giữ động lực.

#### Hiểu lầm thường gặp

Dồn hết tiền vào một khoản và để các khoản khác trễ hạn.

#### Tự kiểm tra — tình huống hư cấu

Khoản X dư nợ 3.000.000đ, lãi 2% mỗi tháng, tối thiểu 300.000đ. Khoản Y dư nợ 800.000đ, lãi 1% mỗi tháng, tối thiểu 100.000đ. Có 700.000đ. Theo cách số dư nhỏ trước, trả Y bao nhiêu và Y còn bao nhiêu? Bỏ qua lãi phát sinh để đơn giản.

#### Gợi ý giải từng bước

1. Tối thiểu: 300.000 + 100.000 = 400.000đ.
2. Phần dư: 700.000 − 400.000 = 300.000đ.
3. Trả Y: 100.000 + 300.000 = 400.000đ; Y còn 800.000 − 400.000 = 400.000đ.

#### Kết luận

Trả X 300.000đ và Y 400.000đ; Y còn 400.000đ, chưa tính lãi phát sinh.

- `200000+500000+100000 = 800000`
- `1300000-800000 = 500000`
- `200000+500000 = 700000`
- `4000000*25/1000 = 100000`
- `300000+100000 = 400000`
- `700000-400000 = 300000`
- `100000+300000 = 400000`
- `800000-400000 = 400000`

### Tình huống thực hành

**1. Tổng tối thiểu 900.000đ, bạn có 1.200.000đ. Phần có thể dồn thêm là bao nhiêu?**

- A. 300.000đ — Đúng: 1.200.000 − 900.000 = 300.000đ.
- B. 1.200.000đ — Đây là toàn bộ tiền, chưa trừ các khoản tối thiểu.
- C. 900.000đ — Đây là phần tối thiểu, không phải phần dư.
Đáp án: **A** (`correctIndex: 0`).

**2. Cách lãi cao trước dồn phần dư vào đâu?**

- A. Khoản có số dư nhỏ nhất — Đó là cách số dư nhỏ trước.
- B. Khoản có lãi suất cao nhất, sau khi đã trả tối thiểu mọi khoản — Đúng: giữ hạn mọi khoản rồi dồn vào khoản lãi cao nhất.
- C. Khoản có tên quen nhất — Tên quen không liên quan đến chi phí.
Đáp án: **B** (`correctIndex: 1`).

**3. Chỉ trả tối thiểu thẻ tín dụng mỗi tháng thì sao?**

- A. Không còn bị tính lãi — Trả tối thiểu tránh trễ hạn nhưng không xóa lãi trên phần còn lại.
- B. Nợ tự xóa sau 12 tháng — Không có cơ chế tự xóa nợ như vậy.
- C. Dư nợ còn lại có thể tiếp tục bị tính lãi theo điều khoản thẻ — Đúng: cần đọc điều khoản thẻ để biết cách tính.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Thêm từng khoản trả nợ vào mục Hóa đơn của Picket với ngày đến hạn và số tối thiểu. Nếu muốn, tạo một túi "trả thêm" cho phần dư. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_prioritizing-bills_tool.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_auto_loans_tool_2018-11_ADA.pdf)
- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.11 — Chương 06: Dừng một nhịp trước yêu cầu OTP

**Năng lực:** safety.otp-and-phishing  
**Mục tiêu:** Nhận ra yêu cầu chuyển tiền hoặc chia sẻ bí mật đáng ngờ và xác minh qua kênh chính thức độc lập.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 428 đơn vị cách trắng trong thân bài

Một người biết tên hoặc chi tiết đơn hàng của bạn chưa chắc là người có quyền yêu cầu thao tác tài khoản. Kẻ giả mạo có thể dùng thông tin đúng để kể một câu chuyện gấp: phải xác minh ngay, nhận hoàn tiền hoặc tránh bị khóa. Khi câu chuyện thúc bạn bỏ bước kiểm tra, hãy dừng. Việc xuất hiện tên thương hiệu trên tin nhắn hay một logo quen không đủ để chứng minh kênh đó thật. Bài này tập trung vào cách xử lý yêu cầu, không yêu cầu bạn phân biệt mọi thủ thuật bằng mắt.

Ví dụ hoàn toàn giả lập: một người gọi nói hoàn 250.000đ cho Hà nhưng yêu cầu Hà chuyển trước 50.000đ và đọc mã OTP. Hà đang có 1.000.000đ. Nếu chuyển 50.000đ, số dư còn 950.000đ, chứ chưa thành 1.200.000đ vì khoản hoàn 250.000đ chỉ là lời hứa. Không có phép tính nào xác nhận người gọi đáng tin. Cách an toàn trong tình huống là ngừng thao tác, tự mở ứng dụng hoặc kênh chăm sóc chính thức mà Hà biết để kiểm tra. Không dùng ngay đường liên kết hay số gọi lại do người đó cung cấp.

Không gửi OTP, mật khẩu hay thông tin đăng nhập cho người gọi hoặc người nhắn tin. Mã xác thực chỉ nên được dùng trong thao tác do chính bạn chủ động thực hiện ở kênh chính thức đã kiểm tra, sau khi hiểu nội dung đang xác nhận. Không cài ứng dụng, cấp quyền điều khiển thiết bị hoặc quét mã lạ theo chỉ dẫn hoàn tiền. Nếu đã thao tác và nghi bị lừa, dừng giao dịch; liên hệ ngân hàng qua kênh chính thức để được hướng dẫn bảo vệ tài khoản, giữ bằng chứng và trình báo cơ quan Công an. Không bảo đảm tiền chắc chắn được lấy lại.

Trong Picket, bài thực hành dùng tình huống mô phỏng. Ứng dụng không cần OTP ngân hàng, ảnh thẻ hoặc mật khẩu để chấm câu trả lời. Không nhập một mã thật vào ô học tập và không gửi ảnh màn hình chứa bí mật. Khi nhận yêu cầu khẩn, có thể tự hỏi: ai khởi đầu liên hệ, tôi đang xác nhận điều gì, có thể xác minh độc lập bằng cách nào? Việc dừng để hỏi không phải lỗi của bạn. Nếu đã mắc bẫy, tập trung các bước bảo vệ và hỗ trợ; đừng để xấu hổ làm chậm việc báo cho đơn vị có khả năng xử lý.

### Ví dụ và số học

1.000.000 − 50.000 = 950.000đ; 250.000đ được hứa chưa phải thu nhập đã nhận. Giả định nhận và chuyển mới cho 1.200.000đ, không dùng để đánh giá độ tin cậy.

#### Ghi nhớ

- Biết đúng thông tin đơn hàng không chứng minh người gọi là nhân viên thật.
- Không cung cấp OTP, mật khẩu hoặc quyền điều khiển máy theo yêu cầu hoàn tiền lạ.
- Dừng trao đổi và tự tìm kênh chính thức để xác minh; giữ bằng chứng nếu nghi bị lừa.

#### Hiểu lầm thường gặp

Người gọi đọc đúng tên hàng và số tiền thì có thể tin mọi hướng dẫn sau đó.

#### Tự kiểm tra — tình huống hư cấu

Một người gọi nói sẽ hoàn 350.000đ, đọc đúng tên món hàng rồi yêu cầu OTP và cài ứng dụng điều khiển máy để nhận tiền. Bạn chưa thực hiện bước nào. Hãy nêu ba hành động an toàn và giải thích vì sao số tiền hứa hoàn chưa được ghi là thu nhập.

#### Gợi ý giải từng bước

1. Dừng thao tác; không đọc OTP, nhập bí mật vào đường dẫn lạ hay cấp quyền điều khiển máy.
2. Mở ứng dụng hoặc kênh liên hệ chính thức mà bạn tự xác định để kiểm tra yêu cầu, không dùng riêng số liên lạc người gọi gửi.
3. Giữ nội dung liên hệ cần thiết; nếu đã lộ thông tin hoặc thấy giao dịch lạ, liên hệ ngay ngân hàng/kênh chức năng chính thức để được hướng dẫn, không hứa chắc thu hồi tiền.

#### Kết luận

350.000đ mới là lời hứa của người gọi. Chưa có khoản nhận tiền được xác nhận thì không ghi thành thu nhập thật.

- `1000000-50000 = 950000`
- `1000000-50000+250000 = 1200000`

### Tình huống thực hành

**1. Người gọi biết đúng đơn hàng và đòi OTP để hoàn tiền. Nên?**

- A. Đọc mã vì họ biết thông tin — Biết thông tin không chứng minh danh tính và quyền truy cập.
- B. Dừng và xác minh bằng kênh chính thức độc lập — Đúng: không chia sẻ bí mật theo yêu cầu người gọi.
- C. Chỉ đọc nửa mã — Vẫn làm lộ thông tin, không tạo cách xác minh an toàn.
Đáp án: **B** (`correctIndex: 1`).

**2. Hà chuyển 50.000đ, khoản hoàn chưa về. Số dư từ 1.000.000đ còn?**

- A. 950.000đ — Đúng: chỉ ghi tiền thực đã ra.
- B. 1.200.000đ — Đã tính khoản hứa như tiền nhận thật.
- C. 1.250.000đ — Vừa cộng tiền chưa về vừa bỏ khoản đã chuyển.
Đáp án: **A** (`correctIndex: 0`).

**3. Đã bấm liên kết và nghi lộ thông tin. Phản ứng phù hợp?**

- A. Chờ vì báo sẽ xấu hổ — Chậm xử lý có thể làm tăng rủi ro.
- B. Chuyển thêm tiền để lấy lại — Lời hứa lấy lại tiền có thể tiếp tục là bẫy.
- C. Dừng, liên hệ ngân hàng chính thức, giữ bằng chứng và trình báo — Đúng: ưu tiên bảo vệ; không có bảo đảm thu hồi.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Đọc kịch bản và viết kênh xác minh độc lập; tuyệt đối không dùng OTP hoặc liên kết lạ thật. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304)
- [Nguồn tham khảo](https://vcc.gov.vn/default.aspx?category_id=9343771e-96be-48b5-a35d-b8ea9bc1aa93&do=detail&id=04a6bd22-786c-4d56-983c-923cce86ec7c&page=news)

## picket.vi.financial.v1.21 — Chương 11: Nhận diện các kịch bản lừa đảo phổ biến

**Năng lực:** safety.common-scam-scripts  
**Mục tiêu:** Nhận ra các kịch bản lừa đảo thường gặp và chọn hành động an toàn theo khuyến cáo chính thức.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 241 đơn vị cách trắng trong thân bài

Kẻ lừa đảo thường dùng vài kịch bản lặp lại. Giả danh cơ quan hoặc ngân hàng để đòi chuyển tiền "xác minh". Mời "việc nhẹ lương cao" hoặc "làm nhiệm vụ", cho rút ít tiền lúc đầu rồi đòi nạp số lớn. Hỏi mua, thuê hoặc mượn tài khoản ngân hàng. Gửi đường link hay ứng dụng lạ rồi xin quyền điều khiển máy.

Ngân hàng Nhà nước khuyến cáo ngày 31/3/2025: không cung cấp mật khẩu, mã OTP hay thông tin thẻ cho bất kỳ ai, kể cả nhân viên ngân hàng. Từ 1/1/2025, ngân hàng không gửi tin nhắn hay email chứa đường link. Chỉ cài ứng dụng từ kho chính thức và không cấp quyền Trợ năng cho ứng dụng lạ. Ngày 10/3/2026, lực lượng Công an khuyến cáo không mở tài khoản để cho thuê, cho mượn hay bán lại; người làm vậy có thể bị xử phạt hoặc truy cứu trách nhiệm.

Ví dụ hư cấu về "nhiệm vụ": Vi nạp 200.000đ và nhận lại 260.000đ. Sau đó Vi được yêu cầu nạp 2.000.000đ để "mở khóa hoa hồng". Nếu tài khoản bị chặn lúc này, Vi đã nạp 2.200.000đ, nhận về 260.000đ, mất 1.940.000đ. Nếu nạp tiếp 5.000.000đ, khoản mất là 6.940.000đ. Lần rút đầu chỉ là mồi.

Khi nghi ngờ: dừng lại, không chuyển thêm, liên hệ ngân hàng qua kênh chính thức, giữ bằng chứng và trình báo cơ quan công an.

### Ví dụ và số học

Đã nạp: 200.000 + 2.000.000 = 2.200.000đ. Mất sau khi trừ tiền nhận về: 2.200.000 − 260.000 = 1.940.000đ. Nếu nạp tiếp: 1.940.000 + 5.000.000 = 6.940.000đ.

#### Ghi nhớ

- Không đưa OTP, mật khẩu hay thông tin thẻ cho ai, kể cả người xưng nhân viên ngân hàng.
- Lần rút được tiền đầu tiên không chứng minh mô hình là thật.
- Không cho thuê, cho mượn hay bán tài khoản ngân hàng.

#### Hiểu lầm thường gặp

Nghĩ rằng người gọi biết đúng tên và số tài khoản thì chắc là người thật.

#### Tự kiểm tra — tình huống hư cấu

Hùng có 35.000.000đ. Một người gọi xưng cơ quan chức năng yêu cầu chuyển 30.000.000đ vào "tài khoản tạm giữ" để xác minh. Nếu chuyển, Hùng còn bao nhiêu và có gì bảo đảm sẽ nhận lại?

#### Gợi ý giải từng bước

1. Nếu chuyển: 35.000.000 − 30.000.000 = 5.000.000đ còn lại.
2. Lời hứa trả lại không phải tiền đã nhận; số được bảo đảm là 0đ.
3. Hành động an toàn: dừng, không chuyển, tự liên hệ cơ quan qua kênh chính thức và trình báo.

#### Kết luận

Hùng chỉ còn 5.000.000đ và không có gì bảo đảm nhận lại; cần dừng và xác minh trực tiếp.

- `200000+2000000 = 2200000`
- `2200000-260000 = 1940000`
- `1940000+5000000 = 6940000`
- `35000000-30000000 = 5000000`

### Tình huống thực hành

**1. Tin nhắn xưng ngân hàng chứa đường link yêu cầu cập nhật thông tin. Theo khuyến cáo, nên làm gì?**

- A. Bấm link vì có logo ngân hàng — Logo dễ bị giả mạo; ngân hàng đã ngừng gửi link qua tin nhắn.
- B. Không bấm; tự mở ứng dụng chính thức hoặc gọi số tổng đài in trên thẻ — Đúng: tự đi qua kênh chính thức bạn đã biết.
- C. Trả lời tin nhắn kèm mã OTP — Không gửi OTP cho bất kỳ ai.
Đáp án: **B** (`correctIndex: 1`).

**2. Người lạ trả 500.000đ mỗi tháng để "mượn" tài khoản ngân hàng của bạn. Điều nào đúng?**

- A. Tài khoản có thể bị dùng cho lừa đảo hoặc rửa tiền; bạn có thể bị xử phạt hoặc truy cứu — Đúng: Công an đã cảnh báo rõ rủi ro này.
- B. Đây là thu nhập thụ động an toàn — Rủi ro pháp lý và tài chính rơi vào chủ tài khoản.
- C. Hợp pháp nếu chỉ cho mượn một tháng — Thời gian ngắn không làm hành vi trở nên an toàn.
Đáp án: **A** (`correctIndex: 0`).

**3. Một ứng dụng tải từ link lạ đòi cấp quyền Trợ năng. Nên làm gì?**

- A. Cấp quyền để ứng dụng chạy — Quyền này có thể cho ứng dụng đọc và điều khiển màn hình.
- B. Cấp rồi tắt sau — Chỉ vài giây cũng đủ để lấy thông tin.
- C. Từ chối, gỡ ứng dụng và báo ngân hàng nếu đã nhập thông tin — Đúng: theo khuyến cáo của Ngân hàng Nhà nước.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Xem lại danh sách giao dịch trong Picket tuần này để tìm khoản chuyển bạn không nhận ra. Nếu có, liên hệ ngân hàng qua số tổng đài chính thức. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Số liệu có nguồn và ngày

- SBV: never share OTP/passwords even with bank staff; banks stop sending links in SMS/email from 2025-01-01; do not grant Accessibility permission — nguồn `sbv-security`, mốc 2025-03-31
- Police warning: renting, lending or selling bank accounts may lead to administrative or criminal liability — nguồn `account-rental`, mốc 2026-03-10

### Nguồn đã đọc

- [Nguồn tham khảo](https://sbv.gov.vn/en/w/sbv624798)
- [Nguồn tham khảo](https://xaydungchinhsach.chinhphu.vn/khuyen-cao-hoc-sinh-sinh-vien-khong-mo-tai-khoan-ngan-hang-de-cho-thue-cho-muon-ban-lai-119260310141959148.htm)
- [Nguồn tham khảo](https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304)
- [Nguồn tham khảo](https://vcc.gov.vn/default.aspx?category_id=9343771e-96be-48b5-a35d-b8ea9bc1aa93&do=detail&id=04a6bd22-786c-4d56-983c-923cce86ec7c&page=news)

## picket.vi.financial.v1.23 — Chương 12: Bảo hiểm cơ bản: đọc quyền lợi, loại trừ và phí

**Năng lực:** protection.insurance-basics  
**Mục tiêu:** Hiểu bảo hiểm chuyển một phần rủi ro, đọc các điều khoản chính và tính phần mình tự trả.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 233 đơn vị cách trắng trong thân bài

Bảo hiểm là cách chuyển một phần rủi ro tài chính sang công ty bảo hiểm, đổi lại bạn đóng phí. Bảo hiểm hữu ích nhất với những rủi ro bạn khó tự gánh, như chi phí điều trị lớn. Nó không phải cách làm giàu và khác với gửi tiết kiệm.

Trước khi ký, hãy đọc: quyền lợi được chi trả, số tiền bảo hiểm, các điều khoản loại trừ, thời gian chờ, tỷ lệ đồng chi trả, lịch đóng phí và điều gì xảy ra nếu dừng đóng sớm. Nếu người tư vấn mô tả hợp đồng như "gửi tiết kiệm lãi cao", hãy hỏi lại: đây là hợp đồng bảo hiểm, vậy giá trị hoàn lại nếu dừng sớm là bao nhiêu?

Ví dụ hư cấu: một hợp đồng sức khỏe có đồng chi trả 20%. Chi phí điều trị hợp lệ là 10.000.000đ. Bạn tự trả 2.000.000đ, bảo hiểm trả 8.000.000đ nếu khoản đó nằm trong phạm vi. Nếu phí năm là 6.000.000đ, bạn cần dành 500.000đ mỗi tháng. Đóng trong 15 năm, tổng phí là 90.000.000đ.

Luật Kinh doanh bảo hiểm 2022, Điều 35, cho bên mua hợp đồng bảo hiểm nhân thọ hoặc sức khỏe có thời hạn trên 1 năm 21 ngày cân nhắc kể từ khi nhận hợp đồng. Hãy dùng thời gian này để đọc kỹ. Mua theo nhu cầu, không theo áp lực.

### Ví dụ và số học

Bạn trả: 10.000.000 × 20% = 2.000.000đ; bảo hiểm trả: 10.000.000 − 2.000.000 = 8.000.000đ. Phí: 6.000.000 / 12 = 500.000đ/tháng; 6.000.000 × 15 = 90.000.000đ tổng phí.

#### Ghi nhớ

- Bảo hiểm chuyển một phần rủi ro, không phải công cụ làm giàu.
- Đọc quyền lợi, loại trừ, thời gian chờ, đồng chi trả và giá trị hoàn lại.
- Hợp đồng nhân thọ, sức khỏe trên 1 năm có 21 ngày cân nhắc.

#### Hiểu lầm thường gặp

Coi hợp đồng bảo hiểm có yếu tố đầu tư giống hệt sổ tiết kiệm.

#### Tự kiểm tra — tình huống hư cấu

Phí bảo hiểm 4.800.000đ mỗi năm, đóng một lần. Mỗi tháng cần dành bao nhiêu? Đóng 10 năm thì tổng phí là bao nhiêu?

#### Gợi ý giải từng bước

1. Mỗi tháng: 4.800.000 / 12 = 400.000đ.
2. Tổng 10 năm: 4.800.000 × 10 = 48.000.000đ.
3. So tổng phí với quyền lợi thực sự cần để quyết định có phù hợp không.

#### Kết luận

Dành 400.000đ mỗi tháng; tổng phí 10 năm là 48.000.000đ.

- `10000000*20/100 = 2000000`
- `10000000-2000000 = 8000000`
- `6000000/12 = 500000`
- `6000000*15 = 90000000`
- `4800000/12 = 400000`
- `4800000*10 = 48000000`

### Tình huống thực hành

**1. Hợp đồng có đồng chi trả 30%, chi phí hợp lệ 5.000.000đ. Phần bạn tự trả là bao nhiêu?**

- A. 1.500.000đ — Đúng: 5.000.000 × 30% = 1.500.000đ.
- B. 3.500.000đ — Đây là phần bảo hiểm trả.
- C. 5.000.000đ — Đây là toàn bộ chi phí.
Đáp án: **A** (`correctIndex: 0`).

**2. Thời gian cân nhắc 21 ngày theo Luật Kinh doanh bảo hiểm 2022 áp dụng cho loại hợp đồng nào?**

- A. Mọi hợp đồng, kể cả bảo hiểm xe 1 năm — Quy định này không áp cho mọi loại hợp đồng.
- B. Hợp đồng bảo hiểm nhân thọ hoặc sức khỏe có thời hạn trên 1 năm — Đúng: theo Điều 35 Luật Kinh doanh bảo hiểm 2022.
- C. Chỉ hợp đồng mua trực tuyến — Kênh mua không quyết định quyền này.
Đáp án: **B** (`correctIndex: 1`).

**3. Người tư vấn nói hợp đồng là "gửi tiết kiệm lãi cao". Nên làm gì?**

- A. Ký ngay vì lãi cao — Ký vội khi chưa hiểu sản phẩm là rủi ro.
- B. Gửi ảnh căn cước trước để giữ suất — Không cần gửi giấy tờ để "giữ suất".
- C. Đọc kỹ: đây là bảo hiểm; hỏi quyền lợi, phí và giá trị hoàn lại nếu dừng sớm — Đúng: phân biệt bảo hiểm với tiền gửi trước khi quyết định.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Nếu đang có hợp đồng bảo hiểm, thêm ngày đóng phí vào mục Hóa đơn của Picket và tạo một túi cho phí năm chia 12. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Số liệu có nguồn và ngày

- Insurance Business Law 08/2022/QH15 Article 35: 21-day free-look for life/health contracts with a term over 1 year — nguồn `insurance-free-look`, mốc 2023-03-13

### Nguồn đã đọc

- [Nguồn tham khảo](https://thoibaotaichinhvietnam.vn/nen-su-dung-dac-quyen-21-ngay-khi-mua-bao-hiem-nhan-tho-123293.html)
- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.12 — Chương 06: Dùng thử và khoảng chờ trước khi mua

**Năng lực:** safety.renewals-and-deliberate-buying  
**Mục tiêu:** Nhận diện ngày gia hạn, kiểm trạng thái hủy và so quyết định mua có điều kiện mà không phán xét sở thích.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 426 đơn vị cách trắng trong thân bài

Dùng thử miễn phí có thể chuyển thành gói trả tiền nếu bạn không hủy theo điều kiện đã đồng ý. Trước khi bắt đầu, hãy tìm giá sau dùng thử, chu kỳ, ngày gia hạn và cách hủy thực tế. Một nhãn miễn phí không nói hết các điều kiện. Nếu chưa hiểu, bạn có thể chưa đăng ký. Tương tự, xóa biểu tượng ứng dụng khỏi điện thoại không tự chứng minh một gói đăng ký đã hủy; cần xem trạng thái tại nơi quản lý gói và giữ xác nhận nếu có.

Ví dụ giả lập: Yến đang trả 79.000đ mỗi tháng cho dịch vụ A và 49.000đ cho dịch vụ B. Tổng theo tháng là 128.000đ. Nếu cả hai giữ nguyên giá, hoạt động đủ mười hai tháng và không có phí khác, tổng là 1.536.000đ. Yến cũng đang xem một món đồ giá 450.000đ, dự kiến dùng sáu lần. Giá chia số lần là 75.000đ mỗi lần theo dự định đó; chưa chứng minh Yến chắc chắn dùng đủ sáu lần. Các con số giúp nhìn quy mô và giả định, không tự ra quyết định thay Yến.

Một khoảng chờ tự chọn trước món mua linh hoạt có thể cho bạn thời gian so với kế hoạch, đọc điều kiện và xem nhu cầu còn phù hợp không. Có thể ghi lại món định mua rồi quay lại vào thời điểm bạn chọn. Đây là mẹo suy nghĩ, không phải thời hạn pháp lý được bảo đảm, cũng không áp dụng cứng cho thuốc hay nhu cầu cấp thiết. Hết khoảng chờ, mua hoặc không mua đều có thể hợp lý tùy điều kiện. Không cần giữ một chuỗi ngày nhịn mua để chứng minh bạn biết quản lý tiền.

Trong Picket, đánh dấu một khoản định kỳ cần xem lại không có nghĩa dịch vụ bên ngoài đã hủy. Nếu muốn hủy thật, hãy tự thực hiện ở kênh chính thức và xác nhận kết quả trước khi sửa lịch tương lai. Một khoản đã bị thu vẫn là sự việc cần ghi đúng; yêu cầu hoàn tiền chưa được duyệt không nên ghi là tiền đã về. Nhắc trước gia hạn chỉ bật khi bạn chọn và cần tránh nhắc trùng. Thực hành bài này có thể chỉ là rà hai ví dụ hoặc viết câu hỏi về điều kiện dùng thử. Không cần đăng ký gói, mua món đồ hay cung cấp thẻ để hoàn thành bài; mục tiêu là giữ lựa chọn của bạn rõ ràng.

### Ví dụ và số học

79.000 + 49.000 = 128.000đ/tháng; 128.000 × 12 = 1.536.000đ/năm theo giả định; 450.000 / 6 = 75.000đ/lần dự kiến.

#### Ghi nhớ

- Đọc giá sau dùng thử, ngày thu tiếp theo và cách hủy trước khi quyết định.
- Xóa ứng dụng hoặc đánh dấu xem lại trong Picket không tự hủy thuê bao bên ngoài.
- Quy đổi chi phí về cùng khoảng thời gian và ghi rõ giả định về giá, số kỳ.

#### Hiểu lầm thường gặp

Dịch vụ ít dùng hoặc đã gỡ ứng dụng thì chắc chắn không bị thu tiền nữa.

#### Tự kiểm tra — tình huống hư cấu

Một gói sẽ thu 59.000đ mỗi tháng sau dùng thử; gói khác đang là 89.000đ mỗi tháng. Nếu cả hai giữ nguyên giá suốt 12 tháng, tổng là bao nhiêu? Với giới hạn tự chọn 120.000đ mỗi tháng, điều gì cần xem lại trước ngày gia hạn?

#### Gợi ý giải từng bước

1. Tổng mỗi tháng là 59.000 + 89.000 = 148.000đ, vượt mức tự chọn 28.000đ.
2. Nếu giữ nguyên cả hai đủ 12 tháng, tổng là 148.000 × 12 = 1.776.000đ; giá thay đổi hoặc hủy giữa kỳ sẽ làm giả định khác đi.
3. Rà nhu cầu, điều kiện và thời điểm hủy qua kênh chính thức; kiểm trạng thái xác nhận trước khi sửa lịch, không đăng ký thêm chỉ để thực hành.

#### Kết luận

Tổng giả định là 148.000đ mỗi tháng và 1.776.000đ cho 12 tháng. Một nhắc việc trong Picket chưa chứng minh dịch vụ đã dừng thu.

- `79000+49000 = 128000`
- `128000*12 = 1536000`
- `450000/6 = 75000`
- `59000+89000 = 148000`
- `148000-120000 = 28000`
- `148000*12 = 1776000`

### Tình huống thực hành

**1. Xóa ứng dụng khỏi điện thoại có đủ chứng minh gói đã hủy?**

- A. Có, luôn tự hủy — Xóa app và hủy đăng ký là hai thao tác khác nhau.
- B. Không, cần kiểm trạng thái nơi quản lý đăng ký — Đúng: cần xác nhận tại kênh quản lý chính thức.
- C. Có nếu không mở app — Không sử dụng không tự thay điều kiện thanh toán.
Đáp án: **B** (`correctIndex: 1`).

**2. Hai gói giữ nguyên giá trong 12 tháng như ví dụ. Tổng?**

- A. 128.000đ — Đây là tổng một tháng.
- B. 1.536.000đ — Đúng: 128.000 nhân mười hai.
- C. 450.000đ — Đây là giá món đồ khác, không phải hai gói.
Đáp án: **B** (`correctIndex: 1`).

**3. Picket đánh dấu cần xem lại gói B. Có thể coi đã ngừng tính phí chưa?**

- A. Có ngay khi đánh dấu — Ghi chú trong Picket không điều khiển dịch vụ bên ngoài.
- B. Có sau một ngày chờ bất kỳ — Khoảng chờ tự chọn không làm thay đổi hợp đồng.
- C. Chưa, phải hủy và xác nhận ở nhà cung cấp/kênh quản lý — Đúng: chỉ cập nhật lịch khi biết kết quả thực tế.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Rà giá/ngày gia hạn trên một ví dụ hoặc gói có sẵn; có thể bỏ qua, không đăng ký thêm. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions)

## picket.vi.financial.v1.25 — Chương 12: Quyền người tiêu dùng và khiếu nại có chứng từ

**Năng lực:** consumer.rights-and-complaints  
**Mục tiêu:** Biết các quyền cơ bản của người tiêu dùng và các bước khiếu nại có chứng từ.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 235 đơn vị cách trắng trong thân bài

Luật Bảo vệ quyền lợi người tiêu dùng 2023 có hiệu lực từ 1/7/2024. Người bán không được đưa thông tin sai hoặc gây nhầm lẫn về hàng hóa và điều kiện giao dịch. Người bán không được làm phiền bằng cách liên tục chào mời trái ý muốn, hay ép mua. Khi hàng không đúng như đã đăng ký, quảng cáo hoặc cam kết, người tiêu dùng có quyền yêu cầu đổi hoặc hoàn tiền theo quy định.

Khiếu nại hiệu quả cần chứng từ. Hãy giữ hóa đơn, ảnh sản phẩm, ảnh mô tả lúc mua và tin nhắn với người bán. Liên hệ người bán trước, nêu rõ vấn đề và điều bạn yêu cầu. Nếu không được giải quyết, có thể chuyển tới sàn thương mại điện tử, tổ chức bảo vệ người tiêu dùng hoặc cơ quan quản lý. Với thanh toán qua thẻ hay ví, hãy hỏi đơn vị thanh toán qua kênh chính thức.

Ví dụ hư cấu: Thảo mua tai nghe 650.000đ, phí giao 30.000đ, tổng 680.000đ. Hàng giao sai mẫu. Nếu người bán chỉ hoàn giá hàng, Thảo nhận 650.000đ và vẫn mất 30.000đ phí giao. Thảo chỉ ghi khoản hoàn vào sổ khi tiền thực sự về.

Cẩn thận với người lạ nhắn tin hứa "hỗ trợ hoàn tiền" rồi đòi phí hay OTP. Kênh khiếu nại chính thức không cần mã OTP của bạn.

### Ví dụ và số học

Đã trả: 650.000 + 30.000 = 680.000đ. Nếu chỉ hoàn giá hàng, phần không được hoàn: 680.000 − 650.000 = 30.000đ.

#### Ghi nhớ

- Hàng không đúng cam kết có thể được đổi hoặc hoàn theo quy định.
- Giữ hóa đơn, ảnh và tin nhắn trước khi khiếu nại.
- Liên hệ người bán trước, rồi mới đến sàn, tổ chức bảo vệ người tiêu dùng hay cơ quan quản lý.

#### Hiểu lầm thường gặp

Nghĩ rằng phải trả phí cho người "hỗ trợ" thì mới được hoàn tiền.

#### Tự kiểm tra — tình huống hư cấu

Mua hai món 240.000đ và 360.000đ, phí giao 20.000đ. Trả lại món 360.000đ và được hoàn đúng 360.000đ. Chi tiêu thực sau cùng là bao nhiêu?

#### Gợi ý giải từng bước

1. Đã trả: 240.000 + 360.000 + 20.000 = 620.000đ.
2. Khoản hoàn đã về: 360.000đ.
3. Chi thực: 620.000 − 360.000 = 260.000đ.

#### Kết luận

Chi tiêu thực là 260.000đ, gồm món giữ lại và phí giao.

- `650000+30000 = 680000`
- `680000-650000 = 30000`
- `240000+360000+20000 = 620000`
- `620000-360000 = 260000`

### Tình huống thực hành

**1. Hàng nhận khác mô tả đã quảng cáo. Bước đầu hợp lý là gì?**

- A. Lưu chứng từ, ảnh và liên hệ người bán với yêu cầu cụ thể — Đúng: có chứng từ và yêu cầu rõ ràng giúp giải quyết nhanh hơn.
- B. Đăng thông tin cá nhân của người bán lên mạng — Hành vi này có thể gây rắc rối pháp lý cho chính bạn.
- C. Chuyển phí cho người lạ hứa hỗ trợ hoàn tiền — Đây là kịch bản lừa đảo thường gặp.
Đáp án: **A** (`correctIndex: 0`).

**2. Người bán đồng ý hoàn 650.000đ nhưng tiền chưa về. Trong Picket nên làm gì?**

- A. Ghi khoản thu ngay — Lời hứa chưa phải tiền đã nhận.
- B. Chờ tiền về rồi mới ghi khoản hoàn; có thể ghi chú là đang chờ — Đúng: chỉ ghi khi tiền thực sự về.
- C. Xóa giao dịch mua cũ — Giao dịch mua đã xảy ra và vẫn cần lưu.
Đáp án: **B** (`correctIndex: 1`).

**3. Người bán gọi điện chào mời nhiều lần dù bạn đã từ chối. Theo bài, đây là gì?**

- A. Hành vi bình thường luôn được phép — Luật 2023 cấm làm phiền trái ý muốn.
- B. Chỉ sai nếu gọi vào ban đêm — Luật không chỉ giới hạn theo giờ gọi.
- C. Hành vi bị cấm khi liên tục làm phiền trái ý muốn người tiêu dùng — Đúng: đây là một trong các hành vi bị cấm.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Khi mua hàng, đính kèm ảnh hóa đơn vào giao dịch trong Picket để có chứng từ nếu cần khiếu nại sau này. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Số liệu có nguồn và ngày

- Consumer Protection Law 2023 effective 2024-07-01; bans misleading information, harassment and coercion — nguồn `consumer-law-2023`, mốc 2024-07-01

### Nguồn đã đọc

- [Nguồn tham khảo](https://pbgdpl.cantho.gov.vn/bao-ve-tot-hon-quyen-loi-nguoi-tieu-dung)
- [Nguồn tham khảo](https://vcc.gov.vn/default.aspx?category_id=9343771e-96be-48b5-a35d-b8ea9bc1aa93&do=detail&id=04a6bd22-786c-4d56-983c-923cce86ec7c&page=news)
- [Nguồn tham khảo](https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions)

# Giai đoạn 4: Phát triển

Hiểu lãi kép, tiền gửi, lạm phát, rủi ro và cách rà soát định kỳ.

## picket.vi.financial.v1.26 — Chương 13: Lãi kép: tiền lãi cũng sinh lãi

**Năng lực:** saving.compound-interest  
**Mục tiêu:** Phân biệt lãi đơn với lãi kép và tính số dư qua nhiều kỳ ghép lãi.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 186 đơn vị cách trắng trong thân bài

Lãi đơn chỉ tính trên tiền gốc ban đầu. Lãi kép tính trên cả tiền gốc và phần lãi đã được cộng vào. Theo thời gian, khoảng cách giữa hai cách tính lớn dần. Vì vậy, bắt đầu sớm và duy trì đều đặn thường quan trọng hơn một lần góp lớn.

Ví dụ hư cấu: Phúc có 10.000.000đ, lãi suất giả định 6% mỗi năm, ghép lãi mỗi năm một lần. Năm thứ nhất, lãi là 600.000đ, số dư thành 10.600.000đ. Năm thứ hai, lãi tính trên 10.600.000đ nên là 636.000đ, số dư thành 11.236.000đ. Nếu là lãi đơn, sau 2 năm Phúc có 11.200.000đ. Chênh lệch 36.000đ đến từ lãi của tiền lãi. Sau nhiều năm, chênh lệch này lớn hơn nhiều.

Lãi kép cũng tác động theo chiều ngược lại với nợ. Dư nợ không trả và lãi cộng dồn khiến nợ tăng nhanh hơn theo thời gian.

Lãi suất trong bài là giả định để học cách tính, không phải lời hứa về lợi nhuận. Lãi suất thật phụ thuộc sản phẩm, kỳ hạn và thời điểm, và có thể thay đổi.

### Ví dụ và số học

Năm 1: 10.000.000 × 6% = 600.000đ. Năm 2: 10.600.000 × 6% = 636.000đ; 10.600.000 + 636.000 = 11.236.000đ. Lãi đơn: 10.000.000 + 2 × 600.000 = 11.200.000đ. Chênh lệch: 36.000đ.

#### Ghi nhớ

- Lãi kép tính lãi trên cả lãi đã cộng vào gốc.
- Thời gian và sự đều đặn làm lãi kép rõ rệt hơn.
- Với nợ, lãi kép làm số phải trả tăng nhanh hơn.

#### Hiểu lầm thường gặp

Nghĩ rằng lãi kép chỉ khác lãi đơn một chút nên không đáng quan tâm.

#### Tự kiểm tra — tình huống hư cấu

20.000.000đ, lãi giả định 5% mỗi năm, ghép lãi hằng năm. Tính số dư sau 3 năm.

#### Gợi ý giải từng bước

1. Năm 1: 20.000.000 × 105% = 21.000.000đ.
2. Năm 2: 21.000.000 × 105% = 22.050.000đ.
3. Năm 3: 22.050.000 × 105% = 23.152.500đ.

#### Kết luận

Sau 3 năm số dư là 23.152.500đ theo giả định của bài.

- `10000000*6/100 = 600000`
- `10600000*6/100 = 636000`
- `10600000+636000 = 11236000`
- `10000000+2*600000 = 11200000`
- `11236000-11200000 = 36000`
- `20000000*105/100 = 21000000`
- `21000000*105/100 = 22050000`
- `22050000*105/100 = 23152500`

### Tình huống thực hành

**1. 5.000.000đ, lãi giả định 10% mỗi năm, ghép lãi hằng năm. Sau 2 năm có bao nhiêu?**

- A. 6.000.000đ — Đây là lãi đơn: 5.000.000 + 2 × 500.000.
- B. 6.050.000đ — Đúng: 5.500.000 × 110% = 6.050.000đ.
- C. 5.500.000đ — Đây mới là sau 1 năm.
Đáp án: **B** (`correctIndex: 1`).

**2. Lãi kép khác lãi đơn ở điểm nào?**

- A. Lãi được tính cả trên phần lãi đã cộng vào gốc — Đúng: đó là định nghĩa của lãi kép.
- B. Lãi luôn cao gấp đôi — Không có quy tắc gấp đôi.
- C. Không có rủi ro — Cách tính lãi không loại bỏ rủi ro của sản phẩm.
Đáp án: **A** (`correctIndex: 0`).

**3. Dư nợ thẻ không trả và lãi được cộng dồn. Lãi kép tác động thế nào?**

- A. Không ảnh hưởng đến nợ — Lãi cộng dồn làm dư nợ thay đổi.
- B. Làm nợ giảm dần — Không trả thì nợ không giảm.
- C. Làm nợ tăng nhanh hơn theo thời gian — Đúng: lãi kép bất lợi khi bạn là người đi vay.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Tạo một túi tiết kiệm mục tiêu trong Picket với mức góp đều mỗi tháng; xem lại sau mỗi tháng để thấy số tích lũy. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.27 — Chương 13: Tiền gửi có kỳ hạn và rút trước hạn

**Năng lực:** saving.term-deposits  
**Mục tiêu:** Tính tiền lãi khi giữ đến hạn, hiểu chi phí rút trước hạn và chọn kỳ hạn theo lúc cần tiền.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 224 đơn vị cách trắng trong thân bài

Tiền gửi có kỳ hạn thường có lãi suất cao hơn tiền gửi không kỳ hạn, đổi lại bạn cam kết để tiền đến hết kỳ hạn. Nếu rút trước hạn, tiền lãi thường thấp hơn nhiều so với khi giữ đến hạn. Mức cụ thể do điều khoản của từng tổ chức quy định, nên cần đọc trước khi gửi.

Ví dụ hư cấu: Trang gửi 50.000.000đ, kỳ hạn 12 tháng, lãi suất giả định 5% mỗi năm. Giữ đến hạn, tiền lãi là 2.500.000đ. Nếu cần tiền sau 6 tháng và điều khoản cho lãi rút trước hạn 0,5% mỗi năm, tiền lãi chỉ là 50.000.000 × 0,5% × 6/12 = 125.000đ. Trang bỏ lỡ 2.375.000đ so với giữ đến hạn. Tiền gốc vẫn còn, nhưng phần lãi giảm mạnh.

Vì vậy, kỳ hạn nên khớp với lúc bạn có thể cần tiền. Quỹ dự phòng cần rút nhanh không nên nằm hết trong một khoản kỳ hạn dài. Một số người chia tiền thành nhiều khoản có ngày đáo hạn khác nhau để luôn có một phần sắp đến hạn.

Trước khi gửi, hãy đọc: lãi suất, kỳ hạn, điều kiện rút trước hạn và điều gì xảy ra khi đến hạn, ví dụ tự động gửi tiếp. Bài này không gợi ý tổ chức hay sản phẩm cụ thể nào.

### Ví dụ và số học

Giữ đến hạn: 50.000.000 × 5% = 2.500.000đ. Rút sau 6 tháng: 50.000.000 × 0,5% × 6/12 = 125.000đ. Bỏ lỡ: 2.500.000 − 125.000 = 2.375.000đ.

#### Ghi nhớ

- Tiền lãi khi giữ đến hạn = gốc × lãi suất năm × thời gian tính theo năm.
- Rút trước hạn thường làm tiền lãi giảm mạnh.
- Chọn kỳ hạn khớp với lúc có thể cần tiền.

#### Hiểu lầm thường gặp

Nghĩ rằng rút trước hạn vẫn được hưởng đủ lãi theo tỷ lệ thời gian đã gửi.

#### Tự kiểm tra — tình huống hư cấu

Gửi 24.000.000đ kỳ hạn 12 tháng, lãi giả định 4,8% mỗi năm. Tính tiền lãi khi giữ đến hạn, và khi rút sau 3 tháng với lãi rút trước hạn 0,2% mỗi năm.

#### Gợi ý giải từng bước

1. Giữ đến hạn: 24.000.000 × 4,8% = 1.152.000đ.
2. Rút sau 3 tháng: 24.000.000 × 0,2% × 3/12 = 12.000đ.
3. So sánh: rút sớm chỉ nhận một phần rất nhỏ của tiền lãi đến hạn.

#### Kết luận

Giữ đến hạn được 1.152.000đ tiền lãi; rút sau 3 tháng chỉ được 12.000đ theo giả định.

- `50000000*5/100 = 2500000`
- `50000000*5/1000*6/12 = 125000`
- `2500000-125000 = 2375000`
- `24000000*48/1000 = 1152000`
- `24000000*2/1000*3/12 = 12000`

### Tình huống thực hành

**1. Gửi 30.000.000đ kỳ hạn 12 tháng, lãi giả định 6% mỗi năm, giữ đến hạn. Tiền lãi là bao nhiêu?**

- A. 1.800.000đ — Đúng: 30.000.000 × 6% = 1.800.000đ.
- B. 180.000đ — Đây là 0,6%, sai một chữ số.
- C. 6.000.000đ — Đây là 20%, không phải 6%.
Đáp án: **A** (`correctIndex: 0`).

**2. Vì sao không nên để toàn bộ quỹ dự phòng trong một khoản kỳ hạn dài?**

- A. Vì tiền gửi luôn mất gốc — Rút trước hạn thường ảnh hưởng tiền lãi, không phải mất gốc.
- B. Rút trước hạn có thể chỉ được lãi thấp theo điều khoản — Đúng: quỹ dự phòng cần rút được khi cần mà ít thiệt.
- C. Vì kỳ hạn dài bị cấm — Không có quy định như vậy.
Đáp án: **B** (`correctIndex: 1`).

**3. Thông tin nào cần đọc trước khi gửi có kỳ hạn?**

- A. Màu của thẻ — Không ảnh hưởng đến tiền của bạn.
- B. Số người đã gửi — Mức phổ biến không thay cho điều khoản.
- C. Lãi suất, kỳ hạn, điều kiện rút trước hạn và cách xử lý khi đến hạn — Đúng: đây là các điều khoản quyết định tiền bạn nhận.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Nếu có khoản tiền gửi kỳ hạn, thêm ngày đáo hạn vào mục Hóa đơn của Picket như một lời nhắc để quyết định trước ngày đó. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Nguồn tham khảo](https://vnba.org.vn/vi/han-muc-chi-tra-tien-bao-hiem-tien-gui-tang-len-350-trieu-dong-tu-ngay-13-7-2026-22749.htm)
- [Nguồn tham khảo](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/)

## picket.vi.financial.v1.24 — Chương 13: Bảo hiểm tiền gửi: hạn mức và những gì không phải tiền gửi

**Năng lực:** saving.deposit-insurance  
**Mục tiêu:** Hiểu hạn mức bảo hiểm tiền gửi hiện hành và phân biệt tiền gửi với sản phẩm khác bán tại ngân hàng.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 206 đơn vị cách trắng trong thân bài

Bảo hiểm tiền gửi Việt Nam trả tiền cho người gửi khi một tổ chức tham gia bảo hiểm tiền gửi phát sinh nghĩa vụ trả tiền bảo hiểm. Số tiền trả có hạn mức. Theo Thông tư 05/2026/TT-NHNN, từ ngày 13/7/2026, hạn mức là 350.000.000đ cho tất cả tiền gửi được bảo hiểm của một người tại một tổ chức, gồm cả gốc và lãi. Trước đó, hạn mức là 125.000.000đ theo Quyết định 32/2021/QĐ-TTg. Mức mới cao hơn 225.000.000đ.

Phần vượt hạn mức không bị xóa ngay, nhưng được xử lý theo quá trình xử lý tài sản của tổ chức đó. Vì vậy, người có số dư lớn tại một nơi nên biết phần nào nằm trong hạn mức.

Ví dụ hư cấu: Châu có 400.000.000đ gốc và 20.000.000đ lãi tại một tổ chức, tổng 420.000.000đ. Phần trong hạn mức là 350.000.000đ. Phần vượt là 70.000.000đ.

Không phải mọi sản phẩm bán tại quầy ngân hàng đều là tiền gửi. Chứng chỉ quỹ, trái phiếu hay hợp đồng bảo hiểm có cơ chế khác. Khi được mời một sản phẩm "lãi cao hơn tiết kiệm", câu hỏi đầu tiên là: đây có phải tiền gửi không? Hãy đọc chứng từ trước khi ký.

### Ví dụ và số học

Tổng: 400.000.000 + 20.000.000 = 420.000.000đ. Vượt hạn mức: 420.000.000 − 350.000.000 = 70.000.000đ. Hạn mức tăng: 350.000.000 − 125.000.000 = 225.000.000đ.

#### Ghi nhớ

- Từ 13/7/2026, hạn mức là 350.000.000đ cho một người tại một tổ chức, gồm gốc và lãi.
- Phần vượt hạn mức được xử lý theo quá trình xử lý tài sản của tổ chức.
- Sản phẩm đầu tư hay bảo hiểm bán tại ngân hàng không phải tiền gửi.

#### Hiểu lầm thường gặp

Nghĩ rằng mọi thứ mua ở quầy ngân hàng đều được bảo hiểm tiền gửi.

#### Tự kiểm tra — tình huống hư cấu

Có 200.000.000đ ở tổ chức A và 380.000.000đ (đã gồm lãi) ở tổ chức B. Mỗi nơi có vượt hạn mức 350.000.000đ không, vượt bao nhiêu?

#### Gợi ý giải từng bước

1. A: 200.000.000đ thấp hơn 350.000.000đ nên nằm trong hạn mức.
2. B: 380.000.000 − 350.000.000 = 30.000.000đ vượt hạn mức.
3. Tổng hai nơi 200.000.000 + 380.000.000 = 580.000.000đ, nhưng hạn mức tính riêng cho từng tổ chức.

#### Kết luận

A nằm trong hạn mức; B vượt 30.000.000đ.

- `400000000+20000000 = 420000000`
- `420000000-350000000 = 70000000`
- `350000000-125000000 = 225000000`
- `380000000-350000000 = 30000000`
- `200000000+380000000 = 580000000`

### Tình huống thực hành

**1. Từ ngày 13/7/2026, hạn mức tối đa cho một người tại một tổ chức là bao nhiêu?**

- A. 125.000.000đ — Đây là hạn mức cũ trước ngày 13/7/2026.
- B. 350.000.000đ — Đúng: theo Thông tư 05/2026/TT-NHNN.
- C. Không giới hạn — Bảo hiểm tiền gửi có hạn mức.
Đáp án: **B** (`correctIndex: 1`).

**2. Có 300.000.000đ gốc và 10.000.000đ lãi tại một tổ chức tham gia bảo hiểm tiền gửi. Số này có nằm trong hạn mức không?**

- A. Có, tổng 310.000.000đ thấp hơn 350.000.000đ — Đúng: hạn mức tính cả gốc và lãi.
- B. Không, vì lãi không được tính — Hạn mức gồm cả gốc và lãi.
- C. Chỉ 125.000.000đ được bảo hiểm — Đây là hạn mức cũ.
Đáp án: **A** (`correctIndex: 0`).

**3. Một sản phẩm tại quầy ngân hàng hứa lãi cao hơn tiết kiệm. Câu hỏi đầu tiên nên là gì?**

- A. Có quà tặng gì? — Quà tặng không thay đổi bản chất sản phẩm.
- B. Bao nhiêu người đã mua? — Số người mua không chứng minh sản phẩm phù hợp.
- C. Đây có phải tiền gửi không, hay là sản phẩm đầu tư hoặc bảo hiểm? — Đúng: loại sản phẩm quyết định quyền lợi và rủi ro.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Trong Picket, đặt tên ví theo tổ chức giữ tiền để thấy tổng số dư ở mỗi nơi. Không cần nhập số tài khoản. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Số liệu có nguồn và ngày

- Deposit-insurance payout limit 350,000,000 VND per person per participating institution (principal + interest) from 2026-07-13 under Circular 05/2026/TT-NHNN; previously 125,000,000 VND — nguồn `deposit-insurance-2026`, mốc 2026-07-13

### Nguồn đã đọc

- [Nguồn tham khảo](https://vnba.org.vn/vi/han-muc-chi-tra-tien-bao-hiem-tien-gui-tang-len-350-trieu-dong-tu-ngay-13-7-2026-22749.htm)
- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.28 — Chương 14: Lạm phát và sức mua

**Năng lực:** investing.inflation-real-return  
**Mục tiêu:** Giải thích lạm phát làm giảm sức mua và ước tính lợi suất thực bằng phép trừ gần đúng.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 192 đơn vị cách trắng trong thân bài

Lạm phát là khi giá cả nói chung tăng lên theo thời gian. Cùng một số tiền sẽ mua được ít hàng hơn. Vì vậy, khi đánh giá tiền lãi, hãy so với mức tăng giá. Lợi suất thực xấp xỉ bằng lãi suất danh nghĩa trừ tỷ lệ lạm phát.

Ví dụ hư cấu với các tỷ lệ giả định: một giỏ hàng hôm nay giá 1.000.000đ và tăng giá 4% sau 1 năm, thành 1.040.000đ. Nếu bạn gửi 1.000.000đ với lãi 5%, sau 1 năm có 1.050.000đ, đủ mua giỏ hàng và dư 10.000đ. Sức mua tăng khoảng 1%. Nếu lãi chỉ 3%, bạn có 1.030.000đ, thiếu 10.000đ để mua cùng giỏ hàng. Số tiền tăng lên nhưng sức mua giảm.

Giữ toàn bộ tiền mặt nhiều năm khi giá tăng cũng làm sức mua giảm, dù con số không đổi. Tuy vậy, tiền cho chi tiêu gần và quỹ dự phòng vẫn cần ở nơi an toàn, dễ rút; đó là đánh đổi có chủ ý.

Ngân sách cũng cần cập nhật. Nếu giá thực phẩm tăng, hạn mức túi ăn uống năm ngoái có thể không còn đủ.

### Ví dụ và số học

Giỏ hàng: 1.000.000 × 104% = 1.040.000đ. Lãi 5%: 1.000.000 × 105% = 1.050.000đ, dư 10.000đ. Lãi 3%: 1.000.000 × 103% = 1.030.000đ, thiếu 10.000đ.

#### Ghi nhớ

- Lạm phát làm cùng số tiền mua được ít hơn.
- Lợi suất thực xấp xỉ lãi danh nghĩa trừ lạm phát.
- Cập nhật hạn mức ngân sách khi giá thay đổi.

#### Hiểu lầm thường gặp

Nghĩ rằng số tiền không đổi nghĩa là giá trị không đổi.

#### Tự kiểm tra — tình huống hư cấu

Học phí hiện là 20.000.000đ và tăng giả định 5% mỗi năm. Sau 2 năm học phí là bao nhiêu?

#### Gợi ý giải từng bước

1. Năm 1: 20.000.000 × 105% = 21.000.000đ.
2. Năm 2: 21.000.000 × 105% = 22.050.000đ.
3. Mục tiêu tiết kiệm cho học phí nên dùng con số sau 2 năm.

#### Kết luận

Sau 2 năm học phí khoảng 22.050.000đ theo giả định.

- `1000000*104/100 = 1040000`
- `1000000*105/100 = 1050000`
- `1050000-1040000 = 10000`
- `1000000*103/100 = 1030000`
- `1040000-1030000 = 10000`
- `20000000*105/100 = 21000000`
- `21000000*105/100 = 22050000`

### Tình huống thực hành

**1. Lãi suất 6% mỗi năm, lạm phát giả định 4%. Lợi suất thực xấp xỉ là bao nhiêu?**

- A. 10% — Đây là cộng thay vì trừ.
- B. 2% — Đúng: 6% − 4% ≈ 2%.
- C. 6% — Đây là lãi danh nghĩa, chưa xét giá tăng.
Đáp án: **B** (`correctIndex: 1`).

**2. Giỏ hàng 500.000đ, giá tăng 10%. Năm sau cần bao nhiêu?**

- A. 550.000đ — Đúng: 500.000 × 110% = 550.000đ.
- B. 510.000đ — Đây là tăng 2%.
- C. 600.000đ — Đây là tăng 20%.
Đáp án: **A** (`correctIndex: 0`).

**3. Giữ toàn bộ tiền mặt nhiều năm khi giá tăng thì sao?**

- A. Sức mua chắc chắn tăng — Giá tăng làm cùng số tiền mua được ít hơn.
- B. Không ảnh hưởng gì — Lạm phát có ảnh hưởng đến sức mua.
- C. Sức mua có thể giảm dù số tiền không đổi — Đúng: con số giữ nguyên nhưng mua được ít hơn.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

So sánh một túi ngân sách trong Picket với cùng kỳ năm trước. Nếu giá đã tăng, điều chỉnh hạn mức theo số chi thật. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.29 — Chương 14: Rủi ro, lợi nhuận và đa dạng hóa

**Năng lực:** investing.risk-and-diversification  
**Mục tiêu:** Giải thích quan hệ rủi ro và lợi nhuận, vai trò của đa dạng hóa và thời hạn sử dụng tiền, không gợi ý sản phẩm cụ thể.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 236 đơn vị cách trắng trong thân bài

Lợi nhuận tiềm năng cao hơn thường đi kèm rủi ro cao hơn. Rủi ro ở đây là giá trị có thể lên xuống mạnh, kể cả giảm dưới số tiền bỏ ra. Không có khoản đầu tư hợp pháp nào vừa lợi nhuận cao vừa không có rủi ro.

Thời hạn sử dụng tiền rất quan trọng. Tiền cần dùng trong vài tháng tới nên ở nơi ổn định và dễ rút. Tiền cho mục tiêu nhiều năm có thể chịu dao động nhiều hơn, nếu bạn hiểu rủi ro. Trước khi nghĩ đến đầu tư, nhiều người hoàn thành quỹ dự phòng và giảm các khoản nợ lãi cao.

Đa dạng hóa nghĩa là không dồn hết vào một chỗ. Ví dụ hư cấu: có 10.000.000đ. Cách A dồn hết vào một tài sản; tài sản đó giảm 40% thì còn 6.000.000đ. Cách B chia đều 5 phần, mỗi phần 2.000.000đ. Một phần giảm 40% còn 1.200.000đ, bốn phần đứng yên. Tổng còn 9.200.000đ. Đa dạng hóa giảm thiệt hại từ một tài sản, nhưng không loại bỏ rủi ro khi cả thị trường cùng giảm.

Phí cũng làm giảm lợi nhuận: phí 2% mỗi năm trên 10.000.000đ là 200.000đ. Ủy ban Chứng khoán Nhà nước khuyến cáo thận trọng với lời mời lợi nhuận cao và kiểm tra tổ chức có được cấp phép không. Bài này không phải lời khuyên đầu tư.

### Ví dụ và số học

Cách A: 10.000.000 × 60% = 6.000.000đ. Cách B: 10.000.000 / 5 = 2.000.000đ mỗi phần; 2.000.000 × 60% = 1.200.000đ; 1.200.000 + 4 × 2.000.000 = 9.200.000đ. Phí: 10.000.000 × 2% = 200.000đ.

#### Ghi nhớ

- Lợi nhuận tiềm năng cao hơn đi kèm rủi ro cao hơn.
- Thời hạn dùng tiền quyết định mức dao động có thể chịu.
- Đa dạng hóa giảm thiệt hại từ một tài sản nhưng không xóa mọi rủi ro.

#### Hiểu lầm thường gặp

Nghĩ rằng đa dạng hóa bảo đảm không bao giờ lỗ.

#### Tự kiểm tra — tình huống hư cấu

Chia 12.000.000đ đều cho 4 tài sản. Một phần giảm 30%, một phần tăng 10%, hai phần đứng yên. Tổng còn bao nhiêu?

#### Gợi ý giải từng bước

1. Mỗi phần: 12.000.000 / 4 = 3.000.000đ.
2. Phần giảm: 3.000.000 × 70% = 2.100.000đ; phần tăng: 3.000.000 × 110% = 3.300.000đ.
3. Tổng: 2.100.000 + 3.300.000 + 2 × 3.000.000 = 11.400.000đ.

#### Kết luận

Tổng còn 11.400.000đ, giảm 600.000đ so với ban đầu.

- `10000000*60/100 = 6000000`
- `10000000/5 = 2000000`
- `2000000*60/100 = 1200000`
- `1200000+4*2000000 = 9200000`
- `10000000*2/100 = 200000`
- `9000000/3*50/100+2*9000000/3 = 7500000`
- `12000000/4 = 3000000`
- `3000000*70/100 = 2100000`
- `3000000*110/100 = 3300000`
- `2100000+3300000+2*3000000 = 11400000`

### Tình huống thực hành

**1. Lợi nhuận tiềm năng cao hơn thường đi kèm điều gì?**

- A. Rủi ro dao động cao hơn — Đúng: đây là quan hệ rủi ro và lợi nhuận.
- B. Bảo đảm của nhà nước — Sản phẩm đầu tư không được nhà nước bảo đảm lợi nhuận.
- C. Không mất phí — Phí không liên quan trực tiếp đến lợi nhuận tiềm năng.
Đáp án: **A** (`correctIndex: 0`).

**2. Tiền cần dùng trong 6 tháng tới nên được giữ thế nào?**

- A. Đặt vào tài sản biến động mạnh để tăng nhanh — Có thể giảm đúng lúc cần dùng.
- B. Giữ ở nơi ổn định và rút được khi cần — Đúng: thời hạn ngắn cần ưu tiên ổn định.
- C. Đưa người quen giữ hộ để đầu tư — Không rõ trách nhiệm và rủi ro.
Đáp án: **B** (`correctIndex: 1`).

**3. Chia 9.000.000đ đều cho 3 tài sản; một tài sản giảm 50%, hai tài sản còn lại đứng yên. Tổng còn bao nhiêu?**

- A. 4.500.000đ — Đây là khi cả 9.000.000đ cùng giảm 50%.
- B. 9.000.000đ — Đã bỏ qua phần giảm.
- C. 7.500.000đ — Đúng: 1.500.000 + 3.000.000 + 3.000.000 = 7.500.000đ.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Không cần đầu tư để hoàn thành bài. Trong Picket, kiểm tra túi dự phòng và các khoản nợ lãi cao trước khi cân nhắc bất kỳ khoản đầu tư nào. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Nguồn tham khảo](https://xaydungchinhsach.chinhphu.vn/canh-bao-rui-ro-khi-tham-gia-san-giao-dich-chung-khoan-truc-tuyen-119220630163102206.htm)

## picket.vi.financial.v1.22 — Chương 14: Nhận diện lời mời đầu tư đáng ngờ

**Năng lực:** investing.fraud-red-flags  
**Mục tiêu:** Nhận ra các dấu hiệu của lời mời đầu tư lừa đảo và biết cách kiểm tra trước khi chuyển tiền.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 238 đơn vị cách trắng trong thân bài

Lời mời đầu tư lừa đảo thường có vài dấu hiệu chung. Cam kết lợi nhuận cao và cố định, thậm chí "không rủi ro". Hối thúc tham gia ngay. Trả hoa hồng khi rủ thêm người. Dùng sàn hoặc ứng dụng không rõ cấp phép. Cho rút tiền nhỏ lúc đầu, rồi đòi nạp thêm "phí" hay "thuế" mới cho rút số lớn.

Ủy ban Chứng khoán Nhà nước khuyến cáo ngày 30/6/2022: cần hết sức thận trọng với lời mời lãi suất, lợi nhuận cao. Công ty chứng khoán hoạt động tại Việt Nam phải được Ủy ban cấp phép. Giao dịch trên nền tảng không được quản lý thì nhà đầu tư tự chịu rủi ro.

Ví dụ hư cấu: một nhóm hứa 3% mỗi tuần. Quy đổi đơn giản, 3 × 52 = 156% mỗi năm, cao bất thường. Giả sử 100 người, mỗi người góp 10.000.000đ, tổng 1.000.000.000đ. Nếu nhóm trả "lãi" 2,5% mỗi tuần từ chính tiền góp, mỗi tuần mất 25.000.000đ. Không có người mới, quỹ cạn sau 40 tuần. Mô hình như vậy sống nhờ tiền của người đến sau.

Trước khi chuyển tiền: chờ ít nhất một ngày, tự tìm tên tổ chức trên trang chính thức của cơ quan quản lý và không gửi OTP hay mật khẩu cho ai. Nếu đã chuyển, hãy dừng nạp thêm, giữ bằng chứng, báo ngân hàng và trình báo công an.

### Ví dụ và số học

3 × 52 = 156%/năm. Tổng góp: 100 × 10.000.000 = 1.000.000.000đ. "Lãi" mỗi tuần: 1.000.000.000 × 2,5% = 25.000.000đ. Cạn quỹ: 1.000.000.000 / 25.000.000 = 40 tuần.

#### Ghi nhớ

- Cam kết lợi nhuận cao, cố định và hối thúc là dấu hiệu cảnh báo.
- Kiểm tra cấp phép trên trang chính thức của cơ quan quản lý.
- Đòi nạp thêm để được rút tiền là dấu hiệu lừa đảo rõ ràng.

#### Hiểu lầm thường gặp

Nghĩ rằng rút được tiền lần đầu chứng tỏ nền tảng là thật.

#### Tự kiểm tra — tình huống hư cấu

Bạn nạp 5.000.000đ. Ứng dụng hiển thị "lãi" 1.500.000đ. Bạn rút về được 500.000đ. Tiền thật đã về là bao nhiêu và bao nhiêu vẫn nằm ngoài?

#### Gợi ý giải từng bước

1. Tiền đã về tài khoản: 500.000đ.
2. Tiền vẫn nằm ngoài: 5.000.000 − 500.000 = 4.500.000đ.
3. Con số hiển thị 5.000.000 + 1.500.000 = 6.500.000đ không phải tiền bạn đang có.

#### Kết luận

Chỉ 500.000đ đã về; 4.500.000đ vẫn nằm ngoài và con số 6.500.000đ chỉ là hiển thị.

- `3*52 = 156`
- `100*10000000 = 1000000000`
- `1000000000*25/1000 = 25000000`
- `1000000000/25000000 = 40`
- `5000000-500000 = 4500000`
- `5000000+1500000 = 6500000`

### Tình huống thực hành

**1. Nhóm chat hứa 3% mỗi tuần và đã có người rút được tiền. Kết luận nào hợp lý?**

- A. Rút được vài lần không chứng minh mô hình hợp pháp; cần kiểm tra cấp phép — Đúng: lần rút nhỏ ban đầu thường là mồi.
- B. Chắc chắn an toàn — Lời hứa và vài lần rút không phải bằng chứng an toàn.
- C. Nên rủ thêm người để có hoa hồng — Rủ thêm người có thể kéo người khác vào thiệt hại.
Đáp án: **A** (`correctIndex: 0`).

**2. Sàn yêu cầu nạp thêm "phí thuế" mới cho rút tiền. Nên làm gì?**

- A. Nạp để lấy lại tiền — Đây là cách thường dùng để lấy thêm tiền.
- B. Dừng nạp, giữ bằng chứng, báo ngân hàng và trình báo công an — Đúng: ngừng chuyển tiền và báo cơ quan chức năng.
- C. Vay người thân để nạp — Vay thêm làm thiệt hại lớn hơn.
Đáp án: **B** (`correctIndex: 1`).

**3. 3% mỗi tuần, quy đổi đơn giản ra năm (52 tuần) là bao nhiêu?**

- A. 36% — Đây là nhân 12, dùng cho tỷ lệ tháng.
- B. 3% — Đây vẫn là tỷ lệ một tuần.
- C. 156% — Đúng: 3 × 52 = 156%.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Trong Picket, chỉ ghi thu nhập khi tiền thực sự về tài khoản của bạn. Con số "lợi nhuận" hiển thị trên ứng dụng của bên khác không phải thu nhập. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Số liệu có nguồn và ngày

- State Securities Commission: be very cautious with offers of high returns; securities companies in Vietnam must be licensed — nguồn `ssc-warning`, mốc 2022-06-30

### Nguồn đã đọc

- [Nguồn tham khảo](https://xaydungchinhsach.chinhphu.vn/canh-bao-rui-ro-khi-tham-gia-san-giao-dich-chung-khoan-truc-tuyen-119220630163102206.htm)
- [Nguồn tham khảo](https://sbv.gov.vn/en/w/sbv624798)
- [Nguồn tham khảo](https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304)

## picket.vi.financial.v1.30 — Chương 14: Rà soát tài chính định kỳ

**Năng lực:** planning.periodic-review  
**Mục tiêu:** Tính ba chỉ số đơn giản để rà soát tài chính và biết khi nào cần cập nhật kế hoạch.  
**Trạng thái:** self-reviewed-pending-owner-approval · reviewedAt: 2026-11-05 · 199 đơn vị cách trắng trong thân bài

Kế hoạch tài chính cần được xem lại, vì thu nhập, giá cả và mục tiêu đều thay đổi. Một lần rà soát mỗi quý hoặc mỗi năm có thể dùng ba con số đơn giản.

Thứ nhất là giá trị ròng: tổng tài sản trừ tổng nợ. Thứ hai là tỷ lệ tiết kiệm: phần để dành chia cho tiền thực nhận. Thứ ba là số tháng dự phòng: quỹ dự phòng chia cho chi thiết yếu mỗi tháng. Ba con số này không chấm điểm bạn. Chúng cho biết xu hướng đang tốt lên hay cần điều chỉnh.

Ví dụ hư cấu: Hà có tiền trong ví 25.000.000đ, tiền gửi 40.000.000đ và xe máy ước tính 15.000.000đ. Tổng tài sản là 80.000.000đ. Hà nợ 12.000.000đ, nên giá trị ròng là 68.000.000đ. Hà để dành 1.800.000đ trên 12.000.000đ thực nhận, tỷ lệ tiết kiệm 15%. Quỹ dự phòng 18.000.000đ trên chi thiết yếu 6.000.000đ là 3 tháng.

Ngoài lịch định kỳ, hãy rà soát khi có thay đổi lớn: đổi việc, chuyển nhà, kết hôn, có con hoặc thu nhập giảm. Khi đó, xem lại ngân sách, quỹ dự phòng, bảo hiểm, nợ và thứ tự mục tiêu.

### Ví dụ và số học

Tài sản: 25.000.000 + 40.000.000 + 15.000.000 = 80.000.000đ. Giá trị ròng: 80.000.000 − 12.000.000 = 68.000.000đ. Tỷ lệ tiết kiệm: 1.800.000 / 12.000.000 = 15%. Dự phòng: 18.000.000 / 6.000.000 = 3 tháng.

#### Ghi nhớ

- Giá trị ròng = tổng tài sản − tổng nợ.
- Tỷ lệ tiết kiệm = phần để dành / tiền thực nhận.
- Số tháng dự phòng = quỹ dự phòng / chi thiết yếu mỗi tháng.

#### Hiểu lầm thường gặp

Coi các chỉ số này là điểm đánh giá bản thân thay vì công cụ theo dõi xu hướng.

#### Tự kiểm tra — tình huống hư cấu

Tài sản gồm 30.000.000đ tiền gửi và 20.000.000đ tiền mặt; nợ 8.000.000đ. Quỹ dự phòng 10.000.000đ, chi thiết yếu 5.000.000đ. Để dành 2.400.000đ trên 16.000.000đ thực nhận. Tính ba chỉ số.

#### Gợi ý giải từng bước

1. Tài sản: 30.000.000 + 20.000.000 = 50.000.000đ; giá trị ròng: 50.000.000 − 8.000.000 = 42.000.000đ.
2. Dự phòng: 10.000.000 / 5.000.000 = 2 tháng.
3. Tỷ lệ tiết kiệm: 2.400.000 / 16.000.000 = 15%.

#### Kết luận

Giá trị ròng 42.000.000đ, dự phòng 2 tháng, tỷ lệ tiết kiệm 15%.

- `25000000+40000000+15000000 = 80000000`
- `80000000-12000000 = 68000000`
- `1800000*100/12000000 = 15`
- `18000000/6000000 = 3`
- `30000000+20000000 = 50000000`
- `50000000-8000000 = 42000000`
- `10000000/5000000 = 2`
- `2400000*100/16000000 = 15`

### Tình huống thực hành

**1. Tài sản 50.000.000đ, nợ 20.000.000đ. Giá trị ròng là bao nhiêu?**

- A. 70.000.000đ — Đây là cộng nợ thay vì trừ.
- B. 30.000.000đ — Đúng: 50.000.000 − 20.000.000 = 30.000.000đ.
- C. 20.000.000đ — Đây là tổng nợ.
Đáp án: **B** (`correctIndex: 1`).

**2. Thực nhận 10.000.000đ, để dành 1.000.000đ. Tỷ lệ tiết kiệm là bao nhiêu?**

- A. 10% — Đúng: 1.000.000 / 10.000.000 = 10%.
- B. 1% — Đã chia sai một chữ số.
- C. 100% — Đây là khi để dành toàn bộ.
Đáp án: **A** (`correctIndex: 0`).

**3. Sau một thay đổi lớn như đổi việc hay có con, nên làm gì?**

- A. Giữ nguyên kế hoạch cũ — Hoàn cảnh mới có thể làm kế hoạch cũ không còn phù hợp.
- B. Xóa toàn bộ dữ liệu cũ — Dữ liệu cũ giúp so sánh xu hướng.
- C. Rà lại ngân sách, quỹ dự phòng, bảo hiểm và mục tiêu — Đúng: cập nhật kế hoạch theo hoàn cảnh mới.
Đáp án: **C** (`correctIndex: 2`).

### Hành động tự chọn

Chọn một ngày mỗi quý để mở Picket, xem tổng các túi ngân sách, danh sách Hóa đơn sắp đến hạn và tiến độ mục tiêu; ghi lại ba con số trong bài. Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.

### Nguồn đã đọc

- [Nguồn tham khảo](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_SMART-goals_tool_2018-11.pdf)
- [Nguồn tham khảo](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)

## Kiểm tra bản biên soạn

- Đủ 30 bài, 90 câu hỏi, 270 lựa chọn có lời giải riêng.
- 179 phép tính được chạy và so giá trị mong đợi bằng script đi kèm.
- Tất cả ID duy nhất; mọi chỉ số đáp án thuộc 0–2.
- Nguồn bài 1–12 được mở đọc ngày 2026-10-23; nguồn mới của bài 13–30 được mở đọc ngày 2026-11-05. URL được lưu để kiểm tra lại trước phát hành.
- Chưa có người duyệt độc lập, người học pilot, nghiệm thu nội dung tiếng Anh hoặc xác nhận hiệu quả giáo dục thực tế.
