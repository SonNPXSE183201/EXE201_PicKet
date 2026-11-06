# Picket mobile — nghiên cứu thị trường và lựa chọn cạnh tranh

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ngày kiểm tra nguồn: **22/10/2026**. Đây là desk research phục vụ kế hoạch, không phải báo cáo đã cài và sử dụng tất cả ứng dụng, khảo sát đại diện hay chứng minh hiệu quả giáo dục. Phạm vi: Expo Android; không thay đổi web.

Đọc cùng [kế hoạch tổng](MOBILE_SETTINGS_LEARNING_AI_PLAN_20261022.md), [đặc tả học và khác biệt](MOBILE_LEARNING_DIFFERENTIATION_SPEC_20261022.md), [đặc tả AI/dự báo](MOBILE_AI_FORECAST_INTEGRATION_SPEC_20261022.md) và [45 nhóm khoảng trống catalogue](MOBILE_FEATURE_CATALOGUE_GAPS_20261022.md).

## 1. Kết luận thay đổi hướng sản phẩm

**Không chọn “có OCR, chatbot, dự báo, quiz” làm tuyên bố khác biệt.** Các thành phần này đã xuất hiện ở đối thủ; ngay cả giáo dục kết hợp quản lý tiền cũng không mới. Cần thắng ở một công việc cụ thể: giúp người dùng Việt hiểu một quyết định tiền bạc của chính mình, thử hệ quả trước khi làm, rồi nhớ và áp dụng được sau đó.

Định vị cần kiểm chứng: **“Ghi một khoản. Hiểu một điều. Thử trước quyết định tiếp theo.”** Đây là định hướng sản phẩm, chưa phải slogan đã thử nghiệm hoặc tuyên bố Picket độc quyền trên thị trường.

Ba năng lực gắn thành vòng lặp:

1. **Học từ khoản chi thật:** sau khi xác nhận giao dịch/hóa đơn, tùy chọn học 60–90 giây về một khái niệm liên quan; luôn có ví dụ giả lập thay dữ liệu thật.
2. **Thử quyết định:** thay giá/ngày mua và xem nghĩa vụ, số dư dự kiến cùng những dữ liệu còn thiếu. Công thức tính bằng code, không nhờ LLM đoán.
3. **Sổ năng lực:** phân biệt đã xem, đã hiểu tình huống, đã thực hành và đã nhớ lại; không đồng nhất streak hay XP với “giỏi tài chính”.

Lợi thế này chỉ có giá trị nếu ít làm phiền luồng ghi chép, nội dung Việt Nam tốt và người dùng áp dụng được. Nếu chỉ thêm thẻ bài học cạnh chatbot thì chưa đủ khác biệt.

## 2. Phương pháp và giới hạn bằng chứng

- Đọc trang sản phẩm, help, release notes, điều khoản và developer docs chính thức. Những gì nhà cung cấp mô tả là **năng lực được công bố**, không phải nghiệm thu độc lập.
- Với thông tin thay đổi, ưu tiên release notes mới hơn trang help cũ; ví dụ Monarch đã mở rộng scenario forecasting trong cập nhật tháng 6/2026.
- Đọc một mẫu nhỏ review công khai để tạo câu hỏi nghiên cứu, không suy ra tỷ lệ lỗi hay thị phần. Không dùng rating tổng để xếp hạng hiệu quả học.
- Chưa kiểm tra checkout/giá theo tài khoản Việt Nam, app trả phí, accessibility hay hành vi offline hiện tại của từng đối thủ. Không có dữ liệu để kết luận đối thủ “không có” một tính năng chỉ vì trang giới thiệu không nhắc.
- Chưa phỏng vấn người dùng Picket. Phân khúc, mức sẵn lòng trả tiền và các ngưỡng pilot dưới đây đều là giả thuyết.
- Tham khảo cơ chế; không sao chép bài học, câu hỏi, hình ảnh hoặc nội dung có bản quyền. Nội dung Picket phải có nguồn và biên tập riêng.

## 3. Ứng dụng giáo dục tài chính

| Ứng dụng / nguồn đã kiểm tra | Điều quan sát được | Nên học cho Picket | Không bê nguyên |
| --- | --- | --- | --- |
| [Zogo — support](https://zogo.com/support) | Công bố hơn 1.200 module, lộ trình theo tuổi/sở thích; điểm đổi thưởng, hearts và streak. Phục vụ từ 13 tuổi; cơ chế tài trợ/đổi thưởng có ràng buộc thị trường và xác minh Mỹ. | Bài nhỏ, lộ trình theo mục tiêu, tiến độ dễ hiểu. | Cash reward, khan hiếm quà và giới hạn lượt học bằng hearts. Chưa xác nhận chương trình tiếng Việt. |
| [Finimize — FAQ](https://finimize.com/business/redirect/faq), [khám phá app](https://intercom.help/finimize-help/en/articles/11644100-explore-the-app) | Brief text/audio, thư viện, chuyên gia/sự kiện, bookmark/offline và nội dung theo quan tâm. FAQ qua đường dẫn chuyển hướng; giá checkout địa phương chưa xác nhận. | Nội dung đọc/nghe ngắn và lưu để xem lại; lựa chọn chủ đề. | News feed đầu tư hoặc trả phí theo lượng bài; không thấy đủ bằng chứng về curriculum có đánh giá mastery. |
| [Female Invest](https://www.femaleinvest.com/), [App Store](https://apps.apple.com/kw/app/female-invest/id1621492150) | Lộ trình theo mục tiêu, khóa học, bài tập/worksheet, cộng đồng/chuyên gia; Playvest mô phỏng và podcast ngắn. | Học → bài tập → công cụ; ví dụ đời sống và cách nói dễ tiếp cận. | Cộng đồng lớn hoặc giả lập đầu tư trước khi có moderation/nội dung; số liệu tự công bố không chứng minh Picket sẽ đạt cùng kết quả. |
| [Greenlight Level Up — cách chơi](https://help.greenlight.com/hc/en-us/articles/10412843038491-How-to-play-Greenlight-Level-Up) | Video ngắn, câu hỏi và tình huống, XP/coins/stars; độ khó và lượt chơi trong hệ sinh thái gia đình. | Phản hồi ngay và giải thích khi chọn sai; tình huống thay vì chỉ định nghĩa. | Gamification cho trẻ em hoặc tài khoản ngân hàng gia đình: Picket hiện chọn người lớn, chưa có household/parent consent. |
| [Goalsetter — listing chính thức](https://play.google.com/store/apps/details?hl=en_GB&id=com.goalsetter) | Quiz, Moneylingo, tiết kiệm và Learn to Earn gắn hệ sinh thái gia đình Mỹ. Trang features được thử nhưng không truy cập ổn định. | Gắn kiến thức với một mục tiêu cụ thể. | Không dùng mức giá/features từ trang lỗi làm quyết định chắc chắn; không cần trả thưởng để chứng minh học tốt. |

Kết luận: bài nhỏ, quiz, cá nhân hóa theo mục tiêu và gamification là **mẫu thiết kế đã phổ biến**, không phải moat. Cần phân biệt thu hút quay lại với hiểu và áp dụng. Chưa có bằng chứng trong lượt này rằng ứng dụng nào tạo kết quả học vượt trội trên nhóm người Việt mục tiêu.

## 4. Ứng dụng quản lý tiền và AI

| Ứng dụng / nguồn | Khả năng công bố có liên quan | Đối sách cho Picket |
| --- | --- | --- |
| [Cleo](https://web.meetcleo.com/), [UK help](https://web.meetcleo.com/faqs/en/articles/12992410-what-s-available-in-the-uk-app) | Chat, phân tích chi tiêu, roadmap cá nhân, voice/roast; dịch vụ khác nhau giữa Mỹ và Anh. | Không cạnh tranh bằng giọng chatbot hài hước hay upsell tín dụng. Ưu tiên giải thích có chứng cứ, không phán xét. |
| [YNAB Method](https://support.ynab.com/en_us/the-ynab-method-an-overview-SJmiqpi6j), [Targets](https://support.ynab.com/how-to-use-targets-rk5kkI9ks), [Loan Planner](https://www.ynab.com/whats-new/introducing-ynabs-loan-planner) | Phương pháp quản lý tiền, mục đích phân bổ, mục tiêu và công cụ kế hoạch nợ. | Giáo dục gắn hành động đã có tiền lệ. Picket nên chọn bài tại thời điểm ra quyết định và tiền mặt/thu nhập thất thường, không tự nhận là app đầu tiên dạy quản lý tiền. |
| [Monarch winter release](https://www.monarch.com/blog/winter-release), [June update](https://www.monarch.com/blog/june-product-update), [Forecasting](https://help.monarch.com/hc/en-us/articles/48344305092244-Forecasting-in-Monarch) | AI Assistant, quét hóa đơn, matching/split; web/mobile, bulk scan và scenario forecasting. | OCR → insight → scenario đã có đối thủ mạnh. Phải thêm vòng kiểm tra hiểu và nhớ, không chỉ diễn giải báo cáo. |
| [PocketSmith forecasting](https://www.pocketsmith.com/tour/cash-flow-forecasts/), [MCP](https://developers.pocketsmith.com/docs/pocketsmith-mcp-server) | Lịch dòng tiền dài hạn, nhiều tiền tệ; AI assistants có thể truy cập dữ liệu/forecast qua MCP. | Không chạy đua dự báo 30 năm. Đầu tiên làm 7/30 ngày, lịch nghĩa vụ rõ và sửa giả định dễ. |
| [Money Lover](https://moneylover.me/), [App Store/release notes](https://apps.apple.com/gh/app/money-lover-money-manager/id486312413) | Thu chi, ngân sách, mục tiêu, nợ; bank support Việt Nam; cập nhật tháng 6/2026 có smart receipt và nhiều hóa đơn. | Không mô tả đối thủ Việt là sổ thu chi thủ công. Tốc độ sửa OCR và chuyển ví phải tốt trước khi thêm gợi ý học. |
| [MISA Money Keeper](https://sothuchi.misa.vn/), [App Store/release notes](https://apps.apple.com/us/app/spending-tracker-money-manager/id865818973) | Voice Việt, ngân sách, sync, gia đình; AI hóa đơn/bank sync. Release notes tháng 6/2026 có trợ lý phân tích/đề xuất, tháng 8 có banner giáo dục. | Đối thủ trực tiếp đã có AI và tín hiệu giáo dục. Banner chưa chứng minh curriculum tích hợp sâu; cần thử sản phẩm trước khi kết luận khoảng trống. |

Không tuyên bố “chỉ Picket có offline”: [YNAB](https://www.ynab.com/features) có công bố offline; [help MISA cũ](https://api.sothuchi.vn/Help/vi-VN/) cũng mô tả ghi chép offline. “Offline account” của PocketSmith có thể chỉ là ví không có bank feed, không đồng nghĩa cả app chạy không mạng. Tương tự, tuyên bố không bán dữ liệu không đồng nghĩa dữ liệu không qua bên xử lý cloud.

## 5. Tiếng nói người dùng: tín hiệu nhỏ, không phải thống kê thị trường

Mẫu thuận tiện **7 reviewer khác nhau** từ hai listing chính thức ở bảng trên; không tính lặp các khối HTML hoặc reply của nhà phát triển. Tài khoản review chưa xác thực độc lập; storefront và tuổi review tạo thiên lệch. Review cũ chỉ gợi ý nhu cầu, **không phải lỗi hiện tại**.

| App / reviewer / ngày | Tóm tắt diễn giải, không trích nguyên văn | Câu hỏi cần kiểm tra với Picket |
| --- | --- | --- |
| MISA / linh.k.le / 30/05/2025 | Đề cao ghi tiền mặt/thẻ/ngân hàng, ngân sách; quay lại sau thử app khác. | Một workflow quen có quan trọng hơn thêm nhiều module không? |
| MISA / _EarRaid_ / 22/11/2018 | Thích UI, muốn kỳ lặp và tiền tệ linh hoạt. | Thu nhập/khoản chi của người Việt có theo tháng cố định không? |
| MISA / butterflybounce / 15/11/2017 | Cần sync nhiều thiết bị, phản ánh vấn đề sync ngân sách lúc đó. | Người dùng hiểu tình trạng đồng bộ và tin số dư dự báo không? |
| MISA / 준 니 안 뉴 / 01/03/2020 | Điểm check-in tạo động lực ghi hàng ngày. | Động lực tạo ghi đúng hay chỉ mở app lấy điểm? |
| Money Lover / qazwsxedxedcrfc / 26/10/2021 | Thấy hữu ích cho kế hoạch tiền. | Quyết định cụ thể nào thay đổi sau khi xem báo cáo? |
| Money Lover / Sque_e / 09/04/2024 | Phàn nàn tên ví và luồng chuyển tiền dài. | Thêm học có làm luồng ghi/chuyển tiền dài hơn không? |
| Money Lover / Tozzy 123 / 08/09/2019 | Coi trọng ghi chi offline. | Mạng yếu/không đăng nhập có còn học và thử scenario được không? |

Chưa đủ nguồn để xây persona đã xác nhận, xác suất nhu cầu hoặc willingness-to-pay. Không công bố “đa số người dùng muốn AI”.

## 6. Cơ sở thiết kế giáo dục và lợi thế có thể tích lũy

[CFPB toolkit 2024](https://files.consumerfinance.gov/f/documents/cfpb_five-principles-practitioner-toolkit_2024-08.pdf) nhấn mạnh giáo dục phù hợp hoàn cảnh và hỗ trợ hành động. Picket áp dụng bằng bài đúng lúc, một hành động nhỏ và quyền bỏ qua. Đây là diễn giải thiết kế, không phải chứng nhận chương trình. [EU/OECD framework](https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/01/financial-competence-framework-for-adults-in-the-european-union_614b8b97/510f133c-en.pdf) dùng làm bản đồ năng lực, không sao chép nguyên giáo trình sang Việt Nam.

| Thành phần | Có dễ sao chép không? | Điều Picket cần tích lũy |
| --- | --- | --- |
| Quiz, badge, chatbot, màu giao diện | Rất dễ | Chất lượng UX nhất quán; không coi là lợi thế bền vững |
| Bài học từ receipt/transaction | Cơ chế dễ; biên tập và an toàn khó hơn | Bộ tình huống Việt có nguồn, mapping khái niệm và lỗi hiểu thường gặp |
| Thử quyết định và giải thích từ facts | Engine có thể sao chép | Bộ fixture tài chính, kiểm thử sai số, khả năng giải thích và sửa giả định |
| Đo nhớ/áp dụng mà không gây áp lực | Khó vận hành tốt | Rubric, pilot, lỗi UX đã sửa, niềm tin và nội dung cải tiến có consent |

Không xây “moat” bằng thu gom giao dịch nhạy cảm hoặc bán dữ liệu. Không đủ bằng chứng để kết luận chưa ứng dụng nào khác làm vòng lặp tương tự.

## 7. Nghiên cứu tiếp theo trước đầu tư lớn

1. **12 phỏng vấn khám phá**, chia tạm 3 nhóm: sinh viên tự quản tiền; người mới đi làm; người có thu nhập thất thường. Mỗi nhóm 4 người chỉ đủ khám phá, chưa đủ xác nhận persona. Tuyển người lớn, đa dạng giới và mức kinh nghiệm; không chỉ bạn bè dự án.
2. Hỏi về quyết định gần nhất, cách họ ghi/sửa số, điều họ từng hiểu sai; đề nghị kể trải nghiệm trước khi giới thiệu ý tưởng Picket. Không yêu cầu sao kê, số dư hay merchant thật. Đồng ý ghi âm riêng; từ chối không ảnh hưởng tham gia.
3. **6–8 usability sessions**: ghi hóa đơn → bỏ qua/học; thử khoản mua; đổi giả định; tắt AI; đổi theme/ngôn ngữ. Đo task completion, thời gian, hiểu cảnh báo và lỗi định hướng. Không chỉ hỏi “có thích không”.
4. **Pilot 20–30 người, 2–4 tuần**, thêm follow-up D30 nếu lịch cho phép. So baseline của chính họ; nếu muốn chứng minh nhân quả cần thiết kế và cỡ mẫu phù hợp hơn. Bài kiểm tra sau phải khác câu đã học.
5. Thử trực tiếp MISA/Monarch/Zogo ở phiên bản truy cập được trước khi chốt thông điệp cạnh tranh; ghi version, quốc gia, gói, thiết bị và ngày. Không đăng ký trả phí hay mua dữ liệu trong lượt lập kế hoạch này.

Ngưỡng đề xuất để quyết định nội bộ, không phải chuẩn ngành: ít nhất 80% người thử tìm được “giả định/thiếu dữ liệu”; không có lỗi hiểu scenario là số dư bảo đảm; không tăng quá 10% thời gian ghi hóa đơn khi **bỏ qua** gợi ý học so với build đối chứng. Không đạt thì sửa luồng trước khi thêm AI. Kết quả nhỏ phải báo cả số người và số lần thử, không chỉ phần trăm.

## 8. Những gì chưa được làm/không được tuyên bố hoàn tất

Chưa có thử app trả phí, nghiên cứu người Việt trực tiếp, chuyên gia duyệt giáo trình, benchmark AI, backtest dữ liệu thật hoặc xác nhận hiệu quả học. Nghiên cứu này đã được chuyển thành đặc tả đề xuất trong hai tài liệu liên kết; **chưa triển khai vào runtime**. Không tự bật API trả phí, đổi Billing, tạo schema production hay thay trạng thái nghiệm thu thiết bị/Play Billing.
