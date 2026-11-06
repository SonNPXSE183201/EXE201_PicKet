# Mobile OCR: cấu trúc hóa đơn và nghiệm thu

Báo cáo này ghi đợt structured OCR trước. Hiện trạng mới hơn về POS, tổng phải trả, cache và QA code 26 nằm trong [báo cáo mở rộng](MOBILE_OCR_EXPANDED_20261028.md); các số liệu bên dưới giữ nguyên để đối chiếu lịch sử.

## Phạm vi

Chỉ mobile theo chỉ đạo mới nhất. Không sửa web, không bật dịch vụ AI trả phí hoặc gửi corpus sang nhà cung cấp mới. Giữ ML Kit on-device, pipeline một session và giới hạn 20 giây. Kết quả là đề xuất phải kiểm tra trước khi lưu, không có cam kết đúng mọi ảnh.

## Phát hiện và thứ tự sửa

1. Parser quét toàn trang theo mẫu chữ + số nên nhận phone/address/card/document/customer/cashier thành sản phẩm. Thêm phân loại metadata và ranh giới vùng hàng trước khi parse số.
2. Nhãn bảng quá khắt khe; POS dùng Giá/ĐG/T.Tiền không được đọc. Dùng alias có ngữ cảnh, ghép ô bằng tọa độ và giữ nguyên tên, kiểm quantity × unit price với line total; dòng mâu thuẫn không tự sửa cho khớp.
3. Merchant bị cạnh tranh bởi nhãn chứng từ/thu ngân/địa chỉ. Giới hạn vùng đầu hóa đơn và loại metadata; không có ứng viên hợp lệ thì để trống.
4. Line-level OCR có thể gộp nhiều ô. Giữ thêm word elements, bounds/confidence từ ML Kit để xử lý bảng; giới hạn số token để không làm nặng parser.
5. Số lượng/đơn giá suy ra phải có cảnh báo; không coi q=1 là dữ liệu đã quan sát. Không lấy tổng dòng hàng thay tổng phải trả khi còn thuế/phí/giảm giá chưa rõ.
6. Hiệu năng: tái sử dụng recognizer/bitmap; không thêm upscale toàn ảnh. Bỏ detail crop khi bảng đã đủ và khớp tổng; chỉ retry có bằng chứng thiếu chi tiết, vẫn giữ timeout/cancel/close.

## Nghiên cứu

- [ML Kit Android](https://developers.google.com/ml-kit/vision/text-recognition/v2/android): có lines/elements/geometry; cần ảnh đủ nét/pixel. OCR chữ không tự giải nghĩa bảng hóa đơn.
- [Paddle PP-StructureV3](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/PP-StructureV3.html): có layout/table nhưng cần đo CPU/RAM trên hạ tầng hiện có; không thay pipeline mobile bằng model nặng chưa benchmark.
- [Azure receipt language support](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/language-support/prebuilt?view=doc-intel-4.0.0): Vietnamese có trong receipt v4 hiện hành; chỉ là phương án đánh giá sau, chưa tích hợp hay upload Bill.
- [SROIE](https://arxiv.org/abs/2103.10213) tách localization/OCR/KIE; [CORD](https://github.com/clovaai/cord) có nhãn dòng hàng nhưng là Indonesian. Không lấy điểm trên dataset này làm accuracy tiếng Việt.

## Nghiệm thu và testing

| Tầng | Phép kiểm | Điều kiện |
| --- | --- | --- |
| RED/GREEN | Metadata giả sản phẩm, merchant sai, POS alias, ô lệch hàng, footer, hàng khuyến mãi, số lượng lẻ, arithmetic conflict | Test chạy parser thật; lưu log RED trước sửa và GREEN sau sửa |
| Corpus cố định | 36 output ML Kit thật từ Redmi; 22 tổng tiền VND đủ rõ được gán nhãn | Báo exact/wrong/missing riêng, không bỏ ảnh lỗi khỏi tổng số; không hardcode theo file |
| Merchant/items | Gán nhãn thủ công các ảnh đọc được: name/q/unit/line total | Báo precision/recall từng dòng và exact từng trường; khai rõ subset và reviewer, không suy từ accuracy tổng |
| Hiệu năng | Parser cố định và end-to-end trên Redmi 7 | Tách Windows JS khỏi native; ghi p50/p95/lượt đọc, timeout và mức dùng bitmap; không coi cached OCR là lần inference mới |
| UI thật | Chọn Bill, xem/sửa merchant/items/totals, kiểm trước khi lưu, hủy/quét lại | Không phone/address thành item; không tự lưu; giữ được dữ liệu khi cần chỉnh |
| Hồi quy | Mobile tests, lint/typecheck, Android build và native smoke | Không sửa web/API/DB, không thay quota hay auto-create transaction |

Mục tiêu chất lượng mở rộng: metadata false-positive bằng 0 trên bộ hard-negative đã gán nhãn; precision dòng hàng ≥98%, recall ≥90%, exact tổng ≥95% trên tập ảnh rõ độc lập theo loại hóa đơn. Đây là mục tiêu nghiệm thu, chưa phải kết quả đạt; bộ 36 ảnh hiện có chưa đủ để chứng nhận các tỷ lệ cho mọi hóa đơn.

## Kết quả

### Đã triển khai

- Phân loại metadata trước khi parse sản phẩm; giới hạn theo vùng header/body/summary, kể cả khi OCR làm hỏng chữ trong metadata. Không quét header và footer như danh sách hàng.
- Merchant loại document/cashier/address/contact; bỏ nhãn “Đơn vị bán hàng:” và bổ sung khoảng trắng sau tiền tố loại cửa hàng bị dính chữ. Raw text gốc vẫn giữ, không tự sửa dấu/tên riêng.
- Bảng có alias Giá/ĐG/T.Tiền; xử lý nét viền quanh ô số. Có ghép dòng POS dạng tên trên, số lượng/giá ở dưới, nhưng chỉ nhận khi quan hệ số học khớp; trường hợp không chắc vẫn cảnh báo.
- Xuất word elements/bounds/confidence native (tối đa 60 từ/dòng, 1.600 từ/lượt; line text vẫn giữ). Tách merged header/body bằng vùng cột đã nhận diện; không tách tùy tiện mọi dòng.
- Quantity=1/unitPrice=total khi không có số lượng in rõ chỉ là giá trị suy ra, confidence bị hạ và UI yêu cầu đối chiếu. Confidence là điểm heuristic, không phải xác suất đúng đã được hiệu chuẩn.
- Mobile server-result adapter cũng chặn structured merchant là metadata và cảnh báo khi tổng structured khác tổng đọc từ text. Không sửa server/provider/web.
- Bỏ parse trùng trong một session; bỏ detail crop khi bảng quan sát đầy đủ, không cần review và tổng hàng khớp payable. Vẫn retry khi thiếu/khác tổng, timeout/cancel/close và pixel cap giữ nguyên. Word frame và line frame được dịch cùng nhau khi ghép crop.

### Chấm corpus

36/36 ảnh chạy lại ML Kit thật trên Redmi 7, không lỗi thực thi. Tổng tiền VND chấm trên 22 ảnh rõ, không trùng: **15 đúng, 1 sai có cảnh báo, 6 thiếu**, không tăng accuracy tổng so với code 24. Không đưa ảnh mẫu/không rõ/mất cột/khác tiền tệ vào mẫu số 22.

Đối chiếu parser trước/sau trên cùng output native và kiểm lại với output native mới. Một người gán nhãn 3 ảnh chẩn đoán (cà phê, POS bán lẻ, VAT), tổng 7 dòng hàng; đây là tập đã dùng để phát triển, **không phải holdout độc lập**. Row identity dùng khoảng cách tên chuẩn hóa để ghép một-một; exact name/numeric chấm riêng.

| Chỉ số trên tập chẩn đoán | Trước | Sau |
| --- | ---: | ---: |
| Dòng hàng đúng được ghép | 1/7 | 6/7 |
| Dòng trả về đúng danh tính | 1/3 | 6/6 |
| Tên sản phẩm đúng nguyên văn | 1/7 | 5/7 |
| Quantity/unit price/line total đúng | 1/7 mỗi trường | 6/7 mỗi trường |
| Merchant đúng nguyên văn | 1/3 | 2/3 |
| Metadata đã gán nhãn bị nhận thành hàng | 15 | 0 |

Không gọi 6/6 trên tập nhỏ là precision 100% cho mọi hóa đơn. 15 hard-negative là các dòng đã xác nhận trong corpus trước sửa; không chứng minh không có false positive ở ảnh chưa gặp.

### Hiệu năng và kiểm tra

- Direction + full-read native, 36 ảnh Redmi: **p50 864 ms / p95 1.180 ms**; trước 852/1.188 ms. Gần tương đương, không tuyên bố tăng tốc có ý nghĩa thống kê. Không bao gồm UI/crop/cloud.
- Parser Windows trên output cố định có thêm chi phí phân loại/bảng, vẫn khoảng 1–2 ms p95 trong lượt đo; không dùng số này làm tốc độ Redmi. Tốc độ đọc ảnh vẫn là phần chi phối.
- UI thực trên QA cuối: cà phê 1.222 ms (4 hàng, không detail crop); POS 820 ms (1 hàng, tổng 935.000); VAT 1.137 ms (1 hàng, có detail crop). Ba lượt này không đủ để suy ra p95 end-to-end cho mọi ảnh.
- **947/947 mobile tests**, **153 OCR tests**, lint/typecheck đạt. Coverage tập trung các module receipt đạt **95,72% lines / 89,58% branches**, không phải coverage toàn ứng dụng. Có RED log cho metadata/POS, inferred quantity, tránh crop thừa, structured metadata và merchant display.
- Android release QA ARM64 build đạt; instrumentation một test duyệt 36 ảnh đạt, 34,196 giây. Đã gỡ app instrumentation chứa corpus sau khi lưu bằng chứng.
- Ba Java unit tests cho giữ chi tiết ảnh, decode pixel cap và bounds lỗi đạt. PSS app sau lượt UI là 261.713 KiB (khoảng 255,6 MiB); đây là một snapshot, chưa phải peak RAM hoặc chứng nhận không rò rỉ dài hạn.
- Bản cài Redmi là `com.picket.mobile.bugqa`, **1.0.12-ocr-qa/code 25**. SHA-256 APK đã cài khớp bản build: `17a137e7b3ccb09ce9a9c37b3569b131b10adff0fd18614e0d60fceee6771c82`. Số dư QA 60.000 giữ nguyên; không tạo giao dịch OCR. App Play thật không bị ghi đè. Public Play/landing vẫn **1.0.11/code 24**, chưa phát hành các sửa này.

Ảnh gallery: `.artifacts/mobile-bugs-20261028/ocr-v2/index.html`. Bằng chứng: `before.json`, `after.json`, `fresh.json`, `structure-evaluation.json`, `item-ground-truth.json`, `metadata-hard-negatives.json`, `redmi-native-fresh.json`, `ui-final-perf.log`, `installed-qa-verification.json`, các log RED/GREEN/build/test. Corpus và dữ liệu tài khoản không commit.

Checkpoint TDD trên nhánh hiện hành: `9bd6056f` (RED tái hiện metadata/POS) → `f238dfcb` (GREEN parser/session/native và UI cảnh báo). Không dùng test UI làm bằng chứng accuracy ảnh độc lập.

## Các điều kiện chưa đạt và bước cần tiếp tục

1. **Tổng tiền:** còn 1 sai có cảnh báo, 6 thiếu trên 22 ảnh VND; OCR chữ hỏng/mất cột không thể sửa chắc chắn bằng regex. Cần ảnh nguồn rõ hơn và đối chiếu engine trên tập holdout, không suy tổng bằng cộng hàng khi thiếu thuế/phí.
2. **Tên:** còn sai dấu/ký tự tên riêng và tên hàng. Không dùng từ điển để tự đổi tên cửa hàng tùy ý. Cached native chấm merchant exact 2/3; UI VAT lượt sau đọc được tên đúng hơn, không dùng lượt đó để sửa nhãn hoặc thay mẫu số benchmark.
3. **Hàng tặng/ô trống:** VAT mẫu còn thiếu nồi cơm điện giá 0 vì native không đọc được ô quantity/unit/total; không tự dựng số 0 từ nội dung khuyến mãi. Cần kiểm tra nhãn free-item và khả năng nhập bổ sung.
4. **Subtotal, thuế, ship/discount:** POS đúng tổng 935.000 nhưng vẫn cảnh báo do tổng hàng 900.000. Cần phân loại từng vai trò subtotal/tax/fee/discount/payable để giảm cảnh báo thừa, không gộp các số thành sản phẩm hoặc tự thay tổng.
5. **Phủ loại hóa đơn:** số lượng cân lẻ, nhiều VAT, cột đổi thứ tự, tên nhiều dòng, nhiều trang, thermal mờ và tiền tệ thập phân vẫn cần tập đánh giá riêng. Luồng hiện hành dùng số nguyên theo chính sách cũ; chưa chứng nhận chính xác hóa đơn quốc tế hoặc viết tay.
6. **Nghiệm thu độc lập:** đề xuất tối thiểu 200 ảnh rõ + 50 hard-negative, chia theo cửa hàng/template, loại ảnh trùng giữa train/dev/test; hai người gán nhãn và phân xử. Đo exact tổng/currency, merchant CER/exact, row precision/recall/F1, từng trường số, false-positive metadata, missing/review rate và p50/p95 end-to-end. Chỉ công bố mục tiêu ở trên khi đạt trên tập này.

Đợt này đóng các lỗi metadata, POS và retry đã có test/bằng chứng; **chưa đạt tiêu chuẩn nhận diện chính xác tất cả loại hóa đơn**. Không phát hành công khai hoặc tự bật nhà cung cấp trả phí để biến các gate chưa đạt thành PASS.
