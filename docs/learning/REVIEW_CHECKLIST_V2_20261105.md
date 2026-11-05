# Checklist tự rà soát giáo trình v2 — 05/11/2026

[Giáo trình và lộ trình](README.md) · [Bản VI](PICKET_FINANCIAL_CURRICULUM_VI_V1.md) · [Bản EN](PICKET_FINANCIAL_CURRICULUM_EN_V1.md)

**Trạng thái:** `self-reviewed-pending-owner-approval`. Người rà soát là chính tác giả (agent AI), **không phải phê duyệt độc lập**. `publicationGate.publishable=false` được giữ nguyên. Chủ dự án phê duyệt trước khi công bố cloud.

## Phạm vi

- Lộ trình 4 giai đoạn (Nền tảng / Ổn định / Bảo vệ / Phát triển), 30 bài, 90 câu quiz, 270 lời giải lựa chọn, VI và EN.
- Bài 01–12 giữ nguyên ID, `version=1`, nội dung, ví dụ, phần tự kiểm tra và 36 đáp án. Chỉ đổi `status`, `reviewedAt`, `reviewType` và thêm `stageId`. Đã so với commit nền `bb985742` bằng script.
- Bài 13–30 mới, soạn trong [curriculum_v2_extension.py](curriculum_v2_extension.py). Tiếng Việt là bản chính, tiếng Anh nằm cạnh.
- Schema giữ `schemaVersion: 1`, `curriculumId` không đổi. Thêm hai trường tùy chọn: `stages` ở cấp giáo trình, `stageId` và `citedFigures` ở cấp bài. `editorialRevision` lên 3. Gói cũ không có các trường này vẫn hợp lệ (có test).

## Checklist và kết quả

| # | Tiêu chí | Cách kiểm | Kết quả |
| --- | --- | --- | --- |
| 1 | Mỗi con số quy định có nguồn | `citedFigures` gắn `sourceId` có trong `sourceRegistry` và URL có trong `sources` của bài; test `every regulatory figure cites…` | Đạt: 12 số liệu có nguồn ở bài 13, 18, 19, 21, 22, 23, 24, 25 |
| 2 | Số liệu có ngày | `asOf` dạng YYYY-MM-DD; thân bài nêu ngày hiệu lực hoặc ngày công bố | Đạt. Xem bảng số liệu bên dưới |
| 3 | Chính xác so với nguồn | Mở và đọc từng nguồn ngày 05/11/2026; so số trong bài | Đạt, kèm giới hạn ở mục "Chưa xác minh được" |
| 4 | Không tư vấn đầu tư/tín dụng cá nhân | Đọc lại; regex tìm cụm "nên mua/đầu tư vào"; ví dụ đều hư cấu và nêu "giả định" | Đạt: 0 kết quả. Bài 27, 29 ghi rõ không gợi ý tổ chức hay sản phẩm |
| 5 | Không quảng bá thương hiệu/sản phẩm | Regex tên ngân hàng, ví, sàn, công ty bảo hiểm, mạng xã hội trên cả 30 bài VI/EN | Đạt: 0 kết quả. Chỉ nhắc Picket và tên cơ quan nhà nước |
| 6 | Hướng dẫn chống lừa đảo khớp cảnh báo chính thức VN | Đối chiếu khuyến cáo NHNN 31/03/2025, Công an 10/03/2026, UBCKNN 30/06/2022, Bộ Công an (bài 11) | Đạt: không chia sẻ OTP/mật khẩu; ngân hàng không gửi link qua SMS/email từ 01/01/2025; không cấp quyền Trợ năng; không cho thuê tài khoản; dừng, giữ bằng chứng, báo ngân hàng và công an |
| 7 | Ngôn ngữ dễ hiểu, câu ngắn | Script đo số từ/câu ở thân bài mới | Đạt: trung bình 14,6 từ/câu (VI), 13,1 (EN). Hai câu dài (bài 13, 18) đã tách. Câu dài nhất còn lại là danh sách 5 bậc thuế |
| 8 | Mỗi quiz đúng một đáp án | Cấu trúc: 3 lựa chọn, `correctIndex` 0–2. Nội dung: đọc lại 54 câu mới, mỗi lựa chọn sai có lời giải vì sao sai | Đạt. Phân bố đáp án bài mới: 18/20/16 cho vị trí A/B/C |
| 9 | Số học được tính lại | 179 biểu thức `arithmeticChecks` chạy trong cả hai generator và test mobile; 20 phép tính trong quiz chạy riêng bằng script | Đạt: 0 sai lệch |
| 10 | Song ngữ VI/EN tương đương | Generator EN so ID, chương, giai đoạn, nguồn, `citedFigures`, đáp án, biểu thức; so chuỗi số trong thân bài (chuẩn hóa ngày "13 July 2026" thành 13/7/2026) | Đạt: 30/30 bài. Một lệch thứ tự số ở bài 26 được phát hiện và sửa |
| 11 | Bài 3–5 phút, có ví dụ, hành động gắn Picket, 3 quiz | Thân bài mới 186–241 từ VI; mỗi bài có ví dụ số học, hành động tự chọn (túi ngân sách, Hóa đơn, ảnh hóa đơn, giao dịch) và 3 quiz | Đạt về cấu trúc. Thời lượng chưa đo với người học |
| 12 | Hành động không bắt buộc chi tiền hay dữ liệu nhạy cảm | `requiresSpending=false`, `maySkip=true`; đọc lại nội dung hành động | Đạt |

## Số liệu có ngày và nguồn

| Số liệu | Bài | Nguồn (`sourceId`) | Mốc |
| --- | --- | --- | --- |
| Người lao động đóng 10,5% (8% BHXH, 1,5% BHYT, 1% BHTN) | 13, 18 | `bhxh-rates` — BHXH Hà Nội | công bố 08/09/2025 |
| Giảm trừ bản thân 15.500.000đ/tháng, người phụ thuộc 6.200.000đ/tháng | 13, 18 | `pit-deduction-2026` — NQ 110/2025/UBTVQH15, thông qua 17/10/2025 | áp dụng từ kỳ tính thuế 2026 |
| Biểu 5 bậc theo tháng 5/10/20/30/35% tại 10/30/60/100 triệu | 18 | `pit-law-2025` — Luật Thuế TNCN 2025 | hiệu lực 01/07/2026 |
| Trần lãi vay dân sự 20%/năm (Điều 468 BLDS 2015) | 19 | `civil-interest-cap` | bài báo 04/12/2018 |
| Không gửi link qua SMS/email từ 01/01/2025; không chia sẻ OTP | 21, 22 | `sbv-security` — NHNN | 31/03/2025 |
| Cho thuê/mượn/bán tài khoản có thể bị xử phạt hoặc truy cứu | 21 | `account-rental` — Công an qua Chinhphu.vn | 10/03/2026 |
| 21 ngày cân nhắc cho HĐ nhân thọ/sức khỏe trên 1 năm (Điều 35 Luật KDBH 2022) | 23 | `insurance-free-look` | bài báo 13/03/2023 |
| Luật BVQLNTD 2023 hiệu lực 01/07/2024 | 25 | `consumer-law-2023` | 01/07/2024 |
| Hạn mức bảo hiểm tiền gửi 350.000.000đ/người/tổ chức (cũ 125.000.000đ) | 24 | `deposit-insurance-2026` — TT 05/2026/TT-NHNN | hiệu lực 13/07/2026 |
| Thận trọng với lời mời lợi nhuận cao; công ty chứng khoán phải được cấp phép | 22, 29 | `ssc-warning` — UBCKNN | 30/06/2022 |

Các lãi suất, lạm phát, phí và tỷ lệ rút trước hạn trong bài 19, 20, 26–29 là **giả định để học cách tính**, được ghi rõ trong bài. Chúng không phải số liệu thị trường.

## Nguồn mới (accessedAt 2026-11-05)

Tất cả đã được mở và đọc ngày 05/11/2026; chi tiết nằm trong `sourceRegistry[].validation`. Không trích nguyên văn; ví dụ VND do Picket tự soạn.

- `oecd-core-2016` — G20/OECD INFE Core Competencies Framework on Financial Literacy for Adults (2016): khung năng lực cho quỹ dự phòng, lãi kép, lạm phát, đa dạng hóa, lừa đảo, thuế.
- `bhxh-rates`, `pit-law-2025`, `pit-deduction-2026`, `civil-interest-cap`, `sbv-security`, `account-rental`, `ssc-warning`, `insurance-free-look`, `consumer-law-2023`, `deposit-insurance-2026` — xem bảng trên.
- Dùng lại nguồn cũ (accessedAt giữ 2026-10-23, không mở lại): CFPB Your Money, Your Goals (spending, bills, cashflow, saving, goals, priority, loans, emergency, cost), FTC trials, Bộ Công an (otp), Ủy ban Cạnh tranh quốc gia (payment-safety), EU/OECD 2022.

## Chưa xác minh được

1. Chưa mở được toàn văn Luật 109/2025/QH15, Thông tư 05/2026/TT-NHNN và bản gốc NQ 110/2025. Số liệu lấy từ cổng phổ biến pháp luật Cần Thơ, cổng dịch vụ công Nghệ An và Hiệp hội Ngân hàng. Cần đối chiếu Công báo trước khi phát hành.
2. Nguồn mâu thuẫn về việc biểu 5 bậc áp dụng cho tiền lương từ 01/01/2026 (theo kỳ tính thuế 2026) hay từ 01/07/2026. Bài 18 chỉ nói luật có hiệu lực 01/07/2026 và giảm trừ áp dụng từ kỳ tính thuế 2026; không khẳng định biểu nào dùng cho tháng 1–6/2026.
3. Chưa xác minh mức trần lương đóng BHXH năm 2026 (lương cơ sở có thể đổi). Ví dụ dùng lương ≤ 40.000.000đ, thấp hơn trần 46.800.000đ tính theo lương cơ sở 2.340.000đ.
4. Nguồn Điều 468 BLDS là bài năm 2018; không tìm thấy sửa đổi, nhưng chưa đối chiếu văn bản hiện hành.
5. Nguồn 21 ngày nói được nhận lại phí; luật có thể trừ chi phí hợp lý. Bài 23 không nêu mức hoàn để tránh sai.
6. Không xác minh được tổng đài khiếu nại người tiêu dùng hiện hành, nên bài 25 không nêu số điện thoại.
7. Trang investor.gov và IOSCO trả lỗi 403, nên không dùng làm nguồn.
8. Chưa có người duyệt độc lập (tài chính, pháp lý, ngôn ngữ), chưa pilot người học, chưa đo thời lượng, chưa kiểm TalkBack/chữ lớn.

## Ảnh hưởng sản phẩm cần chủ dự án quyết định

- Huy hiệu `allLessons` giờ cần hoàn thành 30 bài. Người đã xong 12 bài sẽ không còn thấy huy hiệu này cho tới khi học xong bài mới. Nhãn đổi thành "Hoàn thành mọi bài học".
- Bảng `learning_answer_keys` trên Supabase chưa có khóa cho bài 13–30. Cần migration trước khi bật chấm điểm cloud. Lượt này không sửa migration theo yêu cầu.
- Màn học hiển thị tiêu đề giai đoạn và tiến độ `x/30` thay vì `x/12` cố định.

## Kiểm tra đã chạy (05/11/2026)

- `python docs/learning/build_curriculum.py` và `build_curriculum_en.py`: 30 bài, 90 câu, 179 phép tính đạt. App JSON và docs JSON giống nhau từng byte.
- `node --import tsx --test "src/features/learning/**/*.test.ts"` (apps/mobile): 69/69 đạt.
- `npm run test:mobile`: 1078/1078 đạt. `npm run typecheck` và `npm run lint` (apps/mobile): đạt.

## Thêm bài sau này

Thêm một lời gọi `lesson(...)` vào `curriculum_v2_extension.py` (VI, EN, đáp án, phép tính, nguồn, `citedFigures`), đặt số bài vào `STAGE_ORDER`, nguồn mới vào `NEW_SOURCES`, rồi chạy hai generator và test. Không sửa ID, `version` hay đáp án của bài đã phát hành; muốn đổi nội dung bài cũ thì tăng `version`.
