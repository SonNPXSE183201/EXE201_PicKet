# Nghiên cứu cải thiện OCR hóa đơn (13/11/2026)

## Hiện trạng
- Trên máy: ML Kit (Latin) + `receipt-parser` trong `apps/mobile/src/core/ocr`.
- Dự phòng cloud: `services/ocr-provider` chạy PaddleOCR 3.7 với `PP-OCRv5_mobile_det` + `latin_PP-OCRv5_mobile_rec`, CPU, tắt xoay/nắn ảnh.

## PaddleOCR (đã xác minh một phần)
- Trang đa ngôn ngữ của PP-OCRv5 liệt kê tiếng Việt thuộc họ Latin, nên `latin_PP-OCRv5_mobile_rec` là model đúng cho tiếng Việt: https://www.paddleocr.ai/latest/en/version3.x/algorithm/PP-OCRv5/PP-OCRv5_multi_languages.html
- Chưa thấy bản `latin_..._server_rec`. Bản server chỉ có cho model chung (`PP-OCRv5_server_rec`, ~81 MB so với ~16 MB), nhưng model chung không tối ưu cho dấu tiếng Việt, **chưa nên đổi** nếu chưa đo.
- Đòn bẩy rẻ nhất: bật `use_doc_orientation_classify` / `use_doc_unwarping` cho ảnh chụp nghiêng, nhăn, cong. Đổi bằng biến môi trường (đã thêm): `OCR_DOC_ORIENTATION`, `OCR_DOC_UNWARPING`, `OCR_TEXTLINE_ORIENTATION`, `OCR_DET_MODEL`, `OCR_REC_MODEL`. Mặc định giữ nguyên hành vi cũ.

## VietOCR (chưa xác minh)
Phiên tìm kiếm không trả về tài liệu VietOCR, nên các điểm sau là **giả thuyết cần kiểm chứng**:
- VietOCR chỉ là bộ nhận dạng dòng chữ; cần giữ bộ phát hiện của PaddleOCR rồi cắt từng dòng để nhận dạng lại.
- Chỉ nên chạy lần hai cho dòng có độ tin cậy thấp hoặc dòng chứa số tiền/tên cửa hàng, để không vượt ngân sách 20 giây và CPU hiện tại.
- Thêm phụ thuộc PyTorch làm image Docker nặng hơn đáng kể.

## Cách đánh giá (theo `.agents/skills/picket-ocr-testing`)
1. Chạy corpus `Bill/` (40 ảnh) với cấu hình hiện tại làm mốc.
2. Thử lần lượt: bật nắn ảnh; bật xoay; (sau cùng) re-recognition bằng VietOCR.
3. So sánh Tổng phải trả, merchant, ngày, dòng hàng và thời gian. Không hardcode theo ảnh mẫu; không được làm giảm điểm trên bộ regression hiện có.
