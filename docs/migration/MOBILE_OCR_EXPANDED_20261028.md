# Mobile OCR mở rộng: nhận dòng hàng, tổng phải trả và hiệu năng

Ngày thực hiện: 28–29/10/2026. Phạm vi chỉ mobile. Mọi sửa đổi của đợt này giữ local theo xác nhận của chủ dự án: không tạo commit, không push, không cập nhật landing.

Các bảng chính bên dưới ghi checkpoint 28/10; phần bổ sung 29/10 ở cuối báo cáo ghi kết quả mới hơn. Không coi số liệu checkpoint cũ là accuracy hiện tại.

## Những thay đổi đã kiểm chứng

- Phân biệt tổng phải trả với tổng hàng, số lượng, thuế, phí, tiền khách đưa và tiền thừa. Tổng cuối có nhãn rõ được ưu tiên; hai tổng phải trả mâu thuẫn vẫn yêu cầu kiểm tra. Nếu tổng cuối không đọc được, không thay bằng tổng hàng.
- Ghép tên hàng và thành tiền theo tọa độ khi POS không có header cột. Chỉ ghép khi có một ứng viên phù hợp, nằm trước vùng tổng kết; địa chỉ, điện thoại và các nhãn metadata bị loại. Dòng có nhiều giá cạnh tranh được giữ để kiểm tra thay vì đoán cột.
- Hỗ trợ POS in tên ở trên và `số lượng X đơn giá` ở dưới nếu vị trí và phép nhân khớp thành tiền. Giá trị suy ra từ số lượng hoặc thành tiền vẫn bị hạ confidence; không gọi q=1 là số lượng đã quan sát.
- Chặn nhãn `SUBTTL`, `ITEMS 1.00` thành sản phẩm; không lấy một dòng món ăn kèm giá làm merchant. Tên cửa hàng có số nhỏ như `PICKET MART QUAN 7` vẫn được giữ.
- Không đọc phần `12` trong token hỏng `12O000` thành tổng tiền. Chữ lẫn số như `TOTAL SAE3` không sinh tổng bằng 3. Kết quả tổng ghép theo tọa độ được giữ trong raw text để đọc lại draft không phụ thuộc geometry đã mất.
- Cache kết quả đọc toàn nguồn trong từng native session. Ảnh nhỏ mà direction đã đọc toàn nguồn không chạy inference đó lần thứ hai; xoay ảnh và đóng session hủy cache. Không cache ảnh trên đĩa hoặc dùng kết quả từ hóa đơn khác.
- Sửa lỗi kiểm tra thực trên Redmi: hóa đơn không đọc được merchant trước đây bị loại dù có ba sản phẩm và tổng tiền. Cho mở luồng kiểm tra nếu ít nhất hai dòng OCR dương, phép nhân và tổng dòng khớp tổng phải trả. Merchant vẫn trống và cần nhập; ảnh chỉ có số tiền, một dòng hàng hoặc tổng không khớp vẫn không được cấp bằng chứng bởi dữ liệu người dùng gõ.

Các module chính: `receipt-total-role.ts`, `receipt-unheaded-rows.ts`, `receipt-parser.ts`, `receipt-scan-session.ts`, `ReceiptImageSession.java`, `ReceiptReadCache.java`. Không đổi API, DB, web, quota hay tự lưu giao dịch.

## Nghiên cứu và corpus

[Hướng dẫn ML Kit của Google](https://developers.google.com/ml-kit/vision/text-recognition/v2/android) mô tả lines, words, bounds, confidence và sự phụ thuộc vào độ nét/kích thước ký tự. Dùng các đầu ra này để giải nghĩa bố cục; không coi OCR chữ là bộ phân tích hóa đơn hoàn chỉnh.

Tải 18 ảnh gốc và nhãn tác giả từ [NAVER CLOVA CORD-v2](https://huggingface.co/datasets/naver-clova-ix/cord-v2), split `test`, index 000–017, giấy phép CC-BY-4.0. Giữ manifest nguồn, SHA-256 và annotation trong artifacts. Đây là hóa đơn Indonesia; điểm trên đó không chứng minh độ chính xác tiếng Việt hoặc hỗ trợ tiền tệ quốc tế.

- 000–005 dùng phát triển ban đầu. 006–011 từng được đánh giá rồi dùng kiểm tra tiếp lỗi POS xếp dòng; do đó **không còn là holdout cuối**.
- 012–017 là sáu ảnh đánh giá cuối, được tải sau khi chốt logic. Không sửa quy tắc theo kết quả của nhóm này.
- Kết hợp với 36 ảnh Bill thành 54 ảnh, đọc bằng ML Kit thật trên Redmi 7, Android 9, ARM64. Không đưa ảnh vào release assets hoặc Git.
- Baseline so sánh là parser tại HEAD `482ec09f`, chạy trên cùng output native và cùng cách sắp tọa độ; đây là baseline của đợt mở rộng, không phải parser cũ trước toàn bộ công việc OCR.
- Chấm tổng bằng exact match; ghép danh tính dòng bằng khoảng cách tên chuẩn hóa ≤0,35, sau đó chấm chính tả và từng trường số độc lập. Không có nhãn merchant trong `gt_parse` CORD nên không công bố merchant accuracy cho CORD. Chỉ 17/18 ảnh có nhãn tổng.

## Kết quả chất lượng

| Chỉ số CORD | Baseline | Bản mới |
| --- | ---: | ---: |
| Tổng tiền đúng / 17 tổng có nhãn | 9 | 10 |
| Tổng sai / thiếu | 3 / 5 | 2 / 5 |
| Dòng hàng khớp / 43 dòng có nhãn | 1 | 24 |
| Dòng trả về | 1 | 26 |
| Tên hàng đúng nguyên văn | 0 | 11 |
| Quantity đúng / 35 dòng có nhãn quantity | 1 | 16 |
| Unit price đúng / 5 dòng có nhãn unit price | 0 | 3 |
| Line total đúng / 43 dòng | 1 | 24 |

Riêng holdout cuối 6 ảnh: baseline không trả dòng hàng; bản mới trả 13, khớp 12/21 dòng, tên exact 3, quantity exact 11/21 và line total exact 12/21. Tổng tiền vẫn 2 đúng, 2 sai, 2 thiếu ở cả hai bản. Các tổng sai của bản mới đều đi vào luồng cần kiểm tra; không gọi đây là nghiệm thu đọc đúng mọi hóa đơn.

Bill VND: **15 đúng, 1 sai có cảnh báo, 6 thiếu / 22 tổng đủ nhãn**, chưa tăng thêm so với đợt trước. Subset 3 ảnh/7 hàng được kiểm thủ công: 6 hàng khớp, 5 tên exact, 6 quantity/unit/line total đúng, merchant exact 2/3; 15 metadata hard-negative cũ vẫn có 0 false positive. Subset này đã dùng phát triển, không phải tập độc lập.

## Hiệu năng và phương án bị loại

- Native trên 54 ảnh: direction + inspect đầu tiên **p50 490 ms / p95 740 ms**; 42 lần inspect dùng lại kết quả full-source. 54 lần inspect lặp trả cache; 54 lần xoay 180° đều buộc đọc lại. Instrumentation PASS, 69,35 giây; không có lỗi đọc ảnh trong corpus.
- Riêng 36 Bill: **p50 489 ms / p95 700 ms**, so với 864/1.180 ms ở lượt trước cùng corpus. Đây là hai lượt đo, không phải thí nghiệm thống kê nhiều lần hoặc thời gian toàn UI. 35/36 Bill là ảnh đủ nhỏ để dùng lại lượt direction; ảnh chụp lớn không mặc nhiên được tăng tốc tương tự.
- Parser trên Windows: p50 khoảng 0,86 ms / p95 1,71 ms. Không dùng số này làm tốc độ JS trên Redmi.
- Đã thử phóng 2× ảnh nguồn nhỏ trên Redmi, 40 ảnh, test-only. Với Bill, tổng đúng giảm 15→13, tổng sai tăng 1→5. **Không bật upscale trong production**. Test thí nghiệm chỉ thuộc `androidTest`; không thay pipeline native chính.
- Giữ budget 20 giây, giới hạn ảnh decode, cancel/close và crop có điều kiện của pipeline hiện có. Cache không thay thế cơ chế timeout hoặc kiểm tra hướng.

## RED/GREEN và kiểm tra hồi quy

User journey: chọn/chụp hóa đơn → nhận đề xuất merchant/items/total → sửa khi thiếu hoặc không chắc → xác nhận trước khi lưu; quét lại/hủy không dùng dữ liệu của ảnh trước.

| Bảo đảm | Test / bằng chứng | Kết quả |
| --- | --- | --- |
| Tổng phải trả, subtotal, tiền khách đưa, số điện thoại, token số hỏng | `receipt-payable-role.test.ts`; `payable-red.log`, `public-dev-red.log`, `partial-money-red.log` → GREEN | PASS |
| POS không header, cân lẻ, nhiều giá cạnh tranh, dòng nhân giá xếp dưới | `receipt-unheaded-rows.test.ts`; `unheaded-red.log`, `stacked-red.log` → GREEN | PASS |
| Cache không sửa kết quả gốc, đọc lại 0 ms, invalidate | `ReceiptReadCacheTest.java`; `cache-red.log` → `cache-green.log` | PASS |
| Inspect bridge và cache hit được đếm riêng; close/cancel/timeout/hướng còn hoạt động | `receipt-scan-session.test.ts` | PASS |
| Không biến món có giá thành merchant | `server-result.test.ts`, corpus merchant có số quận | PASS |
| Merchant thiếu không làm mất các dòng OCR đủ bằng chứng; một dòng/tổng lệch vẫn bị chặn | `receipt-eligibility.test.ts`; `merchant-review-red.log` → `merchant-review-green.log` | PASS |
| Toàn bộ mobile | `npm run test:mobile` | 965/965 PASS |
| OCR và coverage tập trung | `node --import tsx --test --experimental-test-coverage --test-coverage-include='src/core/ocr/receipt-*.ts' --test-coverage-exclude='**/*.test.ts' 'src/core/ocr/*.test.ts'` trong `apps/mobile` | 171 PASS; 99,08% lines / 94,88% branches |
| Lint / TypeScript | `npm run lint`, `npm run typecheck` trong `apps/mobile` | PASS |
| Java unit | `:picket-receipt-ocr:testReleaseUnitTest` | 4 PASS |
| QA APK / Play AAB | Gradle release, ARM64 QA và ARM64+x86_64 AAB | PASS |

Log RED chứng minh lỗi trước sửa; không tạo checkpoint commit trong đợt này vì người dùng yêu cầu giữ local. Coverage chỉ bao gồm các module receipt đã chọn, không phải toàn bộ ứng dụng.

## Phát hành và kiểm tra giao diện thật

Bản ứng viên **1.0.12/code 26** đã build và xác minh, **chưa upload Google Play**. API đọc lại xác nhận Play Internal vẫn 1.0.11/code 24; landing tiếp tục 1.0.11/code 24 theo yêu cầu. Người dùng yêu cầu chỉ cập nhật Play sau khi OCR hoàn thiện; cổng đọc đúng mọi hóa đơn chưa đạt nên giữ AAB local. Ngày 29/10, chủ dự án đã xác nhận: **giữ local, chưa cập nhật Google Play**.

AAB ký đúng upload certificate, manifest `com.picket.mobile`, hai ABI ARM64/x86_64, không có quyền cài APK hoặc overlay. SHA-256: `67816ea34cc7147ed181e524326930ce42a82d03994ca705725d4b0eeced7d7a`. Đã đối chiếu source freeze và xác nhận không có ảnh corpus hoặc lớp instrumentation trong AAB. Công cụ dump manifest dùng Google bundletool có sẵn trong Gradle cache.

QA trên Redmi: `com.picket.mobile.bugqa`, **1.0.12-ocr-qa/code 26**. APK kéo lại từ máy khớp file build, SHA-256 `917b0000a93e1bf98f9113b5008dcba5bdd01df85cad3f97a9193d5a6bd67206`. App Play thật không bị ghi đè.

| Kiểm tra UI bản cuối | Kết quả thực tế |
| --- | --- |
| CORD 001 thiếu merchant | Ba hàng và tổng 91.000 được giữ, merchant trống để nhập; nhập tên rồi chuyển sang form giao dịch có đủ ba hàng và số tiền; chưa bấm Lưu |
| Cà phê, 3 lượt | 54.000, bốn hàng, đúng merchant/ngày; 659 / 510 / 500 ms, cache hit, không crop |
| POS, 3 lượt | 935.000, một hàng quantity 2 / unit 450.000 / line total 900.000; 577 / 540 / 557 ms, cache hit, không crop; vẫn cảnh báo giá trị suy ra |
| VAT, 3 lượt | 13.200.000, merchant/ngày đúng trên UI, một hàng TV; 870 / 877 / 872 ms, một detail crop; hàng tặng còn thiếu |
| Chọn ảnh khác | Merchant/amount/items của ảnh trước được thay đúng; tên nhập tay từ CORD không chảy sang cà phê/POS/VAT |
| Hủy picker | Giữ nguyên draft VAT, không bắt đầu OCR mới |
| Dữ liệu QA | Dashboard trước/sau vẫn 60.000, chưa có khoản chi trong tuần; không tự tạo giao dịch |

Các ms ở bảng là `PICKET_OCR_PERF.durationMs` quan sát trực tiếp trong app, không gồm thời gian người dùng chọn ảnh. `ui-run-observations.json` ghi mười lượt; `ui-final-perf.json` chỉ giữ phần logcat còn trong buffer, không thay thế bằng chứng từng lượt. Ba lần trên một ảnh không đủ để kết luận p95 UI cho mọi hóa đơn. PSS snapshot cuối khoảng 181.288 KiB; chưa phải phép đo peak hoặc leak dài hạn.

Đã gỡ app instrumentation và các APK corpus khỏi điện thoại sau khi lưu bằng chứng. Quyền cài ứng dụng không xác định của File Manager được tắt lại (`REQUEST_INSTALL_PACKAGES: deny`); giữ Picket QA để kiểm tra tiếp. Không coi build thành công hoặc các kiểm tra UI này là bằng chứng nhận diện chính xác mọi ảnh.

[Gallery tám ảnh kiểm tra trước/sau trên Redmi](../../.artifacts/mobile-bugs-20261028/ocr-v3/index.html) chỉ có trên workspace local. Verification kỹ thuật: build, types, lint, tests, chữ ký/assets và diff PASS; không phát hiện secret mới trong các module OCR đã sửa, staging trống và HEAD không đổi. **Điều kiện phát hành “đọc đúng mọi hóa đơn” chưa đạt**; đây là bản ứng viên để tiếp tục đánh giá, không phải báo cáo hoàn tất accuracy toàn diện.

## Giới hạn còn lại và tiêu chí mở rộng

Chưa đạt mục tiêu đọc đúng tất cả hóa đơn: ảnh thermal mờ, mất cột/ký tự, tên riêng, hàng tặng thiếu ô số và nhiều mẫu quốc tế vẫn cần kiểm tra hoặc chụp lại. Không sửa ký tự tùy ý để khớp nhãn, không suy tổng từ các dòng khi thuế/phí chưa rõ. Tiền tệ thập phân, chữ viết tay, nhiều trang và mọi hệ chữ chưa được chứng nhận.

Để tăng accuracy tiếp, cần corpus Việt có ảnh gốc đủ nét và nhãn độc lập theo template/cửa hàng; so sánh engine trên cùng holdout trước khi thay engine hoặc thêm cloud. Điều kiện đề xuất: ≥200 ảnh rõ + 50 hard-negative, tách template giữa dev/test, hai người gán nhãn; báo total/currency exact, merchant CER/exact, row precision/recall, từng trường số, metadata false positive, review/missing rate và p50/p95 toàn luồng trên Redmi. Không dùng test giả lập làm điểm accuracy ảnh thật.

Bằng chứng local nằm trong `.artifacts/mobile-bugs-20261028/ocr-v3/`: `public-corpus-manifest.json`, `source-freeze.json`, `combined54-native.json`, `public-final-evaluation.json`, `final.json`, `structure-evaluation.json`, `native-metrics.json`, các log RED/GREEN/test/build; ảnh và release backup thuộc `.artifacts/` được ignore.

## Bổ sung 29/10/2026 — tiếp tục local, không phát hành

Chủ dự án xác nhận **giữ local, chưa cập nhật Google Play**. Không commit/push, không cập nhật landing. Các số liệu ở phần này mới hơn checkpoint 28/10 phía trên.

### Sửa lỗi và bảo đảm bằng kiểm thử

- Chấp nhận khoảng trắng ngang cạnh dấu phân cách trong `45, 455`, `12. 000. 000`. Vẫn từ chối hai giá cạnh nhau, nhóm số sai, xuống dòng giữa số và ký tự hỏng; không đổi chính sách tiền tệ số nguyên hiện có.
- Không cắt đuôi `12O900` hoặc `1.23.456` thành giá sản phẩm nhỏ hơn. Khi không đọc chắc được giá, bỏ đề xuất đó thay vì sửa chữ số theo nhãn mong muốn.
- Nhãn tổng có tọa độ chỉ ghép với số cùng hàng hoặc số ngay trên/dưới trong khoảng cách giới hạn. Không dùng số nằm xa chỉ vì ML Kit trả nó tiếp theo trong danh sách block. Raw text ghi chú số chưa gắn được để lần đọc lại không mất ràng buộc này.
- Phí vận chuyển/giao hàng không trở thành sản phẩm; hỗ trợ nhãn `Cần trả`; địa chỉ, email và hotline chứa chữ “tổng” không cấp số tiền thanh toán.
- Giới hạn merchant ở vùng trước sản phẩm đã nhận diện hoặc vùng tổng kết. Khi header bị che, giữ merchant trống thay vì lấy dòng hàng chưa đủ giá hoặc chữ ở cuối bill. Giữ tên sản phẩm có thương hiệu số như `3 Miền`.
- Cho kiểm tra hóa đơn thiếu merchant khi ít nhất hai hàng dương và tổng hàng cộng/trừ các khoản thuế, phí, giảm giá **đọc được từ ảnh** khớp tổng phải trả. Ghép các ô thuế/phí theo tọa độ vào raw text để đọc lại vẫn kiểm được phép cộng. Không suy số tiền thuế từ tỷ lệ phần trăm, không dùng trường gõ tay làm bằng chứng; phí sai/thiếu/đứng giữa hai số cạnh tranh vẫn bị chặn.

`receipt-money.test.ts`, `receipt-amount-layout.test.ts`, `receipt-merchant-boundary.test.ts`, `receipt-adjustments.test.ts` có 20 test mới. RED thực chạy: 7/10 lỗi ở lượt đầu về tiền/bố cục; 2 lỗi về metadata/đọc lại; 3/4 lỗi vùng merchant; 2/5 lỗi kiểm tra tổng có thuế/phí. GREEN: **191/191 OCR, 985/985 mobile**, lint và typecheck PASS. Coverage các module receipt được chọn: **98,82% lines / 95,32% branches / 98,84% functions**. Java unit task giữ 4 test đã PASS, Gradle dùng kết quả cache vì Java production không đổi trong đợt 29/10. Không có checkpoint commit theo yêu cầu chủ dự án.

### Đánh giá ảnh thật và tách tập

| Tập / chỉ số | Checkpoint 28/10 | Bản cuối 29/10 |
| --- | ---: | ---: |
| Bill: tổng đúng / sai / thiếu trên 22 ảnh đủ nhãn | 15 / 1 / 6 | 15 / 1 / 6 |
| CORD 000–017: tổng đúng / sai / thiếu trên 17 ảnh đủ nhãn | 10 / 2 / 5 | 11 / 1 / 5 |
| CORD 000–017: dòng khớp / dòng trả về / 43 dòng có nhãn | 24 / 26 | 25 / 27 |
| CORD 000–017: quantity đúng / 35 có nhãn | 16 | 17 |
| CORD 000–017: line total đúng / 43 có nhãn | 24 | 25 |

CORD 012–017 đã được mở tiếp để chẩn đoán merchant trên UI, vì vậy cả 000–017 nay là regression/development, không còn dùng làm tuyên bố holdout độc lập. Không gộp các tên gần đúng thành tên chính xác: tên exact của nhóm này vẫn 11/43. CORD không có nhãn merchant trong `gt_parse`, nên không công bố merchant accuracy từ tập đó.

Tải thêm **6 ảnh CORD test 018–023** từ nguồn tác giả sau khi đóng băng source (`source-freeze-final29.json`); không xem ảnh/nhãn để chỉnh quy tắc và không dùng ảnh/nhãn của nhóm này để chỉnh quy tắc. Sau lần chấm đầu có sửa UX xác minh thuế/phí dựa trên ca regression 014; chấm lại 6 ảnh mới vẫn cho cùng tổng, tên và dòng hàng. Không gọi đây là nghiệm thu độc lập của toàn bộ UX cuối. Chạy ML Kit thật trên Redmi: 6 ảnh, 0 lỗi đọc, kiểm tra cache lặp và invalidate khi xoay đều PASS; instrumentation 6,039 giây. Direction + inspect của từng ảnh: 378–734 ms, chưa phải thời gian toàn UI.

Trên nhóm mới: **2/6 tổng đúng, 0 sai, 4 thiếu**; **6/14 dòng khớp và đúng line total**, 6 dòng trả về, **0 tên exact**, quantity đúng **1/14**. Baseline HEAD `482ec09f` trên cùng native output có tổng 2 đúng/0 sai/4 thiếu và 2/14 dòng khớp. Đây là sáu ảnh thử độc lập nhỏ, không chứng minh độ chính xác phổ quát. Tổng cộng đã đọc native 60 ảnh khác nhau trong hai đợt; bộ mới không cải thiện được total recall so với baseline.

### Bản build local và giới hạn còn mở

AAB cuối: `.artifacts/releases/picket-1.0.12-26-latest29-google-play.aab`, 80.936.223 bytes; SHA-256 `dcaaac610d0f5c3e35046c2e959d962ff3bf93cb7b83c2c652598e2c1f600595`. Đã kiểm tra chữ ký, manifest, ARM64+x86_64, source freeze và không lẫn ảnh corpus/lớp test. QA APK cuối: `.artifacts/releases/picket-1.0.12-26-ocr-qa-latest29-arm64.apk`. APK QA 82.860.912 bytes, SHA-256 `6f5a658a2949a58985d9b232f12d4e6ad7f61cacf7ef7359509c55553ea5a9af`; APK kéo từ Redmi khớp file build. Source cuối nằm trong `source-freeze-latest29.json`. Các build trước vẫn lưu trong artifacts làm bằng chứng theo ngày; không dùng chúng thay bản cuối.

| Kiểm tra UI trên QA cuối 29/10 | Quan sát thực tế |
| --- | --- |
| CORD 014, có thuế/phí | Tổng 281.435, sáu hàng; merchant trống, không lấy “Charge”; được mở form kiểm tra nhờ 43.435 thuế/phí quan sát được cộng khớp. 1.229 ms toàn luồng OCR, native 808 ms |
| CORD 001 | Tổng 91.000, ba hàng; merchant trống để nhập; không dùng tên sản phẩm làm cửa hàng. 583 ms, native 473 ms |
| Hủy picker rồi quay về | Giữ draft 91.000/ba hàng, không chạy OCR mới. Dashboard vẫn 60.000 và chưa có khoản chi trong tuần; không bấm lưu giao dịch |

Hai lượt là quan sát thực tế, không dùng làm p95 hoặc chứng minh mọi hóa đơn nhanh tương tự. Đã gỡ app instrumentation, xóa APK test mới khỏi Downloads và tắt lại quyền nguồn cài của File Manager (`REQUEST_INSTALL_PACKAGES: deny`). App Play thật vẫn 1.0.11/code 24. Gallery local có ảnh trước/sau; ảnh này không được đăng lên cửa hàng.

Ảnh che merchant cần nhập tên thủ công; chỉ cho review nếu các hàng và các khoản điều chỉnh quan sát được khớp tổng. Ảnh chỉ còn một hàng hoặc thiếu ô thuế/phí vẫn có thể bị yêu cầu nhập thủ công toàn bộ. Hàng giá 0 chưa có ô số đọc được, quantity liền tên không có bằng chứng cột rõ, tên riêng và chữ thermal mờ vẫn chưa đạt. Việc để trống merchant giúp tránh gợi ý sai nhưng không biến các hóa đơn thiếu bằng chứng thành ca PASS. Giao diện hiện còn hiển thị VND cho mẫu IDR; không lưu các mẫu đó thành giao dịch.

**OCR chưa đạt điều kiện bàn giao hoàn thiện hoặc phát hành.** Play Internal và landing giữ code 24; không upload code 26. Bằng chứng mới: `amount-layout-red.log`, `amount-roundtrip-red.log`, `adjustment-review-red.log`, `adjustment-review-green.log`, `merchant-boundary-red.log`, `merchant-boundary-green.log`, `mobile-latest29.log`, `coverage-latest29.log`, `public-latest29-evaluation.json`, `public-fresh-latest29-evaluation.json`, `fresh29-native.json`, `release26-latest29-aab-verification.json`, `latest29-verification.json`, `ui-latest29-perf.log` trong artifacts.


## Tiếp tục 29/10/2026 — sửa parser, luồng review và đối chứng engine

Trạng thái: local, **chưa nghiệm thu accuracy toàn diện**, không commit/push/Play/landing. AAB `latest29` ở phần trên là checkpoint cũ, không chứa các thay đổi trong phần này. Chỉ build QA APK mới để kiểm tra trên Redmi.

- Đọc tiền VND không còn cắt phần thập phân khác 0 (`12,50` không thành `12`); `.00` vẫn được chấp nhận. Đây không phải hỗ trợ tiền tệ quốc tế.
- Số lượng đứng đầu có dấu nhân rõ (`2x Trà xanh`, `0,5 x Táo xanh`) được tách khỏi tên. Đơn giá tính từ thành tiền/số lượng luôn có confidence review; không làm tròn một phép chia không nguyên để tạo giá.
- Dòng tặng có số lượng rõ và ô giá 0 được giữ; ô giá trống không biến thành 0. Các tên thương hiệu số như `3 Miền`, `7UP` không bị hiểu là số lượng khi không có dấu nhân.
- Hóa đơn có tiêu đề chứng từ, ngày hợp lệ và ít nhất một dòng dương với phép tính quan sát được nhất quán có thể vào review dù thiếu merchant hoặc total. Không cho số tiền/tên nhập tay làm bằng chứng; danh sách mua sắm, metadata hoặc quà miễn phí đơn lẻ không đủ.
- Thiếu merchant được đánh dấu cần kiểm tra. Giao diện cảnh báo khi có ký hiệu ngoại tệ rõ hoặc số thập phân; bỏ nhãn VND ở dòng hàng và chặn handoff VND. Không suy tiền tệ từ ngôn ngữ/quốc gia; ảnh không có ký hiệu tiền tệ vẫn chưa thể phân loại ngoại tệ chắc chắn.

RED: `continuation-red.log` có 7 lỗi đúng hành vi trước sửa; currency module thiếu là compile-time RED, UI currency test có runtime RED trước khi sửa giao diện. GREEN checkpoint trước rà soát bổ sung: **997/997 mobile**, **202/202 OCR**. Lint/typecheck đã PASS trước thay đổi nhỏ về quantity thập phân và đang chạy lại; receipt coverage ở checkpoint 201 test **98,86% lines / 95,34% branches / 98,87% functions**. Test harness capture được cập nhật để dùng hàm currency thực, không tắt các test cũ.

### So sánh engine cục bộ trên cùng 60 ảnh

Đã chạy thực RapidOCR 3.10.0 + ONNX Runtime 1.31.1 trên Windows CPU, detector PP-OCRv5 mobile + recognizer Latin mobile + classifier v2, 2 intra-op threads. Chỉ inference local; không upload Bill sang dịch vụ OCR. Package/model/script/output nằm trong ignored `ocr-v3/engine-compare/`; không thêm dependency/model vào app. License package RapidOCR Apache-2.0, ONNX Runtime MIT; model hash được lưu trong `model-manifest.json`.

| Tập | ML Kit + parser hiện tại: đúng / sai / thiếu tổng | RapidOCR + cùng parser |
| --- | --- | --- |
| Bill 22 ảnh có nhãn | 15 / 1 / 6 | 11 / 3 / 8 |
| CORD 000–017, 17 tổng có nhãn | 11 / 1 / 5 (đã chạy lại) | 12 / 2 / 3 |
| CORD 018–023, 6 tổng | 2 / 0 / 4 | 0 / 0 / 6 |

CORD 000–017: RapidOCR khớp 19/43 dòng, tên exact 9/43, quantity 11/35, line total 18/43. CORD 018–023: khớp 6/14, tên exact 0/14, quantity 1/14, line total 5/14. Đây là so sánh end-to-end với parser đang dùng, không phải character-accuracy thuần của recognizer. RapidOCR có thứ tự dòng/geometry khác ML Kit và chưa được adapter riêng tối ưu. Thời gian CPU p50 4.569 ms/p95 7.925 ms, đo cùng lúc có build Gradle nên không dùng để kết luận tốc độ Android hoặc benchmark latency kiểm soát.

**Không thay engine production** vì bản thử chưa cải thiện ổn định và tăng tổng sai trên Bill. Nhóm 018–023 đã được mở để chẩn đoán trong lượt này nên nay là regression, không còn gọi là holdout độc lập. Các JSON đối chứng đã sửa nhãn phương pháp để không nhầm output Windows thành native Redmi.

Nguồn: [ML Kit hướng dẫn chất lượng ảnh](https://developers.google.com/ml-kit/vision/text-recognition/v2/android), [PaddleOCR ngôn ngữ Latin gồm tiếng Việt](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/algorithm/PP-OCRv5/PP-OCRv5_multi_languages.en.md), [RapidOCR model list](https://rapidai.github.io/RapidOCRDocs/main/en/model_list/). ML Kit khuyến nghị ký tự đủ pixel và ảnh nét; không có cơ sở cam kết khôi phục mọi chữ số đã mất trong ảnh nhỏ/mờ.

Bằng chứng accuracy: `continuation29.json`, `public-continuation29-evaluation.json`, `engine-comparison29.json`, `public-engine-comparison29-evaluation.json`, `public-engine-fresh29-evaluation.json`. Đây là số liệu regression; chưa có thêm bộ Việt gán nhãn độc lập bởi hai người.

## Cập nhật QA thiết bị — 30/10/2026

- QA31 (`com.picket.mobile.bugqa`, Redmi 7) đã chạy đủ 40 ảnh gốc trong `Bill/`; từng output có SHA-256 khớp ảnh đầu vào. Đây là bằng chứng bao phủ chạy native, không có nghĩa cả 40 ảnh đều có nhãn ground truth.
- Trên 22 ảnh cũ có nhãn tổng VND: 15 exact, 1 wrong, 6 missing. Ba ảnh mới được đọc làm nhãn đều thiếu tổng; một ảnh mới quá khó đọc để chấm. So sánh QA30→QA31 trên cùng 40 ảnh không làm thay đổi tổng nào.
- Nhãn sản phẩm độc lập mới chỉ bao phủ 3 ảnh/7 dòng: 5 exact, 2 missing, 1 extra. Chưa đủ dữ liệu để kết luận lọc metadata đúng trên toàn bộ 40 ảnh.
- Photo Picker mở được; ảnh #05 tới màn review với ngày, merchant, tổng 54.000 và 4 dòng đúng. Chọn tiếp ảnh 7-Eleven đã xóa draft cũ và chuyển sang retry. Live fallback/date/edit matrix và soak/nhiệt vẫn chưa được kiểm chứng đầy đủ.
- Độ trễ native của 40 phiên thành công: tối đa 1.797 ms, trung bình 544 ms; có 3 lỗi hướng ảnh. PSS là hai ảnh chụp điểm, không phải peak/soak. Không lưu giao dịch và không cài lên package production.
- Kết luận: OCR chưa đạt tiêu chí đọc đúng mọi hóa đơn; QA31 chưa phát hành, Play/landing giữ code 24. Log theo ảnh, hash, ảnh màn hình, build integrity và đánh giá độc lập nằm trong local-only `.artifacts/features/mobile-ocr-resilience/evidence/`.

### QA32 sau chỉnh payable-label — 30/10/2026

- OCR hẹp 219/219 PASS; lint 0 lỗi/1 cảnh báo cũ; typecheck PASS. Thay đổi parser giới hạn fuzzy match cho nhãn tổng phải trả; ba test RED/GREEN chứng minh không lấy tổng sai từ nhãn summary hoặc tên sản phẩm.
- Build QA32 `com.picket.mobile.bugqa`, code 32, ARM64 đã cài trên Redmi 7. Hash APK đã kéo từ package đã cài khớp chính xác APK build. App `com.picket.mobile` production giữ 1.0.11/code 24 và timestamp cài đặt không đổi.
- Chạy lại đủ 40 ảnh Bill gốc, hash đầu vào khớp 40/40. Trên 25 tổng có nhãn: 17 đúng, 1 sai, 7 thiếu; một ảnh không đọc được để chấm và 14 ảnh chưa có nhãn. Hai ảnh #02/#03 từ thiếu thành đúng (54.000 và 513.238); tổng hỏng #04 được để thiếu, không suy đoán. Còn 3 lỗi hướng ảnh; thời gian nhận dạng thành công tối đa 1.527 ms, trung bình 529 ms.
- Sản phẩm chỉ có nhãn độc lập cho 3 hóa đơn/7 dòng: 5 đúng, 2 thiếu, 1 thừa, không false-positive metadata trong subset nhỏ đó. Chưa đủ để kết luận toàn corpus.
- Kiểm tra picker bằng ảnh Bill #05 mới được lập chỉ mục: mở album, chọn ảnh, tới review với ngày 18/02/2019, merchant, 54.000 và bốn dòng (551 ms). Lần chọn thumbnail lỗi trước đó là mục MediaStore cũ trỏ đến file đã xóa (ENOENT); ảnh thật mới chọn được. Không lưu giao dịch.
- PSS spot 246.071 KB sau lượt corpus/gallery, không phải peak hay soak. Live fallback/date/edit khi đang polling và kiểm tra nhiệt độ vẫn chưa đủ. OCR chưa đạt điều kiện công bố “đọc đúng mọi hóa đơn”; giữ local, không cập nhật Google Play/landing.
- Chi tiết, ảnh, log và integrity: `.artifacts/features/mobile-ocr-resilience/evidence/b2-round12-*`.

### QA35 trên Redmi 7 — 30/10/2026, checkpoint hiện hành

- B2 round13 giữ draft OCR cần review khi hướng ảnh còn mơ hồ nhưng không có bằng chứng xoay; round14 thêm phân loại tổng phải trả cho nhãn viết tắt `T.Tiền`. Không có rule gắn với tên/số tiền cụ thể trong Bill. OCR tests 221/221, lint 0 lỗi/1 cảnh báo có trước, typecheck PASS.
- Build QA-only `com.picket.mobile.bugqa`, `1.0.12-ocr-qa-r14`/code35 ARM64 trên source hiện tại. SHA-256 APK local và APK base kéo từ máy giống nhau: `8b7b1bff…f27f2d570`. Production vẫn `com.picket.mobile` 1.0.11/code24; không cài đè, clear hoặc gỡ.
- QA35 chạy đủ 40 ảnh Bill gốc, SHA-256 đầu vào khớp 40/40, 0 lỗi phiên. Thời gian phiên thành công trung bình 511 ms, tối đa 1.623 ms. Cùng bộ 25 tổng có nhãn: 17 exact, 1 wrong, 7 missing; thêm 1 ảnh không chấm được và 14 ảnh chưa có nhãn. Lỗi tổng #27 vẫn 8.031.570 thay cho nhãn 8.031.670. Không dựng tổng cho ảnh thiếu.
- Đánh giá sản phẩm không đổi so QA33 trên cùng input: chỉ 3 hóa đơn/7 dòng có nhãn độc lập, 5 exact, 2 missing, 1 extra, 0 metadata false positives trong subset. Không thể suy rộng ra 40 ảnh.
- Photo Picker mở album và trả ảnh đã chọn về capture. QA35 hiển thị ảnh nhưng kết quả thử này vào retry “Không đọc được hóa đơn”; đây không phải bằng chứng review dương tính. Không lưu giao dịch. PSS điểm chụp sau corpus là 235.354 KB, không phải peak/soak/nhiệt.
- **Chưa nghiệm thu OCR.** AC-1 PASS trong phạm vi test chặn token hỏng/tiền tệ; AC-2, AC-3, AC-4, AC-5 còn UNVERIFIED vì thiếu review dương tính/matrix UI, nhãn hàng rộng, lỗi tổng còn lại và soak/thermal. Không phát hành Play/landing.
- Log, outputs 40 ảnh, score, hash, ảnh picker và build integrity nằm trong `.artifacts/features/mobile-ocr-resilience/evidence/b2-round14-*`.

### QA36 trên Redmi 7 — 30/10/2026

- B2 round15 sửa hiệu chuẩn confidence: độ tin cậy của tổng không vượt độ tin cậy của token số được OCR; candidate ranking vẫn riêng để giữ xử lý tổng xung đột. Synthetic RED/GREEN, OCR 222/222, capture/review/QA 19/19, typecheck PASS; lint 0 lỗi/1 cảnh báo có trước.
- QA36 `com.picket.mobile.bugqa`, code 36, `1.0.12-ocr-qa-r15`, ARM64 đã được build và cài riêng cho QA; SHA-256 APK local khớp installed base. Production `com.picket.mobile` vẫn 1.0.11/code24, timestamp cài không đổi.
- Chạy đủ 40 ảnh `Bill/`, hash nguồn khớp 40/40, 0 lỗi phiên; trung bình 507 ms, tối đa 1.527 ms. So QA35, không đổi tổng phải trả nào. Trên 25 tổng có nhãn: 17 exact, 1 wrong, 7 missing; thêm 1 unreadable không chấm được và 14 ảnh chưa có nhãn. #27 vẫn sai `8.031.570` so với nhãn `8.031.670`, nhưng mức tin cậy giảm từ khoảng 0.956 xuống 0.708 và được yêu cầu kiểm tra; không tự sửa giá trị theo nhãn.
- Nhãn sản phẩm giữ nguyên phạm vi nhỏ: 3 hóa đơn/7 dòng, 5 exact, 2 missing, 1 extra, không có metadata false positive trong subset. Chưa đủ nhãn để kết luận về 40 ảnh.
- Luồng UI thư viện được tái kiểm tra trên cùng QA36: Photo Picker → album `PicketOCRBill40` → ảnh `Bill/bil-thanh-toán.jpg`; hash MediaStore khớp ảnh gốc. Review hiện ngày `18/02/2019`, `CÀ PHÊ HOÀNG PHÚC`, tổng `54.000 VND`, 4 hàng đúng nhãn. Không lưu giao dịch. Xem `b2-round15-qa36-gallery-positive.md`.
- PSS điểm chụp sau corpus 241.939 KB, sau review 238.378 KB; ảnh chọn có native decode 10 ms và direction 579 ms. Không phải đo peak/soak/thermal.
- AC-1 PASS trong phạm vi confidence/parser; AC-2 UNVERIFIED tổng thể (đã có đường positive nhưng thiếu date fallback/retry/edit-during-polling matrix); AC-3 UNVERIFIED (nhãn hàng 3/40); AC-4 UNVERIFIED (1 tổng sai, 7 thiếu và nhãn metadata chưa đủ); AC-5 UNVERIFIED (chỉ đo 40 lượt và một luồng gallery, thiếu soak/nhiệt).
- Kết luận: OCR vẫn chưa đạt để phát hành; giữ local, không cập nhật Google Play/landing. Logs, kết quả 40 ảnh, scoring, hashes, screenshots và PSS ở `.artifacts/features/mobile-ocr-resilience/evidence/b2-round15-*`.
