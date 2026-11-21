# Kế hoạch: Làm mới tính năng học tài chính cho cuốn hút (21/11/2026)

Trạng thái: **kế hoạch, chưa code**. Nguồn trích dẫn ở mục 9.

## 1. Vấn đề hiện tại

Nội dung đã có nền tốt: 30 bài, 4 giai đoạn, có nguồn trích dẫn và đáp án chấm trên server. Nhưng trải nghiệm thì nhàm:

- **Nặng chữ:** mỗi bài là một trang cuộn dài (mục tiêu, thân bài 860–1.970 ký tự, ví dụ dài, rồi 3 câu trắc nghiệm, rồi danh sách nguồn) trong `apps/mobile/src/app/learning-preview.tsx`.
- **Phản hồi chậm:** phải trả lời hết 3 câu mới xem được giải thích. Không có hoạt ảnh, hình minh hoạ hay rung phản hồi.
- **Một kiểu tương tác duy nhất:** câu hỏi radio. Bài nào cũng gắn cùng một bài tập "Nhu cầu/Mong muốn" (`features/learning/needs-wants.tsx`).
- **Động lực yếu:** mỗi bài cố định 20 XP (`progress.ts`), chỉ có 5 huy hiệu, ôn tập theo 2 mốc cố định 7 và 30 ngày. Không có streak ngày, mục tiêu tuần, nhắc học hay phần thưởng.
- **Tách rời khỏi dữ liệu thật:** bài học không liên quan gì đến chi tiêu của người dùng. AI chỉ chọn 1 trong 3 lời giải thích cho một tình huống giả định.
- **Khó cập nhật:** nội dung là JSON đóng gói trong app. Admin chỉ có sổ metadata (`web/src/features/admin/views/content.tsx`), nên mỗi lần sửa nội dung đều phải phát hành app mới.
- **Chưa phát hành chính thức:** màn học nằm sau `featureFlags.learning`, và `publicationGate.publishable = false`.

## 2. Bài học từ thị trường (tóm tắt nghiên cứu)

| Ứng dụng | Điều làm tốt | Áp dụng cho PicKet |
|---|---|---|
| Duolingo | Bài 2–5 phút, streak có "đóng băng", hoạt ảnh mốc, leagues. Freeze làm tăng người học hằng ngày mà không tăng tỷ lệ bỏ học. Theo Duolingo, tối ưu giữ chân người dùng hiện tại (CURR) là đòn bẩy lớn nhất | Phiên ngắn, streak và freeze, mốc ăn mừng; thưởng khi làm đúng thay vì phạt khi sai |
| Zogo | Hơn 1.000 module rất ngắn, trivia hằng ngày | Phiên 5 câu, câu đố trong ngày |
| Cleo | Chat có cá tính (Roast/Hype phải bật chủ động), luôn dựa trên giao dịch thật | AI coach có chọn giọng điệu, dựa trên số liệu thật, có đồng ý |
| Spent | Mô phỏng sống một tháng, mỗi lựa chọn có hậu quả, 1–2 triệu lượt chơi | Mô phỏng "Tháng đầu đi làm" bằng tiếng Việt |
| Quizlet | Ôn tập ngắt quãng theo mức nhớ | Thay mốc 7/30 bằng lịch Leitner |
| MoMo Heo Đất | Nhiệm vụ ngày, linh vật, đố vui "Heo đi học", rất quen với người Việt | Linh vật và nhiệm vụ ngày, **không** dùng quà ngẫu nhiên |
| Coinbase Learn & Earn | Thưởng tiền thật nên bị chia sẻ đáp án và "cày" thưởng | Thưởng có trần, chỉ thưởng lần đầu, chấm trên server |

Nghiên cứu học thuật cho thấy ba điều:
- Giáo dục tài chính chung chung có hiệu quả thấp và **phai dần sau khoảng 20 tháng**. Hiệu quả tốt nhất khi dạy **đúng lúc người dùng sắp ra quyết định** (just-in-time).
- Phản hồi so sánh với **chi tiêu quá khứ của chính người dùng** làm giảm chi tiêu tuỳ ý, và hiệu quả kéo dài nhiều tháng.
- Tự kiểm tra và ôn tập ngắt quãng làm tăng mức ghi nhớ rõ rệt.

Đây chính là lợi thế của PicKet so với app học thuần tuý: **PicKet có dữ liệu chi tiêu thật để dạy đúng lúc.**

## 3. Nguyên tắc thiết kế

1. **Một phiên 2–4 phút**, gồm 5–8 thẻ, và cứ 1–2 thẻ lại có một tương tác.
2. **Học từ tiền của chính mình:** số liệu trong bài lấy từ giao dịch của người dùng, tính ngay trên máy.
3. **Phản hồi tức thì và vui:** chấm từng câu ngay, có rung nhẹ, hoạt ảnh, linh vật phản ứng.
4. **Thưởng, không phạt:** không có hearts hay energy. Streak có đóng băng. Thông báo nhẹ nhàng, có thể tắt.
5. **An toàn:** không tư vấn sản phẩm đầu tư hay vay; AI chỉ chọn trong nội dung đã duyệt; không có cơ chế may rủi.

## 4. Định dạng bài học mới

Mở rộng schema bài học thành `blocks: [{ type, ... }]`, schema v2. Vẫn giữ `lessonId` và đáp án v2 để dữ liệu đồng bộ cũ không bị hỏng. Các loại block:

| Block | Mô tả | Ví dụ |
|---|---|---|
| `card` | Thẻ vuốt tối đa khoảng 200 ký tự, kèm hình minh hoạ | Tách `keyTakeaways` sẵn có thành 3 thẻ |
| `myth` | "Hiểu lầm hay sự thật?", vuốt trái/phải | Lấy từ trường `misconception` sẵn có |
| `quiz` | Trắc nghiệm có phản hồi và giải thích ngay | Câu hỏi hiện tại, hiện giải thích tại chỗ |
| `sort` | Kéo thả giao dịch vào nhóm | Chi cố định, biến đổi, theo năm (bài 14) |
| `allocate` | Kéo thanh để chia lương vào các túi | Chia 10 triệu theo 50/30/20 (bài 15) |
| `estimate` | Kéo thanh trượt đoán số rồi mới xem đáp án | Lãi kép 10 năm, lương thực nhận |
| `order` | Xếp thứ tự các bước | Các bước xử lý khi bị đòi OTP (bài 11, 21) |
| `chat` | Tình huống phân nhánh dạng chat | "Nhân viên ngân hàng" đòi mã OTP; lời mời "lãi 3%/tháng" |
| `mine` | Câu hỏi dùng số liệu thật của người dùng | "Tháng này bạn chi ăn uống 2,4 triệu, chiếm bao nhiêu % thu nhập?" |

**Mô phỏng "Tháng đầu đi làm của Lan":** 8–10 sự kiện (tiền nhà, đám cưới bạn, điện thoại hỏng, app cho vay mời chào, tin nhắn lừa đảo). Mỗi lựa chọn làm thay đổi số dư và quỹ dự phòng. Cuối mô phỏng có bảng tổng kết và gợi ý bài học phù hợp. Tái dùng các tình huống `cash-gap-v1` và `reserve-choice-v1` đã có.

## 5. Bài học "đúng lúc" (just-in-time) theo dữ liệu thật

| Tín hiệu trong app | Bài gợi ý | Vị trí hiển thị |
|---|---|---|
| Chi tiêu vượt 80% ngân sách một danh mục | Ngân sách túi (bài 15), nhu cầu/mong muốn | Thẻ nhỏ dưới cảnh báo ngân sách |
| Có khoản chi bất thường (lớn hơn 3 lần trung vị) | Quỹ dự phòng (bài 05/17) | Sau khi lưu giao dịch |
| Phát hiện khoản đăng ký định kỳ hoặc dùng thử | Bẫy đăng ký (bài 12) | Danh sách định kỳ |
| Có giao dịch "Lương" | Tiền thực nhận, chia lương (bài 13) | Home, ngày nhận lương |
| Chụp hoá đơn lần đầu | Ghi chép đúng cách | Sau khi OCR |
| Đầu tháng 3 | Quyết toán thuế thu nhập cá nhân | Thông báo theo mùa |

Luôn có nút "Không phải lúc này". Mỗi tuần gợi ý tối đa 2 lần. Mọi phép tính làm trên máy, không gửi giao dịch đi đâu.

## 6. Hệ thống động lực

- **Streak ngày:** chỉ cần 1 hành động nhỏ là giữ chuỗi: hoàn thành 1 phiên học, *hoặc* 3 câu ôn nhanh, *hoặc* ghi chép giao dịch trong ngày. Việc học vì thế gắn với thói quen cốt lõi của app.
- **Đóng băng streak:** tặng 1 lần mỗi tuần, trữ tối đa 2. Có thể đổi bằng XP; **không bán bằng tiền**.
- **XP theo nỗ lực:** đúng ngay lần đầu được +5, hoàn thành phiên được +10, ôn đúng hạn được +5, hoàn thành mô phỏng được +20. Thay mức cố định 20 XP. Lưu ý `parseProgress` hiện chặn `xp !== 20`, nên cần lên schema progress v2.
- **Mục tiêu tuần tự chọn** (3, 5 hoặc 7 phiên): hiện vòng tiến độ, không phạt nếu không đạt.
- **Huy hiệu:** mở rộng từ 5 lên khoảng 20, theo năng lực ("Thợ săn lừa đảo", "Đọc hiểu phiếu lương") và theo hành vi thật ("4 tuần không vượt ngân sách ăn uống").
- **Linh vật "Ví Kết":** lớn dần theo cấp độ và phản ứng khi người học đúng hoặc sai.
- **Thưởng ngày Pro có trần:**
  - Hoàn thành một giai đoạn được 3 ngày Pro; streak 30 ngày được 7 ngày; tối đa 30 ngày mỗi năm cho mỗi tài khoản.
  - Tỷ lệ quy đổi cố định và công bố rõ, không ngẫu nhiên, không đổi ra tiền.
  - Cấp phía server bằng `plan_grants` có hạn (đã có hành động `grant_plan`). Không đụng vào gói đăng ký Google Play.
  - Chống "cày" thưởng: chỉ thưởng cho bài hoàn thành lần đầu, chỉ tính 3 phiên mỗi ngày, chỉ tài khoản đã xác minh, và câu hỏi được chấm trên server.
  - **Trước khi làm phải kiểm tra lại chính sách Play và quy định khuyến mại Việt Nam.**
- **Không làm bảng xếp hạng công khai** ở giai đoạn đầu vì dữ liệu tài chính nhạy cảm.
- **Nhắc học:** 1 thông báo "giữ chuỗi" vào buổi tối, chỉ khi streak có nguy cơ đứt; tắt được trong Cài đặt.

## 7. Lộ trình triển khai

| Đợt | Nội dung | Ước lượng | Điều kiện xong |
|---|---|---|---|
| 0 | **Analytics nền:** sự kiện `learning_open`, `session_start`, `card_view`, `answer`, `session_complete`, `streak_*`; dashboard trên admin "Tương tác" | 3–4 ngày | Có số liệu nền D1/D7 của tính năng học |
| 1 | Trình phát phiên dạng thẻ: các block `card`, `myth`, `quiz` (phản hồi tức thì), rung, hoạt ảnh; tự chuyển 30 bài hiện có sang thẻ bằng script trong `docs/learning/` | 1,5 tuần | 30 bài chạy được dạng thẻ, có test vi/en và TalkBack |
| 2 | Streak, đóng băng, mục tiêu tuần, XP v2, 20 huy hiệu, nhắc học; schema progress v2 kèm migration đồng bộ | 1,5 tuần | Progress cũ đọc được; test chuyển đổi |
| 3 | Block tương tác `sort`, `allocate`, `estimate`, `order`; ôn tập Leitner (1, 3, 7, 16, 35 ngày) và "3 câu ôn nhanh" | 1,5 tuần | Mỗi giai đoạn có ít nhất 2 bài dùng tương tác mới |
| 4 | Bài học just-in-time và block `mine` dùng số liệu thật | 1,5 tuần | Có 6 tín hiệu ở mục 5, có A/B với nhóm đối chứng |
| 5 | Mô phỏng "Tháng đầu đi làm" và 2 tình huống chat (OTP, lừa đảo đầu tư) | 2 tuần | Tỷ lệ hoàn thành mô phỏng ≥ 60% |
| 6 | Nội dung trên cloud kèm trình soạn trong admin (blocks, xem trước, duyệt, xuất bản theo phiên bản); app vẫn giữ bản đóng gói để học ngoại tuyến | 2 tuần | Sửa một bài không cần phát hành app |
| 7 | Thưởng ngày Pro có trần (sau khi kiểm tra chính sách) | 1 tuần | Có trần, có nhật ký, chống "cày" |
| 8 | AI coach cho Pro: chọn trong kho gợi ý đã duyệt, chọn giọng "Nhẹ nhàng" hoặc "Thẳng thắn", tóm tắt tuần; có đồng ý | 2 tuần | Không có văn bản AI tự sinh nào chưa qua kiểm duyệt |

Song song với các đợt trên: hoàn tất `publicationGate` (rà soát chuyên môn, pháp lý, TalkBack, bản dịch) để có thể bật tính năng học cho người dùng thật.

## 8. Chỉ số đo lường và rủi ro

**Chỉ số chính:**
- D1, D7, D30 của người học so với người không học (có nhóm đối chứng).
- Tỷ lệ người học tuần trước còn học tuần này.
- Tỷ lệ hoàn thành phiên ≥ 70%.
- Thời gian trung vị mỗi phiên từ 2 đến 4 phút.
- Điểm rời bỏ theo từng thẻ.

**Thói quen:** phân bố độ dài streak, tỷ lệ dùng đóng băng, tỷ lệ đạt mục tiêu tuần.

**Hành vi (quan trọng nhất):** sau bài học just-in-time, tỷ lệ người dùng lập hoặc chỉnh ngân sách, tạo quỹ dự phòng, số ngày ghi chép mỗi tuần, tỷ lệ vượt ngân sách tháng sau.

**Kinh doanh:** chuyển đổi Free→Pro của nhóm nhận ngày Pro thưởng, tỷ lệ "cày" thưởng bất thường.

**Rủi ro:**
- Streak gây áp lực: dùng đóng băng, giọng nhẹ nhàng, giới hạn thông báo.
- Thưởng làm méo động cơ học: có trần, chỉ thưởng lần đầu, chấm trên server.
- Quyền riêng tư khi dùng số liệu thật: tính trên máy; AI chỉ dùng số liệu tổng hợp và phải có đồng ý; cập nhật Data Safety.
- Chi phí làm nội dung (hình, mô phỏng): làm thẻ và phản hồi tức thì trước, vì chi phí thấp và tái dùng được nội dung sẵn có.
- Nợ kỹ thuật (`xp === 20`, mốc 7/30 cố định): migration schema v2 và giữ tương thích ngược.

## 9. Nguồn chính

- Duolingo, streak và đóng băng: https://blog.duolingo.com/how-duolingo-streak-builds-habit/
- Duolingo, tăng trưởng nhờ CURR và leagues: https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth
- Duolingo, chuyển từ hearts sang energy: https://blog.duolingo.com/duolingo-energy/
- Hiệu quả giáo dục tài chính phai theo thời gian (Fernandes và cộng sự): https://papers.ssrn.com/abstract=2333898 ; tổng hợp 76 RCT: https://docs.iza.org/dp13178.pdf
- Phản hồi so với chi tiêu của chính mình: https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/personal-financial-information-presentation-and-consumer-spending/FB3B05430DC8FFCEC2707C4161E83086
- Công cụ cam kết, tài khoản SEED: https://users.nber.org/~rdehejia/!@$devo/Lecture%2007%20Savings/supplemental/Ashraff_Karland_Yinn_SEED.pdf
- Ôn tập ngắt quãng và tự kiểm tra: https://www.nature.com/articles/s44159-022-00089-1
- Spent: https://en.wikipedia.org/wiki/Spent_(video_game)
- Zogo: https://www.fool.com/the-ascent/personal-finance/zogo-review/
- MoMo Heo Đất: https://www.momo.vn/tin-tuc/tin-tuc-su-kien/cung-nuoi-heo-dat-momo-chung-tay-lam-ngan-dieu-hay-999
- Chính sách Play về phần thưởng và may rủi: https://support.google.com/googleplay/android-developer/answer/9877032 ; https://android-developers.googleblog.com/2017/06/google-plays-policy-on-incentivized.html

Những điểm chưa kiểm chứng: quy định khuyến mại Việt Nam áp dụng cho việc tặng ngày Pro; chính sách Play hiện hành về việc cấp đặc quyền ngoài Play Billing; nội dung giáo dục bên trong Cake, Timo và Money Lover.
