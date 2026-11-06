# Picket mobile — đặc tả học tài chính và khác biệt sản phẩm

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ngày: 22/10/2026. **Đề xuất triển khai, chưa có trong app.** Phạm vi Expo Android, kế thừa Dart/Supabase khi cần; không sửa web. Cơ sở đối thủ/nguồn và giới hạn nghiên cứu nằm tại [market research](MOBILE_MARKET_RESEARCH_20261022.md). Theme/ngôn ngữ tiếp tục theo [kế hoạch tổng](MOBILE_SETTINGS_LEARNING_AI_PLAN_20261022.md); không bỏ qua nền móng đó để làm chatbot trước.

## 1. Công việc người dùng và phạm vi khác biệt

Giả thuyết nhóm đầu: người Việt 18–28 tuổi mới tự quản tiền, có tiền mặt/thu nhập không hoàn toàn đều. Chưa xác nhận persona; không loại người lớn khác khỏi app. Công việc cần giải quyết: **“Tôi muốn biết khoản quyết định này ảnh hưởng gì, hiểu cách tự đánh giá lần tới, mà không phải học cả khóa dài hoặc đưa mọi dữ liệu cho AI.”**

Không đặt mục tiêu “dạy mọi kiến thức tài chính”. Đợt đầu tập trung hiểu dòng tiền, nghĩa vụ, ngân sách, phí và an toàn. Không khuyến nghị chứng khoán/crypto, sản phẩm vay, lãi đầu tư hay quyết định thay người dùng.

| Lớp sản phẩm | Phải có để cạnh tranh | Điểm riêng cần kiểm chứng |
| --- | --- | --- |
| Quản lý tiền | Ghi/sửa nhanh, OCR kiểm tra được, ví/ngân sách, offline đúng owner | Học dựa vào dữ kiện đã kiểm tra, không biến lỗi OCR thành lời khuyên |
| Giáo dục | Bài ngắn, quiz giải thích, tiến độ | Học đúng thời điểm và bài kiểm tra chuyển giao sang tình huống mới |
| AI/dự báo | Hỏi dễ hiểu, giải thích, scenario | Mọi con số có nguồn, tự sửa giả định, AI tắt vẫn dùng được |

Tên làm việc của vòng lặp: **Picket Money Lab — Học từ tiền của mình**. Cần kiểm tra tên/nhãn hiệu trước khi phát hành; không chốt branding từ tài liệu này.

## 2. Ba lát cắt sản phẩm end-to-end

### L1 — Từ khoản chi đến một điều hiểu được

1. Người dùng lưu giao dịch/hóa đơn theo luồng hiện tại. Không thay điều kiện thành công hoặc bắt học để thoát.
2. Màn hoàn tất thêm một thẻ nhẹ: “Khoản này thuộc kế hoạch nào? Tìm hiểu trong 60 giây”. Có “Để sau”, “Không gợi ý ở đây nữa”. Không mở popup tự động.
3. Chọn ví dụ: **dữ liệu minh họa mặc định** hoặc “Dùng khoản vừa lưu”. Chọn thứ hai chỉ xử lý local trong bản không AI; không mặc nhiên đồng ý gửi cloud/provider.
4. Một khái niệm, một câu hỏi và lời giải cho từng lựa chọn. Nếu thiếu dữ kiện, nói “Chưa đủ để kết luận”; không gắn nhãn nhu cầu/mong muốn từ merchant.
5. Hành động tự chọn: rà danh mục, xem ngân sách hoặc ghi nhận “Tôi chỉ muốn học”. Quay lại đúng receipt/transaction và tháng ban đầu.

**Kích hoạt đề xuất:** giao dịch expense đã được xác nhận, nội dung học phù hợp, chưa tắt, không có gợi ý khác cùng phiên. Receipt `processing/failed/review_required` không đủ điều kiện. `confidence` OCR cao không thay thế xác nhận người dùng. Tối đa một gợi ý chủ động/ngày và ba/tuần là giá trị khởi đầu để thử; không giới hạn người tự mở Hub.

**Nghiệm thu L1:** lưu hoàn tất khi offline; bỏ qua không thêm bước bắt buộc; nút Back đúng nguồn; đổi owner không lộ ví dụ; receipt bị xóa/đổi làm thẻ mất hiệu lực an toàn; không gửi rawText/ảnh ra AI. Người không có hóa đơn vẫn học bằng giao dịch hoặc ví dụ.

### L2 — Thử trước một quyết định

Đi từ Planning/Insights hoặc cuối bài liên quan → chọn phạm vi ví/tiền tệ → nhập giá/ngày mua → kiểm tra lịch thu/chi → so “không mua” và “mua”. Không tạo giao dịch thật khi kéo giá, không tự chỉnh ngân sách.

Màn kết quả hiển thị theo thứ tự: ngày dữ liệu → số dư thấp nhất trong kỳ → nghĩa vụ tới hạn → chênh lệch do lựa chọn → giả định/thiếu dữ liệu → “Tôi sẽ kiểm tra gì trước khi quyết định?”. Không dùng nhãn “Bạn đủ tiền, hãy mua”. Khi giá trị âm, dùng giải thích trung tính, không đe dọa hay chấm điểm đạo đức.

Nếu chưa có lịch lương, cho nhập giả định rõ nhãn “chưa xác nhận”; kết quả thành kịch bản, không forecast thực nghiệm. Nếu đã tắt AI/không mạng, bảng và bài học vẫn chạy. AI chỉ giải thích kết quả đã tính khi người dùng yêu cầu.

**Nghiệm thu L2:** test hai phía transfer, tiền tệ khác nhau, recurring đã trả, chi một lần, sửa dữ liệu sau tạo snapshot; lưu scenario phải tách khỏi ledger; xác nhận mới khi muốn chuyển scenario thành một thao tác thật.

### L3 — Nhớ và áp dụng, không chỉ tích điểm

Hub → “Tôi đang học gì?” → bốn trạng thái: Đã xem / Đã luyện / Đã thử áp dụng / Đã ôn lại. Không dùng “thành thạo” chỉ vì một đáp án đúng. Người dùng có thể tắt XP và nhắc học.

Sau khoảng 7 ngày, đề xuất một tình huống khác kiểm tra cùng năng lực; khoảng 30 ngày là thử nghiệm tiếp theo, không lời hứa về trí nhớ. Thời gian ôn là cấu hình, cần pilot để chỉnh. Hoàn thành hành động phân biệt **app quan sát được** và **người dùng tự xác nhận**. Mở màn subscription không chứng minh đã hủy gói ngoài đời.

Money Story mỗi tuần: một điều nhận thấy từ dữ liệu đủ chất lượng, một điều đã luyện, một bước tiếp theo. Có bản template local; không biến chi ít hơn thành thành tích mặc định khi thu nhập/nhu cầu thay đổi.

## 3. Danh sách màn và trạng thái cần thiết kế

| Màn/entry | Nội dung chính | Trạng thái ngoài happy path |
| --- | --- | --- |
| Home learning card | Một gợi ý, lý do, thời gian, bỏ qua | No data, tắt gợi ý, offline; không đẩy cảnh báo tiền quan trọng xuống |
| Learning Hub `/learn` | Lộ trình theo mục tiêu, tiếp tục, ôn, thư viện | Chưa chọn mục tiêu, học guest, không tiến độ, content retired |
| Lesson `/learn/[lessonId]` | 2–4 block, ví dụ, nguồn, tiếp tục | Nội dung cũ, locale chưa có, mất nháp, chữ lớn |
| Practice | 2–3 câu tình huống, giải thích và thử lại | Nhiều phương án có lý; không phạt sai; AI assessment là lựa chọn riêng |
| Action review | Chọn thao tác/không làm; xác nhận loại bằng chứng | Record đã xóa, không quyền, thiếu ví/ngân sách |
| Progress | Theo năng lực và phiên bản bài; lịch ôn | Merge guest, xung đột hai thiết bị, reset lịch sử |
| Decision Lab | Giá/ngày, phạm vi, hai scenario, sửa giả định | Thiếu thu nhập, đa tiền tệ, pending local, forecast unavailable |
| Coach sheet | Facts, giải thích, giới hạn, report, nguồn | Consent off, hết quota, timeout, bị từ chối, dữ liệu stale |
| Settings | Theme/system, vi/en/device, learning reminders, AI/data | Cold start, font 200%, đổi owner, thu hồi consent trong lúc job chạy |

Route là đề xuất; kiểm tra Expo Router/deep links trước khi thêm. Không đổi tab chính ngay. Prototype trước với entry Home + Profile; nếu Hub khó tìm mới thử thay navigation. Profile vẫn có entry trực tiếp dù tắt gợi ý.

## 4. Hai bài mẫu đủ để prototype

### Bài A — Chuyển ví không phải chi thêm

- Năng lực `cashflow.internal-transfer`; mục tiêu: không đếm hai lần khi chuyển tiền giữa ví của mình.
- Ví dụ giả lập: Tiền mặt 600.000đ, ngân hàng 1.400.000đ. Chuyển 200.000đ từ ngân hàng sang tiền mặt, không phí. Sau chuyển: 800.000đ và 1.200.000đ, tổng vẫn 2.000.000đ.
- Câu 1: “Chi tiêu của bạn tăng bao nhiêu?” A: 200.000đ; B: 0đ; C: 400.000đ. Đúng B; A nhầm chuyển vị trí tiền với khoản mua, C đếm cả hai phía. Nếu có phí, chỉ phí mới là khoản chi trong tình huống này.
- Câu chuyển giao: chỉ xem ví ngân hàng, 200.000đ ra khỏi ví có phải tiền ra của **phạm vi đó** không? Có; nhưng không phải chi tiêu của tổng hai ví. Giải thích phạm vi thay vì chỉ học thuộc “transfer luôn bằng 0”.
- Thực hành: xem một transfer có sẵn hoặc làm ví dụ; không yêu cầu chuyển tiền thật để nhận XP.
- Ôn: tình huống hoàn tiền khác chuyển ví; tránh dùng lại đúng số và đáp án ban đầu.

### Bài B — Số dư hôm nay chưa phải phần dành cho khoản mua

Ví dụ giả lập, không phải khuyến nghị tài chính cá nhân: tại đầu ngày 23/10 có 2.400.000đ; tiền nhà 1.200.000đ ngày 25; khoản thu được xác nhận 1.500.000đ ngày 28; chi sinh hoạt giả định 100.000đ/ngày, từ 23–29/10 gồm 7 ngày; định mua tai nghe 800.000đ ngày 24.

| Cuối ngày | Không mua | Có mua | Điều đã tính |
| --- | ---: | ---: | --- |
| 23/10 | 2.300.000 | 2.300.000 | Một ngày sinh hoạt |
| 24/10 | 2.200.000 | 1.400.000 | Tai nghe chỉ ở scenario mua |
| 25/10 | 900.000 | 100.000 | Tiền nhà + sinh hoạt |
| 26/10 | 800.000 | 0 | Sinh hoạt |
| 27/10 | 700.000 | -100.000 | Điểm thấp trước khoản thu |
| 28/10 | 2.100.000 | 1.300.000 | Khoản thu + sinh hoạt |
| 29/10 | 2.000.000 | 1.200.000 | Sinh hoạt |

- Câu hỏi: “Cuối kỳ vẫn dương thì có bảo đảm đủ tiền mọi ngày không?” Không: scenario mua có ngày âm trước khi tiền về.
- Câu hỏi mở: “Nếu khoản thu chậm hai ngày hoặc chi sinh hoạt thiếu, bạn cần xem lại điều gì?” Rubric xét nhận ra thời điểm, nghĩa vụ và giả định; không chấm theo việc có mua hay không.
- Thực hành: đổi ngày mua sang sau ngày 28 và so lại; người dùng tự quyết. Chưa có dữ liệu thật vẫn học được.
- UI ghi rõ: lịch thu có thể thay đổi, số giả lập, không gồm mọi khoản chi; bảng theo ngày không bảo đảm tiền sẵn có trong ngày nếu chưa biết giờ thanh toán.

## 5. Bản đồ 12 bài và tiêu chí đánh giá

| ID / năng lực | Tình huống Việt hóa | Đo hiểu bằng gì | Hành động không bắt buộc |
| --- | --- | --- | --- |
| EDU01 Ledger | Ghi thiếu tiền mặt, sai ngày | Tìm dữ kiện thiếu trước kết luận | Rà một giao dịch |
| EDU02 Transfer | Tiền mặt ↔ ngân hàng | Phân biệt chi tiêu và dòng ra của ví | Xem transfer hoặc mô phỏng |
| EDU03 Priorities | Đi lại/ăn uống theo hoàn cảnh | Nêu lý do thay vì nhãn tuyệt đối | Đặt ưu tiên riêng |
| EDU04 Budget | Lương theo kỳ/thu thất thường | Chọn kỳ và nghĩa vụ phù hợp | Thử hạn mức |
| EDU05 Reserve | Xe hỏng khác mua đồ dự tính | Phân biệt dự phòng và mục tiêu | Viết kế hoạch, chưa cần Goal feature |
| EDU06 Small steps | Chia mục tiêu theo thời gian | Tính bước đóng góp với dữ liệu đủ | Ghi bước tiếp theo |
| EDU07 Timing | Đủ cuối kỳ nhưng thiếu giữa kỳ | Xác định ngày thấp nhất | Mở Decision Lab |
| EDU08 Assumptions | Khoản thu chậm, chi thiếu | Sửa giả định và diễn giải lại | So hai scenario |
| EDU09 Fees | Gốc/lãi/phí, không chỉ tiền mỗi tháng | Nhận diện tổng chi phí/dữ kiện còn thiếu | Calculator giả lập |
| EDU10 Repayment | Nhiều ngày đến hạn | Lập timeline không phán tín dụng | Checklist riêng |
| EDU11 Scam | OTP, link giả, giả danh hỗ trợ | Chọn hành vi an toàn và lý do | Checklist, không thu OTP |
| EDU12 Renewals | Trial/subscription và khoản mua | Nhận ra gia hạn, thời gian cân nhắc | Rà lịch đã ghi |

Nội dung nợ/lừa đảo và các con số lãi/phí cần người duyệt chuyên môn, ngày review và nguồn phù hợp Việt Nam trước xuất bản. Không dùng rate/luật từ AI hoặc tài liệu Mỹ như quy định Việt Nam. Chưa tìm đủ nguồn Việt chính thức cho từng bài thì giữ draft, không “lấp” bằng nội dung sinh tự động.

## 6. Content engine, tiến độ và đồng bộ

Content package đề xuất: `lessonId`, `contentVersion`, `locale`, `competencyIds`, `prerequisites`, `objectives`, `blocks`, `questions`, `answerExplanations`, `actionOptions`, `sources`, `reviewedBy`, `reviewedAt`, `nextReviewAt`, `status`. Những trường reviewer phải có người thật duyệt; không tự điền tên chứng nhận. Validate schema, placeholder vi/en, reference và prerequisite cycle trong CI.

Progress event: `eventId`, owner, lesson/version, question/version, loại event, attempt, thời gian local/server và evidenceType. Lưu câu trả lời tự luận chỉ khi có nhu cầu/đồng ý rõ; analytics không nhận raw answer, amount hoặc merchant. Nội dung sửa đáp án phải version mới; không chấm lại âm thầm lịch sử theo rubric khác.

Quy tắc đầu tiên có thể kiểm thử, **chưa phải mô hình mastery đã được kiểm định**:

- Viewed khi xem đủ block cần thiết; Practiced khi đã nộp và đọc phản hồi, không cần đúng 100%.
- Evidence of understanding khi làm đúng ít nhất hai tình huống khác nhau của cùng năng lực, không tính click lặp một câu. Vẫn không tuyên bố thành thạo toàn chủ đề.
- Applied phân biệt thao tác app quan sát được/self-report; cho phép không làm. Không suy ra tiết kiệm được bao nhiêu do bài học.
- Reviewed lưu kết quả câu chuyển giao sau khoảng cách thời gian; sai thì gợi ý học lại, không xóa thành tích hay làm mất tiền/XP đã có.
- XP lần đầu theo `owner + eventType + contentVersion + milestone`, server ràng buộc unique; không thưởng theo amount hoặc thêm/xóa ledger. Chốt giới hạn reward version để update content không thành cách farm điểm.

Guest có progress local trong cơ chế mã hóa/owner-isolation hiện hữu. Khi đăng nhập, hỏi có nhập tiến độ guest không; merge theo eventId và milestone, không cộng XP hai lần. Hai thiết bị gửi lệch giờ: server sequence cho thứ tự sync, không dùng clock local để mở thưởng vô hạn. Xóa/reset lịch sử phải có semantics riêng; xóa financial record không giữ bản sao amount để phục vụ learning.

Bundle bài đã duyệt để học offline. Remote content nếu làm phải version/schema/hash, tải vào vùng tạm, validate rồi chuyển atomic; lỗi giữ bản bundle. Không tải JavaScript thực thi từ nội dung. Backup cũ thiếu progress vẫn restore được; restore không bật lại AI consent.

## 7. Tích hợp đúng source hiện tại

| Vùng hiện có | Thay đổi đề xuất | Điều phải giữ |
| --- | --- | --- |
| `apps/mobile/src/app/receipt-saved.tsx` | Thẻ học tùy chọn sau thành công | Guard, transactionId, nút về home/xem receipt |
| `apps/mobile/src/core/ui/receipt-flow-policy.ts` | Carry context về nguồn nếu cần | `finishReceiptFlow`, tháng và back stack; không push thêm màn bắt buộc |
| `apps/mobile/src/core/navigation/routes.ts` | Route helpers learn/scenario | Deep links cũ và guest/cloud route semantics |
| `apps/mobile/src/core/ocr/capture-storage.ts` | Chỉ đọc reference đủ quyền, không nhân bản ảnh cho learning | Lease, owner path, encryption, free-space guard và cleanup |
| `apps/mobile/src/core/sync/mutation-queue.ts` | Event queue học riêng hoặc kind có semantics/idempotency rõ | Không trộn request AI vào replay offline tự động |
| `packages/domain-ts/src/finance.ts` | Adapter provenance dữ kiện | Receipt lineItems/rawText chưa là sự thật được duyệt |
| Dart contracts/gateway + Supabase migrations | Progress/content metadata/AI jobs khi cloud cần | RLS theo owner, compatibility client cũ; không mở quyền admin cho mobile |

Các module mới như `core/learning`, `core/forecast`, `core/ai` là đề xuất, chưa tồn tại theo kết luận rà soát. Không đưa semantic token mobile vào shared export làm web đổi ngoài phạm vi.

## 8. UX, quyền riêng tư và accessibility

- Màu sáng/tối theo semantic tokens; đáp án đúng/sai có icon và chữ, không chỉ xanh/đỏ. Tap target Android 48dp, TalkBack có thứ tự, font 200% không cắt đáp án.
- Không dùng swipe/drag như cách duy nhất. Quiz không đếm ngược mặc định. Giảm chuyển động theo hệ thống; streak có nghỉ, không cảnh báo gây xấu hổ.
- Tên giao dịch, merchant, câu tự luận do user nhập không tự dịch. Đổi vi/en giữ lesson position và draft; nếu bản dịch chưa được duyệt, báo rõ ngôn ngữ còn sẵn có thay vì trộn âm thầm.
- Tách consent gợi ý dựa trên dữ liệu local, AI cloud và notification. AI off không làm mất quyền học/công cụ tính.
- Thông báo màn khóa dùng nội dung chung, không kèm số dư, khoản nợ hoặc merchant.
- Không infer nghèo/giàu, giới, bệnh, tôn giáo hay “thiếu kỷ luật” từ giao dịch. Chỉ gợi ý chủ đề khi có bằng chứng đủ và giải thích được.

## 9. Thứ tự giao và gate

1. **SET foundation:** theme/i18n/settings, không thay layout web; gate cold start, chữ lớn, owner switch và dịch đủ.
2. **Vertical slice A:** EDU01/02, Hub, L1, progress guest; dùng content bundle, không AI. Gate lưu hóa đơn không chậm/bị chặn, nội dung duyệt.
3. **Vertical slice B:** lịch thu/chi, F0, bài EDU07/08 và L2; gate bảng ví dụ tính đúng từng ngày, nghĩa vụ không đếm trùng.
4. **Vertical slice C:** sync/ôn, hoàn thiện 12 bài, AI giải thích opt-in; gate eval/consent/quota theo [AI spec](MOBILE_AI_FORECAST_INTEGRATION_SPEC_20261022.md).
5. **Pilot:** đo hiểu chuyển giao và annoyance; chỉ mở rộng thêm gamification/AI assessment khi không làm xấu ghi chép và độ tin cậy.

AI assessment, không gian cộng đồng, mô phỏng đầu tư và full Financial Twin không nằm trên critical path cho lát cắt A/B. Ước lượng master plan vẫn sơ bộ; phải re-estimate sau prototype/source inventory, không cộng mọi ứng dụng tham khảo thành scope.

## 10. Đo xem điểm riêng có thực sự đáng làm

Primary learning outcome: số người giải thích đúng **tình huống mới** tại D7 trên số đã tham gia đánh giá, báo riêng missing follow-up. Secondary: hành động tự chọn có ý nghĩa, hiểu giả định forecast, mức hữu ích; XP/opens không là kết quả học.

Thử prototype L1 so với Hub bài độc lập; A/B nhỏ chỉ thăm dò, chưa suy ra thống kê chắc chắn. Mốc nội bộ đề xuất: ≥80% hoàn thành task chính không được hướng dẫn; 0 trường hợp lỗi thiết kế khiến họ nghĩ “scenario là bảo đảm”; nếu nhiều hơn 20% người thử thấy gợi ý gây phiền, giảm tần suất/đổi entry trước khi thêm bài. Báo denominator và quan sát cụ thể, không ẩn n nhỏ sau phần trăm.

**Stop/pivot:** nếu người dùng chỉ muốn ghi nhanh, chuyển học thành khu chủ động thay vì ép post-save; nếu không cải thiện hiểu so với bản không AI, bỏ AI ở luồng đó; nếu data quá thiếu, bán giá trị học/scenario thủ công thay vì quảng cáo dự báo chính xác.
