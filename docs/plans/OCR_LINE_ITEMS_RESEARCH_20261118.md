# Nghiên cứu: OCR hóa đơn chỉ đọc được tổng, bỏ sót dòng sản phẩm (18/11/2026)

Phạm vi: chỉ nghiên cứu, không sửa mã sản phẩm, không tạo commit. Tuân thủ `.agents/skills/picket-ocr-testing/SKILL.md`: chỉ xem 8 ảnh trong `Bill/` bằng thị giác (3 lượt, mỗi lượt ≤ 4 ảnh), không viết quy tắc theo tên cửa hàng hay số tiền của ảnh mẫu, không lấy tổng các dòng làm tổng phải trả. Dữ liệu tạm và bằng chứng nằm trong `.artifacts/ocr-research-20261118/` (bị Git bỏ qua).

## 1. Mục tiêu

1. Vẽ lại toàn bộ đường đi của OCR hóa đơn (trên máy và máy chủ), chỉ rõ tọa độ có được dùng hay không và cột có được ghép thành hàng hay không.
2. Đo xem bộ phân tích hiện tại lấy được bao nhiêu dòng hàng so với nhãn chuẩn.
3. Phân loại nguyên nhân bỏ sót dòng hàng, có bằng chứng cụ thể.
4. Đề xuất các hướng cải thiện tổng quát, xếp hạng theo tác động, công sức, độ trễ và quyền riêng tư, kèm cách đo nghiệm thu.

Bằng chứng gốc đã có từ trước: lần chạy lại 40 ảnh `Bill/` bằng đầu ra ML Kit thật trên Redmi 7 ngày 06/11 cho **độ chính xác dòng hàng 75,8% nhưng độ phủ chỉ 20,7%** (tổng đúng 25, sai 0, thiếu 11 trên 36 ảnh có nhãn) — `docs/PROJECT_SUMMARY_20261106.md:25`. Nghĩa là khi đã trả dòng thì phần lớn đúng, nhưng khoảng 4/5 dòng hàng thật bị bỏ sót. Đây đúng là triệu chứng chủ dự án mô tả.

## 2. Hiện trạng pipeline (file:dòng)

### 2.1. Trên máy (đường chính, luôn chạy)

| Bước | Vị trí | Ghi chú |
|---|---|---|
| Màn chụp gọi OCR | `apps/mobile/src/app/capture/index.tsx:193` | `recognizeReceipt(uri, signal)` |
| Cầu nối JS ↔ native | `apps/mobile/src/core/ocr/mlkit-receipt-ocr.ts:15-27` | Ghi log `PICKET_OCR_PERF` gồm `itemsCount` |
| Phiên quét, ngân sách 20 giây | `apps/mobile/src/core/ocr/receipt-scan-session.ts:19,25-93` | Thứ tự: `direction` → `select` → `inspect` → (xoay lại) → parse → cắt vùng tổng → cắt vùng bảng |
| Đọc ảnh nhỏ để đoán hướng | `ReceiptImageSession.java:95-102` | Thu ảnh về cạnh dài 960 px |
| Đọc toàn ảnh | `ReceiptImageSession.java:104-110` | Có cache trong phiên (`ReceiptReadCache`) |
| Cắt vùng chi tiết | `ReceiptImageSession.java:112-133`, `ReceiptCropScalePolicy.java:5-27` | Phóng vùng cắt nhỏ lên tối đa cạnh 1200 px |
| Bộ nhận dạng | `ReceiptImageSession.java:78`; `apps/mobile/modules/picket-receipt-ocr/android/build.gradle:6` | ML Kit `text-recognition:16.0.1`, mô hình Latin; `rn-mlkit-ocr` chỉ dùng làm plugin đóng gói mô hình (`apps/mobile/app.json:79-85`), không được gọi trong mã |
| Dữ liệu trả về JS | `ReceiptImageSession.java:146-159` | Mỗi `Text.Line`: `text`, `angle`, `confidence`, khung `left/right/top/bottom`, kèm `elements` (từng từ có khung; tối đa 60 từ/dòng, 1600 từ/ảnh). Các `TextBlock` bị làm phẳng, không giữ quan hệ block |
| Sắp xếp và xoay tọa độ | `apps/mobile/src/core/ocr/receipt-direction.ts:18-27` | Chỉ sắp theo `top` rồi `left`; không nắn nghiêng |
| Bộ phân tích | `apps/mobile/src/core/ocr/receipt-parser.ts:216-368` | Xem 2.2 |
| Cổng cho phép xem lại | `apps/mobile/src/core/ocr/receipt-eligibility.ts:6-57`; `capture/index.tsx:197-201` | Không đạt cổng thì bỏ toàn bộ kết quả, báo "Không đọc được hóa đơn" |

### 2.2. Bộ phân tích dùng tọa độ thế nào

`parseReceiptLines` (`receipt-parser.ts:217-222`) chạy lần lượt các bộ ghép hàng, mỗi bộ chỉ hoạt động khi có "mỏ neo":

| Bộ ghép | Vị trí | Điều kiện kích hoạt | Hệ quả |
|---|---|---|---|
| `receiptTableTokens` | `receipt-table-tokens.ts:13-42` | Có dòng tiêu đề tên hàng và ≥3 tiêu đề cột, trong đó có cột số lượng và cột thành tiền | Chỉ khi đó mới tách `elements` theo cột; không có tiêu đề thì không dùng tới khung từng từ |
| `receiptTableRows` | `receipt-table-layout.ts:100-169` | Phải tìm được **đủ 4 tiêu đề** tên, SL, đơn giá, thành tiền, mỗi loại đúng một (`:110`) | Thiếu hoặc đọc sai một tiêu đề thì bỏ qua cả bảng |
| `orderedTableRows` | `receipt-table-layout.ts:40-98` | Chỉ cho dữ liệu **không có tọa độ** (`:62-63`) | Không áp dụng cho ML Kit |
| `receiptPosRows` | `receipt-pos-rows.ts:10-39` | Có tiêu đề SL và tiêu đề thành tiền cùng hàng (`:12-15`) | Xử lý kiểu "tên ở trên, số ở dưới" chỉ khi có tiêu đề |
| `receiptVatSummaryRows` | `receipt-vat-summary.ts` | Hóa đơn VAT | Không liên quan dòng hàng bán lẻ |
| `receiptUnheadedRows` | `receipt-unheaded-rows.ts:11-55` | Phải có dòng tổng kết nhận ra được (`:14-15`), nếu không thì trả nguyên văn | Ghép tên với **đúng một** số bên phải, chồng lấn dọc ≥30% (`:39-41`); dạng xếp chồng chỉ khi dòng dưới có dấu nhân `q x đơn giá` (`:19-34`) |

Sau đó `receiptItemCandidates` (`receipt-parser.ts:70-138`) chỉ nhận một dòng làm sản phẩm khi **giá nằm ở cuối chính dòng đó** (`:86-89`). Nếu các bộ ghép phía trên không gộp được tên với giá thì tên và giá vẫn là hai dòng riêng, và dòng hàng bị mất. Tổng tiền thì khác: có ba cơ chế ghép theo không gian riêng (`spatialTotalCandidates` `:148-172`, `nearbyPayableTotalCandidates` `:175-201`, `adjacentTotalCandidate` `:203-213`), có bù góc nghiêng theo `angle` (`:152,156`). Đây là lý do **tổng thường đọc được còn dòng hàng thì không**: tổng có bộ ghép không gian không cần mỏ neo, dòng hàng thì cần.

Các bước phụ: cắt vùng bảng (`receipt-scan-session.ts:74-90`) chỉ chạy khi có đủ 4 tiêu đề (`receipt-table-crop.ts:8,15`) và chỉ nhận kết quả mới nếu tổng giữ nguyên và nhiều dòng hơn (`receipt-scan-session.ts:88`). Văn bản thô lưu nháp (`receipt-parser.ts:250-255`) chỉ giữ dòng đã ghép; cổng `canAttachReceipt` phân tích lại văn bản thô **không có tọa độ** (`receipt-eligibility.ts:8`, `receipt-parser.ts:144-146`).

### 2.3. Đường dự phòng máy chủ (chỉ khi người dùng đồng ý)

| Bước | Vị trí | Ghi chú |
|---|---|---|
| Điều kiện mở | `capture/index.tsx:80,281-283` | Chỉ cho dùng khi kết quả trên máy **đã đạt cổng**; ảnh không đọc được trên máy thì không có lối sang máy chủ |
| Hỏi đồng ý, tải ảnh vào vùng riêng | `capture/index.tsx:292-316`; `apps/mobile/src/core/ocr/server-fallback.ts:21-40` | Hộp thoại "Gửi ảnh để nhận diện nâng cao?" |
| Hàng đợi và worker | `apps/api/lib/src/ocr_worker.dart:83-115` (giới hạn 45 giây), `compose.production.yml:106-160` | Worker Dart gọi `ocr-provider` nội bộ |
| PaddleOCR | `services/ocr-provider/ocr_service/engine.py:13-33` | `PP-OCRv5_mobile_det` + `latin_PP-OCRv5_mobile_rec`, CPU 2 luồng; nắn ảnh/xoay tắt mặc định, bật bằng biến môi trường |
| Chuẩn hóa kết quả | `services/ocr-provider/ocr_service/contract.py:40-107` | Trả từng hộp chữ kèm đa giác; **cắt ở 160 dòng** (`:41`); `merchant/amount/date` luôn rỗng |
| Phân tích trên máy | `apps/mobile/src/core/ocr/server-result.ts:36-48` | Dùng tọa độ chỉ khi chuỗi các dòng có khung khớp **tuyệt đối** với `rawText`; lệch một dòng là rơi về phân tích văn bản thuần, mất toàn bộ khả năng ghép tên–giá |

### 2.4. LLM/Gemini

`GEMINI_API_KEY`/`GEMINI_MODEL` chỉ phục vụ worker học tập (`apps/api/lib/src/gemini_learning.dart`, `apps/api/bin/learning_worker.dart`, `compose.production.yml:163-176`). README cam kết không gửi hóa đơn hay dữ liệu cá nhân cho Gemini (`apps/api/README.md:137-139`). **Hiện không có LLM nào trong đường OCR.** Khóa thật nằm trong `apps/api/.env` (đã bị `.gitignore:10` bỏ qua, không bị đưa vào Git).

## 3. Kết quả đo (bảng)

### 3.1. Điều kiện đo và giới hạn

- Đầu ra ML Kit thật của lần chạy 06/11 (`.artifacts/ocr-device-20261106/`) **đã bị xóa** khi dọn thư mục; thư mục ứng dụng QA trên Redmi cũng trống và không đọc được (`run-as` báo gói không gỡ lỗi được). PaddleOCR chưa được cài trên máy, Docker không chạy. Theo yêu cầu, không cài gói lớn và không chạy lại bộ 40 ảnh trên điện thoại.
- Vì vậy dùng **bộ nhận dạng chữ có sẵn của Windows** (`Windows.Media.Ocr`, chỉ có ngôn ngữ `en-US`) làm **bộ thay thế**: nó trả dòng, từng từ và khung giống cấu trúc ML Kit, và cũng tách cột tên và cột giá thành các dòng riêng như ML Kit. Chất lượng chữ kém hơn ML Kit rõ rệt (mất dấu, đọc sai số trên ảnh nhỏ), nên **chỉ so sánh tương đối** giữa các cách ghép hàng trên cùng đầu ra, không coi là độ chính xác của ML Kit.
- Ba cách đưa dữ liệu vào bộ phân tích thật (`parseReceiptLines`, không sửa mã): A = dòng nguyên trạng; B = tách thêm ở khoảng trống lớn (giống block ML Kit); C = **nguyên mẫu tái dựng hàng theo hình học** (nắn theo góc toàn ảnh, gom từ theo trục dọc, chia ô theo khoảng trống, gán vai trò cột bằng phép nhân `SL × đơn giá = thành tiền` hoặc trừ chiết khấu, gộp dòng chỉ có chữ với dòng chỉ có số ngay bên dưới).
- Mã đo: `.artifacts/ocr-research-20261118/eval-harness.mts`; kết quả: `eval-results.json`, `eval-summary.txt`; nhãn: `ground-truth.json`; thí nghiệm có kiểm soát: `layout-experiments.mts`, `layout-experiments.txt`. Bộ kiểm thử OCR hiện có vẫn đạt: `node --import tsx --test "src/core/ocr/*.test.ts"` → 258/258.

### 3.2. Cách chọn 8 ảnh lập nhãn chuẩn

Chọn theo **đa dạng tên tệp và bố cục**, không theo kết quả: cả 3 ảnh chụp điện thoại `1793265…jpg` có kích thước lớn mà còn đọc được (`…230636` siêu thị nhiều dòng, `…184937` cửa hàng tiện lợi), 1 ảnh chụp 1920×2560 bị cong (`edit-z555…webp`), 3 ảnh kích thước trung bình đại diện ba kiểu bố cục (bảng có tiêu đề `bil-thanh-toán.jpg`; tên trên – số dưới `hoa-don-ban-hang…sapo…webp`; tiêu đề cột đảo thứ tự `hoadon-310823…jpg`), và 2 ảnh thu nhỏ đại diện nhóm `OIP`/`download` (lấy ảnh lớn nhất mỗi nhóm: `OIP (26).webp` 239×427, `download (1).webp` 270×464). Tổng 39 dòng hàng có nhãn, 35 dòng có thành tiền đọc được trên giấy (ảnh `download (1)` bị cắt mất cột thành tiền).

### 3.3. Kết quả trên 8 ảnh có nhãn

| Ảnh (bố cục) | Kích thước, chiều cao chữ | Dòng thật | Số thành tiền có trong chữ OCR | A: dòng đúng / trả về | C: dòng đúng / trả về | Tổng đúng A / C |
|---|---|---:|---:|---:|---:|---|
| `…230636` siêu thị, tên trên – số dưới, 2 tầng tiêu đề | 1074×2340, 21 px | 18 | 15/17 | 1 / 2 | 13 / 14 | không / không |
| `…184937` tiện lợi, SL đầu dòng | 1074×2340, 21 px | 3 | 0/3 | 0 / 0 | 0 / 0 | không / không |
| `edit-z555…` ảnh cong | 1920×2560, 56 px | 1 | 1/1 | 1 / 1 | 1 / 1 | không / không |
| `bil-thanh-toán` bảng 4 cột | 455×607, 14 px | 4 | 4/4 | 0 / 0 | 4 / 5 | không / không |
| `…sapo…` tên trên – số dưới | 720×960, 15 px | 1 | 1/1 | 0 / 0 | 1 / 1 | có / có |
| `hoadon-310823` tiêu đề đảo | 800×938, 23 px | 1 | 1/1 | 0 / 1 (*) | 0 / 1 (*) | không / không |
| `OIP (26)` thu nhỏ, có chiết khấu | 239×427, 8 px | 7 | 1/7 | 0 / 1 | 1 / 3 | không / có |
| `download (1)` thu nhỏ, cột bị cắt | 270×464, 9 px | 4 | 0/0 | 0 / 0 | 0 / 0 | — |
| **Cộng** | | **39 (35 chấm được)** | **23/34** | **2 / 5** | **20 / 25** | **1 / 2** trên 7 |

(*) Dòng duy nhất trả về là nhãn tổng bị đọc sai ("Tbng tibn") bị nhận nhầm thành sản phẩm; đã tính là sai.

Tổng hợp cả 40 ảnh (không nhãn): cách A trả 6 dòng ở 5 ảnh; cách C trả 34 dòng ở 12 ảnh. Cách B giống hệt A, chứng tỏ bộ thay thế đã tách cột giống ML Kit.

### 3.4. Thí nghiệm có kiểm soát trên bộ phân tích thật

Dữ liệu dựng theo đúng hình dạng ML Kit (mỗi cột là một dòng có khung riêng), không lấy từ ảnh thật:

| Tình huống | Dòng trả về / dòng thật |
|---|---|
| E1a: 2 cột tên – thành tiền, có nhãn "Tổng" | 3/3 |
| E1b: như trên nhưng OCR đọc "Tổng" thành "T6ng" | **0/3** |
| E1c: như trên nhưng mất dòng tổng (ảnh cắt) | **0/3** |
| E2: giá lệch dọc 30–70% chiều cao dòng | 3/3 |
| E2: giá lệch dọc ≥90% chiều cao dòng | 2/3, **ghép sai giá của dòng trước** |
| E2: giấy cong, lệch tăng dần 8 px mỗi dòng | 2/3, **ghép sai** |
| E3a–c: bảng 4 cột có tiêu đề (kể cả thiếu hoặc đọc sai "Đơn giá") | 3/3 |
| E3d: bảng 4 cột **không có tiêu đề** | **0/3** |
| E4a, b, d: tên trên – số dưới, có tiêu đề SL + Thành tiền | 3/3 |
| E4c: tên trên – số dưới, **không có tiêu đề** | **0/3** |
| E5: kiểu cửa hàng tiện lợi, "1 Nước Coca-Cola Ít Đường" | 2/3, mất dòng có chữ "Đường" |
| E6: tên và giá cùng một dòng ML Kit | 2/2 |

## 4. Nguyên nhân (có bằng chứng)

Xếp theo mức đóng góp ước tính vào việc "có tổng mà không có dòng hàng":

1. **Tên và giá về thành các dòng riêng, mà việc ghép lại phụ thuộc mỏ neo.** ML Kit (và bộ thay thế) trả cột tên và cột số thành các khối khác nhau; bộ trích dòng hàng chỉ nhận giá ở cuối cùng dòng (`receipt-parser.ts:86-89`). Các bộ ghép chỉ chạy khi có đủ tiêu đề (`receipt-table-layout.ts:110`, `receipt-pos-rows.ts:12-15`) hoặc khi nhận ra dòng tổng kết (`receipt-unheaded-rows.ts:14-15`). Bằng chứng: E1b, E1c, E3d, E4c đều về 0; ảnh `bil-thanh-toán` có đủ 4/4 số trong chữ OCR nhưng cách A trả 0 dòng vì tiêu đề "Giá" bị đọc thành "Gii", mất "T tiền", và "Tổng" bị đọc thành "T6ng". Khi tái dựng hàng (C), cùng dữ liệu cho 4/4.
2. **Bố cục "tên ở trên, SL – đơn giá – thành tiền ở dưới" không có lối xử lý khi thiếu tiêu đề.** Lối xếp chồng không tiêu đề chỉ nhận dòng dưới có dấu nhân `q x đơn giá` (`receipt-unheaded-rows.ts:21`), trong khi phần lớn máy POS Việt (Bách Hóa Xanh, Sapo, WinMart, Thế Giới Di Động) in số lượng, đơn giá, thành tiền thành các cột rời. Bằng chứng: E4c = 0; ảnh siêu thị 18 dòng: A lấy 1, C lấy 13.
3. **Quy tắc "đúng một số bên phải" loại bỏ mọi hàng có từ hai cột số trở lên.** `receipt-unheaded-rows.ts:39-41` yêu cầu `right.length===1`; hàng có cả đơn giá và thành tiền (hoặc SL, chiết khấu) bị coi là mơ hồ và bỏ qua. Bằng chứng: E3d.
4. **Không bù nghiêng/cong khi ghép dòng hàng.** Tổng tiền có bù góc (`receipt-parser.ts:152-156`), còn ghép dòng hàng chỉ dùng chồng lấn dọc thô ≥30% (`receipt-unheaded-rows.ts:40`). Ảnh chụp tay có giấy cong (cả ba ảnh `1793265…` đều cầm tay, có nếp gấp). Bằng chứng E2: lệch ≥90% chiều cao dòng thì **ghép nhầm giá của dòng trên** — đây là lỗi sai dữ liệu, nặng hơn bỏ sót. Với nguyên mẫu C nắn theo một góc chung cho cả ảnh, tổng của ảnh cong `edit-z555` đọc được hay không tùy chiều nắn (đổi chiều thì mất tổng, còn ảnh siêu thị lại thêm 3 dòng giả), nên cần bù theo từng vùng, không chỉ một góc.
5. **Chất lượng ảnh đầu vào giới hạn trần.** 31/40 ảnh trong `Bill/` là ảnh thu nhỏ rộng ≤300 px; chiều cao chữ trung vị khoảng 8 px; 7 ảnh không đọc được chữ nào bằng bộ thay thế. Tài liệu ML Kit khuyến nghị ký tự tối thiểu khoảng 16 px. Phóng ảnh 2× đã được thử và làm giảm tổng đúng 15→13 (`docs/migration/MOBILE_OCR_EXPANDED_20261028.md`, mục hiệu năng). Với nhóm này, bỏ sót dòng hàng chủ yếu do chữ không đọc được, không phải do bộ phân tích (ví dụ `OIP (26)`: chỉ 1/7 thành tiền xuất hiện trong chữ).
6. **Bộ lọc địa chỉ loại nhầm tên sản phẩm.** `receipt-semantics.ts:93` coi dòng bắt đầu bằng "Đường" hoặc dạng "số + … + đường/nguyễn/trần/lê/phạm/hoàng/quận/phường" là địa chỉ. Bằng chứng kiểm tra trực tiếp: "Đường mía Biên Hòa 32.000" và "1 Nước Coca-Cola Ít Đường" đều bị `isReceiptMetadata` trả `true`; E5 mất dòng Coca-Cola. Sản phẩm đường, nước ít đường, trà "Hoàng …", lê… đều có thể bị loại.
7. **Đường máy chủ bỏ tọa độ quá dễ.** PaddleOCR trả mỗi ô chữ riêng; `server-result.ts:47` chỉ dùng tọa độ khi khớp tuyệt đối với `rawText`, lại thêm giới hạn 160 dòng (`contract.py:41`, `server-result.ts:36`). Hóa đơn siêu thị dài vượt 160 ô sẽ rơi về phân tích văn bản thuần, khi đó tên và giá luôn rời nhau. Ngoài ra lối máy chủ chỉ mở khi kết quả trên máy đã đạt cổng (`capture/index.tsx:283`), nên không cứu được ảnh mà máy không đọc nổi.
8. **Nhãn tổng bị đọc sai biến thành sản phẩm giả.** Khi chữ "Tổng" bị đọc sai ("T6ng", "Tbng tibn"), dòng tổng không bị nhận là tổng kết và trở thành sản phẩm (ảnh `hoadon-310823`, `bil-thanh-toán` ở cách C). Đây là rủi ro sẽ tăng nếu nới lỏng ghép hàng mà không so khớp mờ các nhãn tổng.

Các giả thuyết đã kiểm và **không phải** nguyên nhân chính:
- Cổng cho phép xem lại không làm mất dòng khi đã có tổng và tên cửa hàng (`receipt-eligibility.ts:51`); nó chỉ loại cả hóa đơn khi thiếu tổng hoặc thiếu tên cửa hàng mà dòng hàng không khớp tổng.
- Không có bước nào bỏ dòng hàng chỉ vì tổng các dòng lệch tổng phải trả; lệch chỉ dẫn tới cảnh báo hoặc không chạy cắt vùng bảng (`receipt-scan-session.ts:75-77`).
- Tên nhiều dòng (ví dụ "Chai 1.5L" ở dòng dưới) làm tên thiếu phần sau nhưng không làm mất dòng.

## 5. Phương án xếp hạng

| Hạng | Phương án | Tác động dự kiến | Công sức | Độ trễ | Quyền riêng tư |
|---|---|---|---|---|---|
| 0 | **Khôi phục bộ đo**: lưu đầu ra ML Kit thật của 40 ảnh (kèm SHA-256) vào thư mục bằng chứng bền, đưa công cụ chạy lại vào `apps/mobile/scripts` hoặc thư mục kiểm thử, lập nhãn dòng hàng cho mọi ảnh còn đọc được, bổ sung ảnh chụp điện thoại thật | Điều kiện để đo mọi thay đổi khác; hiện không có mốc dòng hàng tin cậy | 1–2 ngày (1 lượt Redmi 7 bằng bản QA chế độ chạy bộ ảnh) | Không | Ảnh và đầu ra chỉ nằm trong `.artifacts/` |
| 1 | **Tái dựng hàng theo hình học trên máy** (mô-đun mới, ví dụ `receipt-row-geometry.ts`): dùng `elements` của ML Kit, bù nghiêng cục bộ theo `angle` từng dòng, gom theo chồng lấn dọc thích nghi, chia ô theo khoảng trống, gán vai trò cột bằng phép tính (`SL × đơn giá = thành tiền`, trừ chiết khấu), gộp "dòng chữ + dòng số bên dưới", nối tên nhiều dòng. Chạy **song song** như một ứng viên; giữ nguyên logic tổng trên dòng gốc; chọn ứng viên có số học nhất quán hơn | Trên bộ thay thế: dòng đúng **2 → 20 / 35**; giải quyết nguyên nhân 1–4 | 3–5 ngày kèm kiểm thử | Vài mili giây JS, không thêm lần đọc ảnh | Hoàn toàn trên máy |
| 2 | **Sửa nhanh quy tắc hiện có**: (a) thu hẹp bộ lọc địa chỉ (chỉ coi là địa chỉ khi nằm trước vùng hàng và không có giá ở cuối); (b) khi không thấy dòng tổng kết, lấy mỏ neo là nhãn tổng mờ hoặc vùng 25% cuối; (c) cho phép nhiều số bên phải: lấy số ngoài cùng làm thành tiền, chỉ nhận SL/đơn giá khi phép nhân khớp | Gỡ E1b, E1c, E3d, E5; rủi ro thấp | 1–2 ngày | Không đáng kể | Trên máy |
| 3 | **So khớp mờ nhãn tổng và tiêu đề cột** (khoảng cách chỉnh sửa trên chữ đã bỏ dấu) để "T6ng", "Tbng", "Gii", "T.Tiån" vẫn được nhận ra | Giảm sản phẩm giả (nguyên nhân 8), giúp mỏ neo ổn định | 1 ngày | Không đáng kể | Trên máy |
| 4 | **Đường máy chủ dùng tọa độ PaddleOCR**: giữ tọa độ cho các dòng có khung kể cả khi thiếu vài dòng, nâng giới hạn 160 dòng, đo A/B `OCR_DOC_UNWARPING`/`OCR_DOC_ORIENTATION`, chạy cùng bộ tái dựng hàng; cho phép gửi máy chủ (có hỏi đồng ý) cả khi máy không đạt cổng | Cứu hóa đơn dài và ảnh mà ML Kit đọc kém | 2–3 ngày (mobile + Python + kiểm thử hợp đồng) | +5–30 giây hàng đợi | Ảnh lên vùng riêng tư; đã có hộp thoại đồng ý |
| 5 | **Hướng dẫn chụp**: khi chiều cao chữ trung vị < 16 px hoặc ảnh quá nhỏ, báo "chụp gần hơn/đủ sáng" thay vì cố phân tích | Giảm kỳ vọng sai với ảnh thu nhỏ; không tăng độ phủ trên ảnh xấu | 0,5–1 ngày | Không | Trên máy |
| 6 | **Tùy chọn trích xuất có cấu trúc bằng mô hình ngôn ngữ thị giác** (ví dụ Gemini đã có hạ tầng) chỉ khi người dùng bật và đồng ý riêng: trả JSON theo lược đồ cố định, máy kiểm lại số học, đánh dấu cần xem lại, không tự lưu | Tiềm năng cao nhất trên ảnh xấu, bố cục lạ | 1 tuần+ (đồng ý, hạn mức gói, cập nhật mục An toàn dữ liệu trên Play, chính sách lưu giữ) | 2–6 giây mỗi ảnh + chi phí theo lượt | **Ảnh hóa đơn ra bên thứ ba**; trái cam kết hiện tại trong README nên cần quyết định của chủ dự án |

Không đề xuất: phóng ảnh trên toàn bộ ảnh nhỏ (đã đo làm giảm tổng đúng), quy tắc theo tên cửa hàng, hay suy tổng phải trả từ tổng các dòng.

## 6. Kế hoạch thực hiện theo đợt + cách đo nghiệm thu

Chỉ số chung cho mọi đợt (đo trên đầu ra native đã lưu, cùng SHA-256 ảnh và cùng phiên bản engine): tổng đúng/sai/thiếu; độ chính xác và độ phủ dòng hàng (khớp theo thành tiền và tên đã bỏ dấu, khoảng cách ≤ 0,35); số **dòng ghép sai giá** (phải bằng 0); số dòng metadata bị nhận thành sản phẩm; tỉ lệ đạt cổng; thời gian phân tích p50/p95 trên Redmi 7.

| Đợt | Việc | Nghiệm thu |
|---|---|---|
| 0 | Chạy 40 ảnh `Bill/` trên Redmi 7 bằng gói `com.picket.mobile.bugqa` (không đụng `com.picket.mobile`), lưu đầu ra native vào `.artifacts/ocr-native-<ngày>/` kèm SHA-256; đưa công cụ chạy lại offline và tệp nhãn (không chứa ảnh) vào kho; lập nhãn dòng hàng cho các ảnh đọc được (mỗi lượt xem ≤ 5 ảnh); thêm ≥ 20 ảnh chụp điện thoại thật có sự đồng ý | Có bảng mốc dòng hàng tái lập được; đối chiếu với mốc 06/11 (độ phủ 20,7%, độ chính xác 75,8%, tổng 25/0/11) |
| 1 | Sửa nhanh 2a–2c và phương án 3, mỗi quy tắc có kiểm thử tổng hợp (dựa trên E1b, E1c, E3d, E5) và ca âm (địa chỉ thật vẫn bị loại) | Bộ kiểm thử OCR đạt; tổng không kém mốc (sai = 0, đúng ≥ 25); độ phủ dòng tăng; độ chính xác ≥ 75%; metadata giả = 0 |
| 2 | Mô-đun tái dựng hàng theo hình học, chạy như ứng viên song song; kiểm thử nghiêng/cong (E2), xếp chồng (E4c), nhiều cột số, chiết khấu, hàng tặng giá 0, tên nhiều dòng | Độ phủ dòng ≥ 50% trên nhóm ảnh chụp đọc được; ghép sai giá = 0; tổng không hồi quy; p95 phân tích < 20 ms trên Redmi 7; tổng thời gian phiên vẫn ≤ 20 giây |
| 3 | Đường máy chủ: giữ tọa độ một phần, nâng giới hạn dòng, đo A/B nắn ảnh, mở lối gửi máy chủ khi máy không đạt cổng (vẫn hỏi đồng ý) | Trên cùng bộ ảnh, đường máy chủ không kém đường máy về tổng; độ phủ dòng của hóa đơn dài tăng; kiểm thử hợp đồng `services/ocr-provider/tests` và `apps/api/test` đạt |
| 4 (tùy chọn) | Thiết kế tính năng mô hình ngôn ngữ thị giác: màn đồng ý riêng, hạn mức theo gói, lược đồ JSON, kiểm số học, nhật ký không lưu ảnh | Chỉ làm khi chủ dự án duyệt; so trên cùng bộ ảnh với đợt 2–3; cập nhật An toàn dữ liệu trước khi phát hành |

## 7. Rủi ro

- **Ghép sai nguy hiểm hơn bỏ sót**: nới lỏng ghép hàng có thể gán giá của dòng này cho dòng khác (E2). Bắt buộc ưu tiên phép tính khớp, hạ `confidence` khi suy diễn, và đo riêng số dòng ghép sai.
- **Sản phẩm giả từ nhãn tổng đọc sai** (nguyên nhân 8) và từ dòng tiền khách đưa, tiền thừa, phí giao hàng; phải giữ nguyên các bộ lọc hiện có và thêm so khớp mờ trước khi nới lỏng.
- **Hồi quy tổng tiền**: kết quả tổng của ảnh cong trong nguyên mẫu C thay đổi theo chiều nắn bằng một góc chung; vì vậy tái dựng hàng chỉ dùng cho dòng hàng, logic tổng giữ trên dòng gốc.
- **Học vẹt theo bộ ảnh**: `Bill/` có 2 cặp ảnh trùng (`OIP`/`OIP (2)`, `OIP (11)`/`OIP (20)`) và 31/40 ảnh thu nhỏ, không đại diện ảnh chụp thật; cần tập ảnh chụp mới và tách tập phát triển/tập kiểm.
- **Số đo trong tài liệu này dùng bộ thay thế Windows `en-US`**, không phải ML Kit; chỉ có giá trị so sánh tương đối. Phải đo lại bằng đầu ra ML Kit thật ở đợt 0 trước khi kết luận.
- **Hiệu năng Redmi 7**: tái dựng hàng xử lý tới 1600 từ; cần giới hạn độ phức tạp và đo p95 trên máy thật.
- **Quyền riêng tư và pháp lý** nếu dùng mô hình ngôn ngữ ngoài: trái cam kết hiện tại, cần đồng ý rõ, cập nhật chính sách và mục An toàn dữ liệu trên Google Play.
- **Mất bằng chứng**: đầu ra native ngày 06/11 đã bị xóa khi dọn dẹp; quy trình dọn `.artifacts/` cần chừa thư mục bằng chứng OCR.
