# Giáo trình tài chính Picket — bản biên tập 3

Mở rộng ngày **05/11/2026** thành lộ trình 4 giai đoạn, 30 bài, dành cho người lớn từ 18 tuổi. Các bài dùng tình huống hư cấu tại Việt Nam, tiền VND và hoạt động có thể bỏ qua. Trạng thái: `self-reviewed-pending-owner-approval`; chưa công bố cloud. [Trạng thái dự án](../PROJECT_STATUS.md).

## Đọc và sử dụng

- [Giáo trình đầy đủ tiếng Việt](PICKET_FINANCIAL_CURRICULUM_VI_V1.md)
- [Full English curriculum](PICKET_FINANCIAL_CURRICULUM_EN_V1.md)
- [Dữ liệu VI cho app](PICKET_FINANCIAL_CURRICULUM_VI_V1.json)
- [English app content](PICKET_FINANCIAL_CURRICULUM_EN_V1.json)
- [Checklist tự rà soát v2, nguồn và số liệu có ngày](REVIEW_CHECKLIST_V2_20261105.md)
- [Hồ sơ biên tập 2 (bài 1–12)](CONTENT_PACK_EDITORIAL_20261027.md)

Mỗi bài gồm mục tiêu, bài đọc, ví dụ có phép tính, ba điểm ghi nhớ, một hiểu lầm thường gặp, một tình huống tự kiểm tra có lời giải từng bước, ba câu quiz có giải thích mọi lựa chọn, hành động tự chọn gắn với Picket và nguồn tham khảo. Số liệu quy định (thuế, bảo hiểm, bảo hiểm tiền gửi) có trường `citedFigures` ghi nguồn và ngày.

## Lộ trình 4 giai đoạn / 30 bài

Số là hậu tố ID `picket.vi.financial.v1.NN`. Thứ tự hiển thị theo giai đoạn; bài 1–12 giữ nguyên ID và đáp án.

| Giai đoạn | Bài |
| --- | --- |
| 1. Nền tảng | 13 Lương gộp và tiền thực nhận · 01 Chuyển ví không phải chi thêm · 02 Ghi đúng trước khi phân loại · 14 Chi cố định, biến đổi và khoản theo năm · 03 Nhu cầu và mong muốn cần bối cảnh · 15 Chia tiền vào túi · 04 Lập kế hoạch theo ngày tiền về |
| 2. Ổn định | 16 Viết mục tiêu rõ ràng và xếp thứ tự · 06 Chia mục tiêu thành bước có thể đổi · 05 Quỹ dự phòng khác khoản đã biết trước · 17 Xây quỹ dự phòng theo từng mốc · 07 Số dư chưa phải tiền có thể dành ra · 08 Kịch bản giúp hỏi · 18 Thuế TNCN từ tiền lương |
| 3. Bảo vệ | 09 Nhìn tổng chi phí · 10 Lịch trả · 19 Quy đổi lãi suất, nhận diện vay nặng lãi · 20 Nhiều khoản nợ · 11 Dừng trước yêu cầu OTP · 21 Kịch bản lừa đảo phổ biến · 23 Bảo hiểm cơ bản · 12 Dùng thử và khoảng chờ · 25 Quyền người tiêu dùng |
| 4. Phát triển | 26 Lãi kép · 27 Tiền gửi có kỳ hạn · 24 Bảo hiểm tiền gửi · 28 Lạm phát và sức mua · 29 Rủi ro và đa dạng hóa · 22 Lời mời đầu tư đáng ngờ · 30 Rà soát tài chính định kỳ |

## Cách học gợi ý

1. Đọc mục tiêu và bài đọc; giải lại ví dụ trước khi nhìn phép tính.
2. Dùng phần tự kiểm tra để tự nêu cách giải, rồi so với từng bước.
3. Làm ba câu quiz và đọc cả giải thích lựa chọn sai.
4. Có thể quay lại ôn tập hoặc bỏ qua hành động thực tế. Không cần mua hàng, đăng ký vay, đầu tư, chuyển tiền, cung cấp OTP hay gửi dữ liệu cho AI để hoàn thành.

Điểm quiz và XP chỉ ghi nhận hoạt động học. Chúng không đo mức giàu có, độ tín nhiệm hoặc sức khỏe tài chính của một cá nhân. Nội dung không phải tư vấn đầu tư, tín dụng, thuế hay bảo hiểm cho cá nhân.

## Tái tạo và kiểm tra

Chạy từ root repository:

    python docs/learning/build_curriculum.py
    python docs/learning/build_curriculum_en.py
    npm run test:learning --prefix apps/mobile

Hai generator đồng bộ Markdown/JSON trong thư mục này và JSON tĩnh trong mobile. Bài 1–12 nằm trong hai generator; phần ghi nhớ/tự kiểm tra của chúng ở `study_support.v1.json`. Bài 13–30, giai đoạn và nguồn mới nằm trong `curriculum_v2_extension.py`, VI và EN đặt cạnh nhau.

**Thêm bài mới:** thêm một lời gọi `lesson(...)` vào `curriculum_v2_extension.py`, đặt số bài vào `STAGE_ORDER`, thêm nguồn vào `NEW_SOURCES` (kèm ngày mở đọc), chạy hai generator và test. Generator EN kiểm tra ID, đáp án, phép tính, nguồn và chuỗi số trong thân bài giữa hai ngôn ngữ.

Schema vẫn là `schemaVersion: 1`. Các trường `stages`, `stageId` và `citedFigures` là tùy chọn; `validateCurriculum` kiểm chúng khi có và vẫn nhận gói cũ không có chúng. Không đổi ID, `version` hay đáp án của bài đã phát hành.

Chưa có phê duyệt độc lập hoặc pilot người học; `publicationGate.publishable=false`. Bảng đáp án cloud chưa có bài 13–30, cần migration trước khi bật chấm điểm cloud.
