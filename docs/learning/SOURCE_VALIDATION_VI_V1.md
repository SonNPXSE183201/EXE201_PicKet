# Kiểm nguồn và số học cho giáo trình VI v1

<!-- project-status-link -->
> Đồng bộ tài liệu 01/11/2026: [Trạng thái hiện hành](../PROJECT_STATUS.md). Kết quả biên tập/kiểm nguồn trong tài liệu này là checkpoint theo ngày của chính tài liệu.

Ngày đối chiếu: 2026-10-23. Người biên soạn: Codex theo yêu cầu triển khai kế hoạch. **Không phải phê duyệt chuyên môn độc lập.**

Các URL đầy đủ được lưu trong `PICKET_FINANCIAL_CURRICULUM_VI_V1.json`, trường `sourceRegistry`. Đã mở và đọc nội dung nguồn, không chỉ dùng kết quả tìm kiếm. Các PDF CFPB được đọc qua bản trích xuất văn bản; không sao chép bảng, ảnh, câu hỏi hay ví dụ tiền USD. Bản thảo dùng tình huống VND tự soạn và hướng dẫn thao tác Picket do dự án thiết kế.

| ID nguồn | Tên/tổ chức | Điểm đã đối chiếu | Giới hạn áp dụng |
| --- | --- | --- | --- |
| oecd | EU/OECD, Financial competence framework for adults, 2022 | Khung kết hợp kiến thức, kỹ năng, thái độ/hành vi; bối cảnh người lớn | Chỉ định hướng năng lực, không phải giáo trình Việt Nam đã kiểm định |
| spending | CFPB, Spending tracker | Ghi chép rồi xem theo nhóm, nhận ra xu hướng | Không sao chép hệ phân loại hoặc quyền lợi Mỹ |
| bills | CFPB, Bill calendar | Ngày đến hạn và ngày thu là hai đầu vào riêng | Không nhập khuyến nghị thời gian gửi thư Mỹ vào app |
| cashflow | CFPB, Creating a cash flow budget | Số đầu kỳ, thu, chi và chuyển số cuối sang kỳ kế | Không coi hỗ trợ/phúc lợi Mỹ là chế độ Việt Nam |
| income | CFPB, Income and benefits tracker | Phân biệt thu đều, thất thường, theo mùa và một lần | Chỉ dùng ý nghĩa thời điểm/độ chắc chắn |
| saving | CFPB, Savings plan | Chia phần cần dành theo số kỳ | Không hứa tiết kiệm chắc chắn làm giảm mọi loại phí |
| goals | CFPB, Setting SMART goals | Mục tiêu có thể cụ thể hóa và đo tiến độ | Không sao chép danh sách câu hỏi gốc |
| priority | CFPB, Prioritizing bills | Xem hậu quả và hoàn cảnh khi đặt thứ tự ưu tiên | Không chuyển quyền thu hồi nợ/điểm tín dụng Mỹ sang Việt Nam |
| loans | CFPB, Comparing auto loans | Cần xét tổng và kỳ hạn, không chỉ khoản trả mỗi tháng | Không giới thiệu khoản vay, không sao chép bảng hợp đồng Mỹ |
| adjust | CFPB, Adjusting your cash flow | Thử thay thời điểm và cần hành động/xác nhận để thay đổi có thật | Sửa trên lịch app không sửa thỏa thuận bên ngoài |
| emergency | CFPB, An essential guide to building an emergency fund | Khoản dự trữ cho việc ngoài kế hoạch, không cần một mức đồng loạt | Ví dụ, số tiền và phân bổ đều tự soạn |
| cost | CFPB, What is a Truth-in-Lending disclosure for an auto loan? | Tách tiền được tài trợ, chi phí và tổng các khoản trả | TILA/APR được nhận diện là bối cảnh Mỹ, không áp luật tại Việt Nam |
| otp | Bộ Công an, Cảnh báo thủ đoạn lừa đảo mới khi mua hàng online, 28/09/2026 | Giả mạo hoàn tiền, OTP/QR/link lạ; xác minh và báo khi nghi ngờ | Không hứa thu hồi được tiền |
| payment-safety | Ủy ban Cạnh tranh quốc gia, Nhận diện rủi ro trên các nền tảng thanh toán số…, 01/07/2026 | Không chia sẻ bí mật; gọi kênh chính thức; giữ chứng từ | Không biến kiến nghị xử lý thành kết luận pháp lý cá biệt |
| trial | FTC, Getting In and Out of Free Trials, Auto-Renewals, and Negative Option Subscriptions | Hiểu giá/ngày/cách hủy, theo dõi trạng thái đăng ký | Không áp quy định báo cáo, khiếu nại hoặc quyền hủy ở Mỹ vào Việt Nam |

## Kiểm tra thực thi

Chạy `python docs/learning/build_curriculum.py` để tái tạo Markdown/JSON. Script chỉ xử lý dữ liệu biên soạn cục bộ, không gọi API/provider và không dùng dữ liệu người dùng.

- 12 ID bài duy nhất, 6 chương, mỗi chương 2 bài.
- 36 câu tình huống, mỗi câu 3 lựa chọn; đủ 108 lời giải riêng.
- 30 biểu thức số học được chạy và so kết quả mong đợi: đạt.
- Thân bài đếm theo khoảng trắng: 397, 416, 418, 414, 428, 422, 419, 419, 410, 413, 428, 426; mỗi bài nằm trong 350–500 đơn vị. Không tính quiz, nguồn và ví dụ tách riêng.
- `correctIndex` là 0-based. Cần hiển thị lời giải cho cả lựa chọn sai, cho phép thử lại; không suy diễn điểm quiz thành sức khỏe tài chính.
- Không chép nguyên câu từ nguồn, không nhập quyền pháp lý Mỹ/EU; phần tổng hợp khái niệm giới hạn, ví dụ/số học/tình huống/giải thích thực hành do Picket biên soạn mới.

## Các cửa chưa đạt trước published

Cần người độc lập có chuyên môn kiểm nội dung tài chính và bối cảnh Việt Nam; kiểm ngôn ngữ, accessibility; kiểm pháp lý/an toàn phù hợp cho bài vay và OTP; pilot mức hiểu và thời lượng; kiểm chữ lớn/TalkBack/offline trên Android. Chưa có bản dịch tiếng Anh được duyệt. Không có chứng thực của CFPB, OECD, FTC hoặc cơ quan Việt Nam cho giáo trình Picket. `reviewedAt` chỉ là ngày rà nguồn/số học của tác giả.

Đây là bản biên soạn đầy đủ dùng cho review/prototype. `publicationGate.publishable=false` phải được giữ cho tới khi có bằng chứng qua các cửa tương ứng; việc kiểm số học đạt không thay thế phê duyệt nội dung.

## Bản biên tập 2 — 27/10/2026

Đã bổ sung 12 bài tự kiểm tra hư cấu có lời giải, 36 điểm ghi nhớ và 12 hiểu lầm thường gặp. Tổng kiểm số học nay là 60 (30 cũ + 30 mới), cùng dữ liệu kiểm ở VI/EN. Generator tự đồng bộ app JSON; danh tính bài và đáp án quiz không đổi. [Hồ sơ biên tập và nguồn kiểm lại](CONTENT_PACK_EDITORIAL_20261027.md).
