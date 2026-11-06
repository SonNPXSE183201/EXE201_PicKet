# Kế hoạch mobile Picket về cài đặt học tài chính và AI

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ngày nghiên cứu: **22/10/2026, Asia/Saigon**. Trạng thái: **đề xuất để phê duyệt, chưa triển khai**.

**Bản mở rộng sau deep research:** [thị trường 11 ứng dụng và bằng chứng cạnh tranh](MOBILE_MARKET_RESEARCH_20261022.md), [đặc tả học tài chính/điểm khác biệt](MOBILE_LEARNING_DIFFERENTIATION_SPEC_20261022.md), [đặc tả AI/dự báo và benchmark](MOBILE_AI_FORECAST_INTEGRATION_SPEC_20261022.md). Ba tài liệu bổ sung chi tiết triển khai đề xuất; không làm thay đổi trạng thái nghiệm thu. Các điều chỉnh provider dưới đây thay shortlist ban đầu, không phải kết quả benchmark đã chạy.

## 1. Kết luận và phạm vi

Ưu tiên phát triển theo thứ tự: **Theme/ngôn ngữ → Học tài chính → Dòng tiền và insight có công thức → AI giải thích → AI chấm tình huống và pilot**. Giữ các chức năng thu chi, OCR, guest/offline, đồng bộ và backup đang hoạt động. Không lấy chatbot làm nguồn tính toán tiền.

Chỉ thiết kế sản phẩm cho **Expo Android**. Backend Dart/Supabase và contract dùng chung được bổ sung khi mobile cần, theo hướng tương thích ngược; **không thiết kế lại, sửa UI hoặc triển khai chức năng mới cho web**, không tạo admin CMS web trong giai đoạn này. Không khôi phục Flutter, không mở iOS, không tự đổi gói trả phí.

Giả định để lập kế hoạch: thị trường đầu tiên Việt Nam; người học cá nhân từ 18 tuổi, nhất là sinh viên/người mới đi làm; UI tiếng Việt và tiếng Anh; tiền dự báo ban đầu VND. Đây là lựa chọn phạm vi đề xuất, không phải kết quả khảo sát người dùng đã thực hiện.

Đầu vào: [catalogue](../../Picket.FeatureCatalogue.Final.docx) phiên bản 1.0 ngày 04/10/2026, nhất là §16–18, §21–28; source tại `828e23e`; [trạng thái nghiệm thu hiện hành](../PROJECT_STATUS.md). [Ma trận khoảng trống riêng](MOBILE_FEATURE_CATALOGUE_GAPS_20261022.md) phân biệt phần đã có, còn thiếu và hoãn.

Catalogue §20/27/29 còn mô tả Flutter là bản chính và API/Expo mới ở nền móng. Không dùng snapshot đó để kết luận hiện trạng. “Có code” cũng không đồng nghĩa “đã nghiệm thu mọi nhánh trên điện thoại thật”. Không thay đổi tài liệu gốc đang mở trong Word.

## 2. Hiện trạng đã đối chiếu source

| Năng lực | Bằng chứng | Ý nghĩa cho kế hoạch |
| --- | --- | --- |
| Expo Android, guest/cloud | `apps/mobile/package.json`, `src/core/local/guest-finance.ts`, `_layout.tsx` | Kế thừa owner isolation và SQLite, không xây app khác |
| Theme sáng cố định | `apps/mobile/app.json` có `userInterfaceStyle: light`; `StatusBar` cố định dark; khoảng 52 TSX tham chiếu `colors.*` | Không thể chỉ thêm switch; cần chuyển cả component và screen sang semantic token |
| Locale có lưu, UI chưa dịch | `profile-context.tsx`, `ProfilePatch.locale`; copy và `vi-VN`/`formatVnd` còn cố định trong màn | Lưu locale chưa phải i18n; cần inventory chuỗi và formatter mobile |
| Preferences hiện hành | `PreferencesPatch`: persona, goal, currency_code, hide_balance; Dart whitelist tương ứng | Theme/language mode mới cần contract/migration, không gửi field chưa được API chấp nhận |
| Tài chính và báo cáo cơ bản | giao dịch, ví, split/refund, ngân sách, bills/subscriptions, Insights/Planning | Tái sử dụng dữ liệu, nhưng chưa có engine dự báo tương lai hoặc AI Coach |
| Lỗ hổng dữ liệu cho dự báo | `Bill` chưa có wallet/currency; subscription chủ yếu khoản chi; chưa có lịch thu nhập định kỳ; transaction chưa có enum posted/pending/confirmed đầy đủ | Cần adapter chất lượng dữ liệu và lịch dòng tiền; không giả định mọi field catalogue đã tồn tại |
| Learning/AI | Không tìm thấy lesson/quiz/rubric/challenge/forecast domain, route và schema tương ứng trong các vùng đã rà | Đây là xây mới; OCR ML Kit/PP-OCR hiện có không phải AI tư vấn tài chính |
| Gói | contract vẫn `free/plus/pro`; có OCR quota và Google Play verification | Không ánh xạ `pro → Family` chỉ bằng đổi tên: chưa có household/seats |

Đây là rà soát tĩnh và đọc báo cáo có sẵn, không phải lượt chạy lại toàn bộ test/mobile E2E.

## 3. Cơ sở nghiên cứu và quyết định sản phẩm

- **Giáo dục phải gắn với hành động**: CFPB trình bày cách thu hẹp khoảng cách giữa hiểu biết, ý định và hành động; kế hoạch chọn bài ngắn có một thao tác thực hành sau bài. Độ dài 3–5 phút là giả thuyết UX cần kiểm chứng, không phải con số hiệu quả đã được chứng minh cho Picket. [CFPB, 2017](https://www.consumerfinance.gov/data-research/research-reports/effective-financial-education-five-principles-and-how-use-them/).
- **Dạy năng lực, không chỉ thuật ngữ**: khung EU/OECD-INFE là cơ sở xây mục tiêu học và đánh giá; không phải giáo trình Việt Nam có thể sao chép nguyên trạng. Nội dung tiền tệ, phí, lừa đảo, luật và ví dụ phải được biên tập lại. [EU/OECD, 2022](https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/01/financial-competence-framework-for-adults-in-the-european-union_614b8b97/510f133c-en.pdf).
- **Điểm học khác sức khỏe tài chính**: CFPB có thang đo wellbeing với nghiên cứu riêng. Không gọi rubric hoặc bản dịch tự làm của Picket là thang CFPB đã kiểm định tại Việt Nam. Chưa phát hành Financial Fitness tổng hợp ở bản đầu. [CFPB Financial Well-Being Scale](https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/).
- **Dự báo phải kiểm tra trên tương lai chưa nhìn thấy**: dùng rolling-origin backtest, baseline và đo sai số theo chân trời. Khoảng thấp/cao ban đầu là kịch bản; chưa hiệu chuẩn thì không ghi “độ tin cậy 80%”. [Hyndman và Athanasopoulos, chương 5](https://otexts.com/fpp3/toolbox.html).

Vòng lặp đề xuất:

```text
Dữ liệu đã xác nhận → Nhận xét có bằng chứng → Bài học phù hợp
                  → Quiz/tình huống → Người dùng tự chọn hành động → Xem lại sau 7 ngày
```

Không suy ra giáo dục hoặc AI chắc chắn giúp tăng tiết kiệm. Cần pilot để kiểm tra mức hiểu, mức hữu ích và hành vi tự nguyện.

**Điều chỉnh cạnh tranh:** OCR + AI + dự báo không đủ làm khác biệt; đối thủ quốc tế và Việt Nam đã có nhiều thành phần này. Chọn thử nghiệm vòng lặp **học từ khoản chi đã xác nhận → thử quyết định → ôn tình huống mới**, với dữ liệu minh họa thay thế và bản không AI. Không tuyên bố Picket là ứng dụng đầu tiên/duy nhất. Thực hiện hai bài mẫu và F0 trước, không gộp toàn bộ nội dung tham khảo thành scope release đầu.

## 4. Settings cho theme và ngôn ngữ

### Trải nghiệm

Trong **Cá nhân → Cài đặt ứng dụng**, có Giao diện (Theo hệ thống/Sáng/Tối), Ngôn ngữ (Theo thiết bị/Tiếng Việt/English), cách hiển thị ngày/số, thông báo học tập và trung tâm dữ liệu AI. Đổi theme/ngôn ngữ áp dụng ngay, không làm mất bản nháp, vị trí học, bộ lọc hay phiên đăng nhập. Theme chức năng không bị khóa sau gói trả phí; theme cosmetic nếu có là chuyện sau.

### Kiến trúc

1. Tạo `AppAppearanceProvider`, `useAppTheme()` và style factories trong mobile. Primitive palette hiện có giữ làm tham chiếu; thêm semantic surface/text/action/border/finance/status cho light và dark **ở lớp mobile**, không đổi ý nghĩa export đang được web sử dụng.
2. Chuyển component dùng chung trước (`picket-ui`, icon, input, navigation, dialog, lock/splash/loader), rồi toàn màn. Không chỉ đổi background; kiểm tra chart, ảnh, keyboard, status/navigation bar, toast và disabled/error.
3. Dùng React Native `useColorScheme`/Appearance. Chuyển cấu hình native sang hỗ trợ automatic; đánh giá và cài phiên bản `expo-system-ui` phù hợp SDK 57, tạo bản native mới. Hướng dẫn Expo yêu cầu cấu hình/native support cho Android. [Expo color themes](https://docs.expo.dev/develop/user-interface/color-themes/).
4. Đề xuất `expo-localization` + `i18next/react-i18next`, thay vì tự viết bộ dịch. Có lựa chọn nhẹ hơn `i18n-js` trong ví dụ Expo; chọn i18next vì hooks, key typing, namespaces và plural phù hợp nhiều màn. Kiểm tra dependency/Expo SDK trước khi pin, không cài `latest` mù quáng. [Expo localization](https://docs.expo.dev/guides/localization/), [react-i18next](https://react.i18next.com/latest/using-with-hooks), [plural rules](https://www.i18next.com/translation-function/plurals).
5. Inventory bao gồm UI, accessibility labels, validation, notification, error/offline, billing, consent và lesson. Key có tên theo feature, named placeholders; không ghép câu. CI so đủ key/placeholder vi–en; bản legal/consent có version và người duyệt.
6. Formatter mobile mới nhận locale/currency/timezone; không đổi hành vi `formatVnd` dùng chung khiến web thay đổi ngoài phạm vi. Đổi ngôn ngữ không tự quy đổi VND sang USD, không dịch tên do người dùng nhập, không đổi date-only thành ngày UTC khác.
7. Chuẩn hóa `vi`/`vi-VN`, `en`/`en-US`. Chế độ “theo thiết bị” đọc lại khi Android về foreground; notification đã lên lịch phải cập nhật nội dung mà không tạo nhắc trùng.

### Lưu và đồng bộ

Device override ưu tiên hơn mặc định tài khoản, rồi đến hệ thống. Lưu sẵn trên máy để cold start không lóe theme/ngôn ngữ sai. Giá trị thiết bị không cần chứa dữ liệu tài chính; cloud preference chỉ bổ sung khi người dùng chọn đồng bộ mặc định. `profiles.locale` giữ tương thích; thêm `language_mode`/`theme_mode` tùy chọn theo migration, không nhét `system` vào cột locale hiện có.

Settings hoạt động guest/offline. Đổi owner không mang learning/AI history sang người khác. Backup có schema version và migration: file cũ vẫn mở được; field mới có default, phiên bản quá mới báo rõ trước khi restore; quyền AI không được bật lại từ backup.

**Nghiệm thu:** mọi màn user mobile ở 2 theme × 2 ngôn ngữ; thêm system-follow/background-resume, cold start, chữ 150/200%, TalkBack, bàn phím, A→B→guest. Kiểm tra contrast 4.5:1 cho chữ thường, dấu/icon ngoài màu và Android touch target 48 dp. Không giữ đoạn tiếng Việt ngoài chủ ý khi chọn English.

## 5. Học tài chính qua sử dụng Picket

### Phạm vi phát hành đầu

Learning Hub, 12 bài thuộc 6 chương, quiz có lời giải, **Needs vs Wants**, một thử thách tuần, Weekly Money Story ngắn và một luồng AI Scenario Assessment với rubric công khai. Học/quiz cơ bản có thể hoàn thành khi guest/offline; AI cloud là lựa chọn riêng cần đăng nhập và consent.

| Chương | Hai bài ban đầu | Hành động thực hành |
| --- | --- | --- |
| Hiểu dòng tiền | Thu/chi khác chuyển ví; ghi chép và phân loại | Ghi hoặc rà lại giao dịch; không bắt chi tiền để hoàn thành |
| Lập kế hoạch | Chi bắt buộc và ưu tiên cá nhân; ngân sách theo kỳ thu nhập | Chọn một hạn mức hoặc kiểm tra khoản tới hạn |
| Quỹ dự phòng | Dự phòng khác mục tiêu; chia mục tiêu thành bước nhỏ | Lập mục tiêu tiết kiệm cơ bản hoặc ghi kế hoạch riêng |
| Đọc dự báo | Số dư khác tiền có thể dành ra; giả định và kịch bản | Xác nhận lịch thu/chi rồi đổi một giả định |
| Phí và khoản vay | Gốc/lãi/phí; tổng chi phí và lịch trả | Làm tình huống giả lập; chưa phụ thuộc debt planner |
| An toàn và mua sắm | OTP/phishing/trial gia hạn; chờ trước khoản mua không thiết yếu | Checklist an toàn hoặc xem lại subscription |

12 bài là đề xuất nội dung ban đầu, không khẳng định đã có người học/người duyệt. Bảo hiểm và đầu tư nhập môn trong catalogue để đợt sau; không sinh khuyến nghị mua tài sản/cho vay.

### Cấu trúc bài và kiểm duyệt

Mỗi bài có `lessonId`, `competencyId`, phiên bản/ngôn ngữ, mục tiêu, ví dụ VND, 2–3 câu tình huống, lời giải cho từng phương án, nguồn, người viết/duyệt, ngày review và hành động tự chọn. Bài 3–5 phút; lưu tiếp tục theo block. Có bài nhập môn cho dữ liệu trống, không ép cung cấp thu nhập.

Nội dung đi qua **draft → chuyên môn duyệt → ngôn ngữ/a11y duyệt → published → retired**. Đợt đầu biên tập file nội dung có schema trong Git, bundle offline đi kèm app; backend chỉ phục vụ phiên bản đã xuất bản. Không cần xây CMS web. AI có thể hỗ trợ soạn bản nháp nội bộ, **không tự xuất bản giáo trình hoặc đáp án**. Kiểm tra quyền tái sử dụng nguồn; dẫn nguồn không mặc nhiên cho phép sao chép nguyên bài.

Needs vs Wants dùng bối cảnh và mục tiêu, cho phép nhiều lập luận hợp lý; không phán một khoản mua là sai tuyệt đối. Có tap alternative thay kéo thả, không yêu cầu chạy đua thời gian, không thưởng theo số tiền tiết kiệm.

### Cá nhân hóa và gamification

- Đợt đầu dùng quy tắc giải thích được: ngân sách gần ngưỡng → bài kế hoạch; nhiều khoản định kỳ → bài subscription; chưa rõ ledger → bài ghi chép. Người dùng xem “Vì sao gợi ý”, bỏ qua hoặc tắt mà không bị trừ điểm.
- Hiển thị tối đa một gợi ý học ưu tiên trên Home, không chặn lưu giao dịch/OCR. Không gửi notification học tập khi chưa opt-in; có giờ yên lặng và frequency cap.
- XP/badge/progress cơ bản; thưởng lần đầu và ôn tập theo chu kỳ, event idempotent. Không thưởng tạo/xóa giao dịch, không bán XP, không leaderboard số dư. Streak có nghỉ, tắt được, không xóa lịch sử khi ngắt.
- Challenge tuần đầu: rà các khoản định kỳ hoặc phân loại các khoản chưa rõ. Người dùng xác nhận hoàn thành, phân biệt bằng chứng app và tự khai; không khẳng định đã hủy subscription ngoài đời chỉ từ bấm nút.
- Money Story dựa trên chỉ số đã tính: một thay đổi, một điều đã hoàn thành, một bài học và một hành động. Có bản template không cần AI, không tự chia sẻ ra ngoài.

Financial Fitness, Budget Tetris, Scam Detective, Receipt Recall, pet/coin/marketplace, nội dung trẻ em và family challenge nằm giai đoạn sau. Đổi yêu cầu MVP gamification so với catalogue phải được ghi nhận, không âm thầm gọi toàn bộ §22 đã hoàn thành.

## 6. Phân tích đề xuất và dự báo dòng tiền

### Engine trước LLM

Tạo engine thuần và có fixture kiểm thử. Đầu vào gồm ví trong phạm vi, số dư được tính từ ledger, lịch thu nhập/thu chi tương lai do người dùng xác nhận, bills/subscriptions chưa trả, mục tiêu dự phòng và lịch sử chi biến đổi. **Không mặc định coi ngày không có bản ghi là ngày chi 0**: hỏi mức độ ghi đủ, hiển thị độ phủ và lần đồng bộ cuối.

`Bill` hiện thiếu wallet/currency: bản đầu chỉ tổng hợp cùng tiền tệ với phạm vi rõ; muốn dự báo theo ví phải cho gán nguồn thanh toán và currency. Thêm lịch thu nhập định kỳ riêng; không dùng subscription khoản chi để giả lập lương. Ánh xạ khoản dự kiến ↔ giao dịch thực tế, xác nhận match trước khi loại khoản còn phải trả.

```text
Số dư dự kiến tại ngày d
= số dư tại mốc dữ liệu
+ các khoản thu tương lai trong phạm vi
− nghĩa vụ còn phải trả trong phạm vi
− chi biến đổi dự kiến chưa nằm trong nghĩa vụ
```

Transfer nội bộ bằng 0 ở tổng các ví được chọn, nhưng có thể là inflow/outflow nếu chỉ một phía nằm trong phạm vi. Refund là tiền về có tham chiếu, không tự xem là lương lặp lại. Split phân bổ khoản gốc chứ không cộng thêm dòng tiền. Không tính receipt và transaction thành hai khoản, không cộng lại bill/subscription đã thanh toán. Không cộng chéo tiền tệ khi chưa có tỷ giá nguồn và ngày áp dụng. Mục tiêu ảo không làm giảm số dư ledger; phần “dành cho mục tiêu” hiển thị riêng để tránh đếm hai lần.

Chỉ ledger đã qua xác nhận theo quy tắc nguồn mới vào insight; receipt-only chưa xác nhận không dùng. Contract hiện chưa biểu diễn đầy đủ quality/provenance: cần bổ sung adapter/metadata có kiểm thử, không tự giả định mọi transaction đang lưu có trạng thái `posted`. Dữ liệu pending trên máy hiển thị thành scenario riêng, không gắn nhãn cloud đã xác nhận.

### Các mức sản phẩm

| Mức | Điều kiện và hiển thị |
| --- | --- |
| F0 — lịch chắc chắn theo đầu vào | Có số dư và lịch đã xác nhận: xem nghĩa vụ, khoản thu, kịch bản 7/30 ngày; vẫn nói dữ liệu người dùng có thể thiếu |
| F1 — baseline hành vi | Có lịch sử tương đối đủ: so median/mean bền vững, seasonal-naive theo ngày trong tuần và chi đã tách recurring; chọn bằng backtest |
| F2 — mô hình nâng cao | Chỉ khi baseline không đủ, có dữ liệu/chu kỳ và backtest chứng minh lợi ích; chưa mặc định dùng Prophet, deep learning hoặc GPU |

Ngưỡng vận hành đề xuất để thử nghiệm: dưới 28 ngày ghi chép chủ yếu F0; 28–83 ngày cho baseline thận trọng khi có độ phủ; từ 84 ngày có thể đánh giá theo thứ trong tuần. **Đây không phải ngưỡng khoa học, đủ ngày không tự nghĩa đủ dữ liệu**. Thu nhập thất thường, lịch sử ít, lệch số dư hoặc thiếu chu kỳ lương có thể chỉ hiển thị kịch bản. Không bịa ngày hết tiền khi thiếu đầu vào.

Insight ban đầu: thay đổi danh mục so kỳ có cùng số ngày; nghĩa vụ trước kỳ thu nhập; nhịp chi so hạn mức; khoản định kỳ cần xem lại. Mỗi thẻ có kỳ/phạm vi, công thức/giả định, `dataAsOf`, mức độ thiếu dữ liệu, nguồn drill-down và hành động liên quan. So với 0 thì dùng chênh lệch số tiền, không hiển thị phần trăm vô nghĩa.

**Mua món X thì sao?** là scenario riêng: nhập giá/thời điểm, xem số dư và nghĩa vụ sau mua; mặc định không lưu giao dịch/không sửa ngân sách. Full Financial Twin, ngày đạt mục tiêu và debt snowball/avalanche triển khai sau nền móng này.

### Kiểm định

Backtest rolling-origin 7 và 30 ngày, chỉ dùng thông tin đã biết tại mỗi mốc. Lưu dự báo và phiên bản đầu vào ngay lúc tạo; không dùng bill/sửa giao dịch được biết sau đó để “đoán lại quá khứ”. Đánh giá MAE VND, lỗi ngày số dư thấp, precision/recall cảnh báo, độ rộng/coverage nếu có khoảng đã hiệu chuẩn; tránh MAPE khi giá trị gần 0. Báo riêng cohort ghi đầy đủ/thất thường/thưa dữ liệu. Nếu chưa có dataset được phép dùng, chỉ nghiệm thu công thức bằng synthetic, chưa được công bố chất lượng dự báo thực tế.

## 7. AI dùng cho dự án

### Vai trò và lựa chọn thử nghiệm

Shortlist sau nghiên cứu mở rộng: **OpenAI `gpt-6-luna`, Claude Haiku 5.5, Gemini `gemini-3.5-flash-lite` paid và Mistral Small 4**. Chưa có ứng viên thắng về chất lượng tiếng Việt hoặc account access được xác nhận. Chọn một provider sau benchmark, ngân sách và privacy review; không tự gửi dữ liệu qua nhiều provider khi runtime lỗi. [Đặc tả AI](MOBILE_AI_FORECAST_INTEGRATION_SPEC_20261022.md) có 240 case đề xuất cho launch, safety gates, retention và cách chấm.

| Ứng viên | Giá text standard tại thời điểm tra cứu, USD/1 triệu token | Điều kiện |
| --- | --- | --- |
| GPT-6 Luna | input 0,10; output 0,50 | Có Structured Outputs; gọi API từ backend, không nhúng key trong APK |
| Claude Haiku 5.5 | input 0,10; output 0,50 với prompt ≤100k | Kiểm commercial retention, account access và schema/refusal handling |
| Gemini 3.5 Flash-Lite | input 0,30; output 2,50, gồm thinking output theo bảng giá | Dùng paid service phù hợp; kiểm giới hạn API clients có khả năng được người dưới 18 tuổi truy cập |
| Mistral Small 4 | input 0,15; output 0,60 | Kiểm training preference, commercial DPA và account settings |

Nguồn: [OpenAI model và năng lực](https://developers.openai.com/api/docs/models/gpt-6-luna), [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Mistral Small 4](https://docs.mistral.ai/models/mistral-small-4-0-26-03). Model, quyền truy cập, quota, giá và thời gian hỗ trợ cần kiểm lại trước release; không chọn chỉ vì rẻ hoặc “mới nhất”.

Với giả định minh họa 1.000 user × 20 lần/tháng × 3.000 input + 600 output token, tiền text lần lượt khoảng **12 / 12 / 48 / 16,20 USD/tháng** theo thứ tự bảng. Chưa gồm retry, reasoning vượt giả định, tool/search, thuế, tỷ giá, lưu trữ, backend hoặc công biên tập. Đây không phải hóa đơn dự kiến chắc chắn. Đề xuất pilot cap 20 USD/tháng cần chủ dự án duyệt; đặt hard cap backend, số lượt và token trần, không chỉ budget alert nhà cung cấp.

Không tự bật Billing hoặc nạp tiền. Gói Google AI Pro/YouTube của người dùng không phải bằng chứng project đã có quyền hoặc credit Gemini API; trạng thái Billing phải được kiểm riêng khi triển khai.

### Tích hợp

`Mobile → Dart API → ownership/consent/quality checks → analytics + forecast → approved knowledge retrieval → provider adapter → schema/evidence validation → mobile`.

Giữ Dart làm cổng. REST qua package `http` hiện có đủ cho bản đầu; chưa cần thêm microservice Node/Python, LangChain, vector DB, agent tự vận hành hoặc GPU. Kho 12 bài có thể tìm theo topic/competency trên nội dung đã duyệt; embedding chỉ bổ sung nếu việc tìm kiếm thực sự không đạt.

AI nhận aggregate cần thiết, facts có ID, giả định, các đoạn kiến thức đã duyệt, locale và câu hỏi được giới hạn độ dài. Tên merchant/note/ảnh/QR/địa chỉ mặc định không gửi. Evidence IDs để server đối chiếu, ứng dụng tự tạo deep link; model không được tự bịa URL hay SQL. Không có tool chuyển tiền/sửa dữ liệu; đề xuất mở form là quyền cao nhất ban đầu.

Output cấu trúc đề xuất: `outputId, kind, summary, factRefs, assumptions, limitations, suggestions, lessonIds, dataAsOf, modelVersion, promptVersion, consentVersion`. Schema đúng chưa chứng minh nội dung đúng; validator kiểm mọi số tiền/ngày/tham chiếu với facts tính sẵn và whitelist, chặn output không có chứng cứ. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output).

### Các tính năng AI theo mức rủi ro

1. **AI giải thích insight/Money Story**: chỉ diễn giải facts. Nếu lỗi, dùng template deterministic cùng dữ liệu; không hiển thị lời khuyên bịa.
2. **Coach giới hạn**: câu hỏi như “Nhóm chi nào tăng trong tháng này?” hoặc “Nếu giảm khoản ăn ngoài này thì sao?”. Query intent được ánh xạ hàm allowlist, không cho model truy cập SQL tùy ý. Giới hạn kỳ/phạm vi, số lượt hỏi; hỏi lại khi mơ hồ.
3. **Scenario Assessment**: tình huống biên soạn sẵn, số liệu giả lập. Rubric 5 tiêu chí × 0–20: nghĩa vụ, rủi ro, phương án khác, dự phòng, lập luận. Hiển thị rubric trước, giải thích từng tiêu chí, lưu phiên bản, cho chấm lại/báo sai. Nháp tồn tại khi mất mạng/lỗi/quota; không thay bằng điểm 0.
4. **Financial Fitness**: chỉ nghiên cứu sau pilot. Không chấm giàu/nghèo, không dùng làm điểm tín dụng hoặc cắt quyền truy cập. Không coi tự tin, XP hoặc một lần AI chấm là sức khỏe tài chính được kiểm định.

### Privacy và vận hành bắt buộc

- Consent versioned tách theo cá nhân hóa học, phân tích giao dịch/coach, assessment và Money Story; mặc định AI off. Không xin quyền cải thiện model như điều kiện dùng app; chưa có nhu cầu thì không thu mục đích này.
- MVP cloud AI chỉ với tài khoản người lớn đồng ý, không tự upload guest. Guest vẫn học, quiz và xem tính toán local; sau đăng nhập chỉ merge progress được chọn, không tự nhập financial history hoặc bật consent.
- OpenAI API không dùng dữ liệu để train mặc định; điều đó **không có nghĩa zero retention**. `store:false` không xóa nghĩa vụ abuse-monitoring; cần kiểm retention/region/điều kiện ZDR của tài khoản thật. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).
- Điều khoản Gemini phân biệt unpaid/paid, cảnh báo không gửi thông tin nhạy cảm qua unpaid, và có giới hạn tuổi cho API clients. Nếu mở trẻ vị thành niên/Family sau này phải đánh giá provider và legal riêng, không chỉ thêm checkbox phụ huynh. [Gemini terms](https://ai.google.dev/gemini-api/terms).
- Xóa/thu hồi consent phải vô hiệu hóa request/cache đang chạy và không ghi output muộn. Cache gắn owner + purpose + consent version + locale + dữ liệu/version + model/prompt; không cache dùng chung output cá nhân. Không cache cả key/service role trên mobile.
- Đề xuất lưu lịch sử AI tối đa 30 ngày và cho xóa sớm; retention ứng dụng khác retention provider. Không ghi raw prompt, answer, ghi chú, số tiền hay identity vào analytics/crash logs. Audit lưu metadata tối thiểu; admin không mặc định đọc hội thoại.
- Timeout, backoff có giới hạn, circuit breaker, kill switch; request/quota idempotent có reserve → commit/release, lease/reaper cho worker chết. Retry lỗi hệ thống không thu thêm lượt. Trường hợp provider đã xử lý nhưng client timeout phải resolve job cũ, không tự tạo job tốn tiền mới.
- Không tự chuyển sang provider thứ hai khi consent chưa bao gồm provider đó. Khi AI tắt/quá quota/lỗi, ghi chép tài chính và học cơ bản vẫn dùng được. Không có paywall giữa lưu giao dịch/hoá đơn.
- Review riêng yêu cầu pháp luật, dữ liệu xuyên biên giới, store disclosure và hợp đồng trước release; tài liệu này không phải chứng nhận tuân thủ.

## 8. UX và màn hình dự kiến

Không tự thay 5 tab mobile hiện tại trong đợt đầu. Catalogue §17 đề xuất Camera/Plan nhưng là giả thuyết khác navigation đang có. Giữ đường dẫn cũ, thêm entry “Học tài chính”/“Dòng tiền dự kiến” từ Home, Planning và Cá nhân; kiểm prototype rồi mới quyết định đổi tab Ngân sách thành Kế hoạch. Camera không bị mất vị trí/luồng hiện hữu.

| Screen ID | Màn hình và hành động chính | Trạng thái quan trọng |
| --- | --- | --- |
| SET-01/02/03 | Cài đặt, preview theme, chọn ngôn ngữ | guest/offline, system-follow, đang đồng bộ/lỗi không mất lựa chọn |
| EDU-01/02 | Learning Hub, lộ trình | lần đầu, tiếp tục, tải gói offline, nội dung hết hiệu lực |
| EDU-03/04 | Bài học, quiz và giải thích | chữ lớn, lưu nháp, thử lại, phiên bản bài thay đổi |
| EDU-05 | Needs vs Wants | nhiều phương án hợp lý, tap thay drag, không timer bắt buộc |
| EDU-06/07 | Thử thách tuần, tiến trình/XP | bỏ qua/nghỉ, offline pending, replay không thưởng trùng |
| FIN-01/02 | Dòng tiền 7/30 ngày, sửa giả định/kịch bản mua | thiếu/không đồng bộ dữ liệu, số dư lệch, tách scenario khỏi dự báo |
| AI-01/02 | Consent, insight detail/coach | AI off, chưa đủ dữ liệu, processing, timeout, low quality, quota, report/delete |
| AI-03/04 | Nhập đáp án, kết quả rubric | giữ nháp, chấm lại, phiên bản model/rubric, không có điểm khi lỗi |
| EDU-08 | Weekly Money Story | template fallback, privacy-hidden, không tự chia sẻ |

Mỗi màn có text alternative cho chart, Back về đúng nguồn và deep link sau auth; đổi theme/ngôn ngữ không reset flow. Không dùng animation/XP để ép học, không nhắc bỏ nhu yếu phẩm hay “không chi gì bằng mọi giá”.

## 9. Dữ liệu API và phạm vi source khi triển khai

Đề xuất entity theo cụm, không tạo tất cả bảng của catalogue trong một migration lớn:

- Settings: preferences/version; device settings tách account profile.
- Learning: lesson/content version, quiz question/attempt, owner-scoped learning progress, immutable XP event, badge award, challenge instance/progress. Backend xác minh attempt và chống thưởng trùng; progress guest local không được tin là reward cloud tự động.
- Finance: cashflow schedule/occurrence/settlement link, goal/contribution cơ bản nếu đưa vào release, forecast snapshot và data-quality metadata. Goal là kế hoạch, không phải tài khoản giữ tiền.
- AI: consent/revocation, job/output/report, usage reservation ledger, model/prompt/rubric registry metadata. Không lưu full raw financial prompt mặc định.

API dự kiến, giữ `/v1` và envelope/error conventions đang có:

| Resource | Hợp đồng dự kiến |
| --- | --- |
| Profile/preferences | Mở rộng PATCH hiện có bằng optional field; client cũ vẫn hoạt động |
| Lessons/progress | GET `/v1/lessons`, GET `/v1/lessons/{id}`, POST `/v1/lesson-attempts`, PATCH progress có version |
| Challenges | GET `/v1/challenges`, POST `/v1/challenge-attempts` có idempotency |
| Cashflow | CRUD `/v1/cashflow-schedules`; POST `/v1/forecasts` tạo kết quả, GET theo ID |
| AI | POST `/v1/ai-requests` trả 202 + job ID; GET `/v1/ai-requests/{id}`; feedback/delete owner-only |
| Consent | GET/POST `/v1/ai-consents`; revoke theo purpose/version, không xóa audit cần thiết trái retention policy |

Mọi owner suy từ JWT/RLS, không tin `userId` client. Private response không vào public cache. Page/cursor/limit rõ, 400/422 validation theo conventions, 401/403 auth, 409 stale version/idempotency payload mismatch, 429 quota có reset/retry, 503 provider unavailable. OpenAPI và TS/Dart contract test đi cùng; endpoint mới chỉ là đề xuất, chưa tồn tại.

Module mobile dự kiến: `core/theme`, `core/i18n`, `features/settings`, `features/learning`, `features/challenges`, `features/cashflow`, `features/ai`. Kế thừa cache/queue encrypted có owner; bổ sung resource/mutation kind và backup schema có migration. Bản tính local/guest và Dart phải chung fixtures; tránh hai công thức tài chính khác nhau. Shared package chỉ thêm export, không phá API cho web.

## 10. Lộ trình có dependency và nghiệm thu

Ước lượng thô cho **1 kỹ sư full-time quen repo, có reviewer nội dung tài chính/ngôn ngữ và QA bán thời gian**; các khoảng dưới không phải cam kết giao hàng. Tổng effort khoảng 48–75 ngày công, chưa gồm Goal bổ sung. Cộng khoảng 20–30% dự phòng: khoảng **12–20 tuần làm việc**; pilot cần 2–4 tuần lịch và có thể chồng phần ổn định cuối. Nếu phải chờ dữ liệu, người duyệt hoặc chạy pilot sau toàn bộ phát triển, lịch sẽ dài hơn. Không coi số tuần này là thời hạn đã cam kết.

| Giai đoạn | Ước lượng | Đầu ra và gate |
| --- | --- | --- |
| P0 — chốt thiết kế và kiểm chứng | 3–5 ngày | owner duyệt scope/budget/18+, inventory chuỗi/screen; prototype test 5–8 người; không giả lập kết quả research |
| P1 — Settings nền tảng | 10–15 ngày | light/dark/system + vi/en đầy đủ, migration/cache/backup, native build; regression mọi flow cũ không mất dữ liệu |
| P2 — Learning không AI | 10–15 ngày | 12 bài đã duyệt, quiz, Needs vs Wants, progress offline/cloud, challenge/XP tối thiểu; học được không cần AI |
| P3 — dữ liệu và cashflow | 10–15 ngày | schedule thu/chi, quality adapter, F0/F1, insight template, scenario mua; fixture đúng và backtest báo rõ giới hạn |
| P4 — AI giải thích và story | 5–10 ngày | adapter một provider đạt eval, consent/quota/delete, drill-down, template fallback; không tool ghi tiền |
| P5 — Assessment và pilot | 10–15 ngày | rubric/feedback/regrade, privacy/adversarial eval, QA ARM64, pilot 2–4 tuần lịch có thể chồng phần ổn định cuối |

Mục tiêu tiết kiệm CRUD/contribution đơn giản là **hạng mục bổ sung 5–8 ngày**, có thể làm sau P3; nếu chưa làm, bài dự phòng dùng kế hoạch tự ghi, không đặt CTA dẫn tới màn chưa có. Financial Fitness, debt planner, Full Twin, bank sync, Family và games còn lại không nằm trong ước lượng trên.

Sau P2 có thể phát hành phần học deterministic bằng feature flag; **chưa gọi là hoàn tất MVP Learning trong catalogue** vì còn AI assessment/Story. Bản đủ phạm vi ưu tiên của kế hoạch là sau P5. Mỗi increment có TDD RED/GREEN, lint/types/tests, source/screen evidence, migration rollback và release riêng; không dồn một đợt thay toàn app.

## 11. Kiểm thử hiệu quả và điều kiện bật AI

1. **Regression tài chính:** transfer/split/refund, tháng đã chốt, recurring đã trả, archived transaction, timezone cuối tháng/năm nhuận, nhiều tiền tệ, idempotency, offline owner switch. Không sai số tiền mới được dùng cho AI.
2. **Learning:** schema và nguồn từng bài; đáp án/lời giải được reviewer duyệt; ôn sau 7/30 ngày, attempt/version/retry, XP không cấp trùng qua hai thiết bị. Không đòi chi tiền thật để lấy thành tích.
3. **Forecast:** fixtures số học bắt buộc 100% đúng; rolling backtest và báo chất lượng theo cohort; nếu không hơn baseline thì giữ baseline, nếu thiếu dữ liệu thì F0. Không đặt mục tiêu “90% chính xác” chung chung.
4. **AI eval đề xuất:** ít nhất 150 case vi/en, gồm đủ/thiếu dữ liệu, nhầm currency, OCR/note chứa prompt injection, ngoài consent, khác owner, advice đầu tư/thuế, yêu cầu thay đổi tiền, câu trả lời học có lý lẽ khác đáp án mẫu. Dữ liệu synthetic hoặc opt-in ẩn danh; không dùng tài chính của chủ dự án mặc định.
5. **Gate AI đề xuất:** zero rò owner/vi phạm consent/auto-mutation trong bộ kiểm; mọi số được hiển thị phải đối chiếu facts, output sai bị fallback; ít nhất 90% case nội dung được reviewer chấm đạt rubric nội bộ. Với assessment, định nghĩa trước tolerance và đo đồng thuận hai người chấm; không lấy model tự chấm model làm bằng chứng duy nhất. Zero lỗi trong finite test không phải chứng minh không thể có lỗi.
6. **Resilience/cost:** provider timeout/refusal, response hỏng, job mất kết nối/worker chết, retry sau 429, revoke/delete khi job đang chạy, token cap, quota concurrency, old model ngừng hỗ trợ. Fallback hoạt động và không gọi provider ngoài consent.
7. **Mobile native:** Android emulator + điện thoại ARM64 thật, cold start, background kill/resume, no-network, chữ 200%, TalkBack, dark/light và vi/en. Nâng target từ báo cáo kiểm thử cũ chỉ khi ca mới chạy thật.

Pilot đề xuất 20–30 người trưởng thành trong 2–4 tuần sau kiểm usability; cần tuyển và consent thực, chưa có người tham gia. Đo hiểu đúng trước/sau và bài khác sau 7/30 ngày; hành động tự chọn, hữu ích/không hữu ích, bỏ qua/tắt AI, cảm giác áp lực, cost và sai cảnh báo. Pilot ngắn không tự chứng minh tác động nhân quả hoặc khả năng giữ chân dài hạn; khảo sát D30 cần thời gian theo dõi đủ.

Analytics chỉ metadata/pseudonymous ID, không raw amount, merchant, chat hoặc câu trả lời. Gợi ý event: `lesson_started/completed`, `quiz_submitted`, `review_completed`, `challenge_skipped/completed`, `forecast_viewed`, `assumptions_changed`, `ai_consent_changed`, `ai_request_failed`, `ai_output_reported`, `learning_notification_disabled`. Chỉ đặt target retention/business sau có baseline và sample phù hợp.

Staging API/Supabase/provider test riêng là prerequisite cho mutation/quota/revocation tests. **Chưa xác nhận staging có sẵn**; không bật cấu hình toàn cục hay AI paid trên production để thay cho staging. Release theo cohort opt-in, có kill switch và fallback; rollback không mất lịch sử học/tiền.

## 12. Các quyết định cần chủ dự án duyệt trước khi code

- Giữ Android, người học 18+, vi/en và VND forecast ở đợt đầu; không mở Family/trẻ em vội.
- Chấp thuận scope P1–P5 và người chịu trách nhiệm duyệt 12 bài/rubric; chưa thuê chuyên gia hay trả phí dịch vụ trong lượt lập kế hoạch này.
- Chọn mức chi API pilot, provider/account hợp lệ, retention và region sau thử nghiệm; không gửi key/mật khẩu qua chat.
- Chốt có làm Goal cơ bản cùng đợt hay dùng bài thực hành không phụ thuộc Goal; không xây debt planner/full Twin trước engine.
- Duyệt phương án không đổi navigation lớn ngay; chỉ thay tab khi prototype cho thấy cần.
- Thiết lập staging và tiêu chí go/no-go; giữ các ca thiết bị thật/Play Billing cũ chưa nghiệm thu ở đúng trạng thái, không tuyên bố hoàn tất nhờ kế hoạch mới.

**Trạng thái bàn giao:** tài liệu nghiên cứu và kế hoạch, không sửa runtime mobile/web, không cài package, không tạo schema, không gọi API AI trả phí, không commit/push/deploy trong lượt này.

## 13. Backlog triển khai đầu tiên

Các ticket dưới đây sẵn sàng để tách thành increment sau khi duyệt phạm vi. Thứ tự không có nghĩa đã được phép code hoặc triển khai.

| Ticket | Công việc | Phụ thuộc | Bằng chứng hoàn thành |
| --- | --- | --- | --- |
| MOB-SET-01 | Inventory màn, chuỗi, màu tĩnh và formatter; chốt semantics settings | Scope được duyệt | Danh sách screen/key, default và precedence; có trạng thái guest/cloud |
| MOB-SET-02 | Theme provider và semantic light/dark, native appearance | SET-01 | Component tests, cold start/system switch, status bar đúng, không mất nháp |
| MOB-SET-03 | i18n provider, vi/en dictionaries và formatter mobile | SET-01 | Key/placeholder parity, test số/ngày/plural và đổi locale ngay |
| MOB-SET-04 | Chuyển toàn màn user, notification và auth/lock sang provider | SET-02/03 | Matrix theme × locale × chữ lớn; không sửa web/shared export cũ |
| MOB-SET-05 | Lưu settings, optional API fields và backup migration | SET-01, staging | Offline retry, A–B–guest isolation, client/backup cũ tương thích |
| MOB-EDU-01 | Schema nội dung và 2 bài mẫu có nguồn/rubric | SET-03, người duyệt nội dung | Reviewer ký duyệt, quiz/lời giải đủ, content version rõ |
| MOB-EDU-02 | Hub → bài → quiz → hành động, lưu tiếp tục | EDU-01, SET-04 | Guest offline/cold restart hoàn thành được, Back đúng nguồn |
| MOB-EDU-03 | Hoàn thiện 12 bài, Needs vs Wants và một challenge | EDU-02 | Review chuyên môn/ngôn ngữ; TalkBack và tap alternative |
| MOB-EDU-04 | Progress sync, XP/badge tối thiểu và ôn tập | EDU-02, SET-05 | Idempotency/replay/hai thiết bị không thưởng trùng; merge guest có xác nhận |
| MOB-FIN-01 | Định nghĩa quality/provenance và lịch thu/chi | Rà schema hiện hành | Contract/fixture, scope/currency và settlement link không nhập nhằng |
| MOB-FIN-02 | Engine F0/F1 và scenario mua | FIN-01 | Transfer/refund/split/recurring không đếm hai lần; local/Dart chung fixture |
| MOB-FIN-03 | Dòng tiền 7/30 ngày và insight có drill-down | FIN-02 | Thiếu dữ liệu/fallback đúng, metric backtest có provenance |
| MOB-AI-01 | Eval dataset, consent/retention/cost ADR và provider benchmark | Chấp thuận account/budget, staging | Báo cáo so sánh thật, không chỉ demo; lựa chọn go/no-go |
| MOB-AI-02 | Job adapter, quota ledger, revoke/delete và validator | AI-01, FIN-02 | Race/retry/crash/timeout tests; không lộ owner hay ghi dữ liệu tiền |
| MOB-AI-03 | Insight explanation và Weekly Money Story | AI-02, FIN-03, EDU-03 | Mọi fact được xác minh; template fallback khi AI off/lỗi |
| MOB-AI-04 | Assessment/rubric/regrade/report | AI-02, EDU-03 | Hai người chấm đối chiếu, nháp không mất, quota không thu trùng |
| MOB-REL-01 | ARM64 regression, opt-in pilot và rollback | Các gate liên quan đạt | Báo cáo thực nghiệm, guardrails, kill switch và quyết định phát hành |

Đợt code đầu tiên nên dừng ở **MOB-SET-01 → SET-03** để kiểm kiến trúc trước khi chuyển toàn bộ màn. Không gộp thay theme, dịch app, thêm schema học và tích hợp AI vào một commit hoặc một bản phát hành không thể rollback riêng.
