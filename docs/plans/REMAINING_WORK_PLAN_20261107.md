# Kế hoạch hoàn thành toàn bộ việc còn lại — 07/11/2026

Nhánh `merge/mobile-figma`: toàn bộ thay đổi **chưa lưu phiên bản, chưa đẩy lên GitHub**. Các kế hoạch trước:
- `MOBILE_FIGMA_MERGE_PLAN_20261106.md`
- `MOBILE_COMPLETION_API_TEST_PLAN_20261106.md`
- `MOBILE_UI_PERF_DEEP_TEST_PLAN_20261106.md`
- `../SERVER_FIX_DEPLOYMENT_20261107.md`

## 1. Nguyên tắc chọn người làm và model (tối ưu lượng dùng)

| Người làm | Model | Mức suy luận | Dùng cho |
|---|---|---|---|
| Codex CLI | `gpt-6.1-sol` | low | Việc máy móc: thêm bản dịch, sửa tài liệu, đổi tên, dọn mã thừa |
| Codex CLI | `gpt-6.1-sol` | medium | Tính năng nhỏ, sửa lỗi rõ nguyên nhân, viết kiểm thử |
| Codex CLI | `gpt-6.1-sol` | high | Thuật toán (OCR), rà soát mã toàn bộ bản gộp |
| Codex CLI | `gpt-6.1-sol` | xhigh | Chỉ khi một lỗi khó đã thử ở mức high mà chưa giải được |
| Claude | Haiku 5.5 | — | Quét file, tóm tắt nhật ký, kiểm tra bản dịch, dọn tệp tạo ra khi build |
| Claude | Sonnet 5.5 | — | Chạy kiểm thử trên Redmi 7, chạy lại bộ gọi thật lên máy chủ, sửa vừa phải |
| Claude | Opus 5.5 (phiên chính) | medium | Điều phối, rà soát bảo mật, quyết định triển khai, kiểm chứng kết quả của Codex và các tác tử khác, lưu phiên bản |

**Quy tắc chung:**
- **Điện thoại Redmi 7 là tài nguyên dùng chung:** mỗi lúc chỉ một người làm được dùng `adb`.
- **Việc trên máy chủ thật** (áp dụng thay đổi cơ sở dữ liệu, triển khai API hay hàm) **chỉ do bạn chạy hoặc bạn cấp quyền**. Không giao cho Codex để né quy tắc an toàn.
- Codex chỉ được sửa trong phạm vi ghi ở file nhiệm vụ; không lưu phiên bản, không đẩy lên GitHub. Phiên chính kiểm chứng lại mọi kết quả trước khi nhận.
- Không đụng kênh kiểm thử kín (closed testing) trên Google Play. Kiểm thử trên máy chỉ dùng gói `com.picket.mobile.bugqa`.

## 2. Danh sách việc còn lại

### Đợt 1: chốt bản gộp hiện tại (ưu tiên cao)

| # | Việc | Người làm · model · mức | Cần bạn | Tiêu chí xong |
|---|---|---|---|---|
| 1 | Triển khai 5 bản sửa lỗi máy chủ (cơ sở dữ liệu, hàm Google Play, API) | **Bạn** chạy `pwsh .artifacts/server-fix-20261107/deploy.ps1`, hoặc cấp quyền cho phiên chính | Có | Kiểm tra nhanh sau triển khai đạt |
| 2 | Chạy lại bộ gọi thật 73 chức năng sau triển khai (tài khoản kiểm thử dùng một lần, tự xoá) | Claude Sonnet 5.5 | Không | 5 lỗi cũ hết; không còn dữ liệu sót |
| 3 | Rà soát mã toàn bộ bản gộp chưa lưu (khoảng 200 file) tìm lỗi và lỗ hổng | Codex `codex review` · `gpt-6.1-sol` · high | Không | Danh sách lỗi đã được phiên chính xác minh |
| 4 | Sửa các lỗi rà soát tìm ra | Codex · medium (từng lỗi rõ ràng); lỗi bảo mật do phiên chính sửa | Không | Kiểm thử toàn dự án đạt |
| 5 | Chia bản gộp thành các lần lưu phiên bản hợp lý (gộp Figma, PayOS/G11, D5, hiệu năng, OCR, máy chủ) và lưu bằng tài khoản SonNPXSE183201 | Claude Opus 5.5 (phiên chính) | Bạn duyệt trước | Lịch sử sạch, **không đẩy lên GitHub** |

### Đợt 2: kiểm thử trên máy còn thiếu

| # | Việc | Người làm · model · mức | Cần bạn | Tiêu chí xong |
|---|---|---|---|---|
| 6 | Quét lại một hoá đơn đã lưu để xem bảng so sánh trùng | Bạn quét, Claude Sonnet 5.5 kiểm tra | Có (cầm hoá đơn) | Bảng hiện đúng 3 nút; Huỷ không tạo dữ liệu |
| 7 | Chụp lại hoá đơn GEARVN, xem có tách được sản phẩm không | Bạn chụp, Sonnet 5.5 đọc kết quả | Có | Có dòng "Chuột không dây…" hoặc ghi rõ lý do chưa tách |
| 8 | Quét chế độ tối và tiếng Anh trên mọi màn Figma (đã tìm thấy nhiều lỗi tương phản) | Claude Sonnet 5.5 (giữ điện thoại) | Không | Danh sách lỗi kèm ảnh chụp |
| 9 | Sửa lỗi tìm thấy ở mục 8 | Codex · low (màu, bản dịch) | Không | Chụp lại đạt |
| 10 | Màn Gói & thanh toán ở tài khoản gói Miễn phí (ô Plus/Pro, nút nâng cấp) | Sonnet 5.5, dùng tài khoản kiểm thử | Có (cho phép đăng xuất tài khoản thật khỏi bản QA) | Ảnh chụp đúng frame G11 |

### Đợt 3: OCR

| # | Việc | Người làm · model · mức | Cần bạn | Tiêu chí xong |
|---|---|---|---|---|
| 11 | Tách sản phẩm cho hoá đơn dạng bảng **có toạ độ** và hoá đơn chụp ngược (phần Codex chưa làm lần trước) | Codex · `gpt-6.1-sol` · high, chỉ sửa `apps/mobile/src/core/ocr/**` | Không | Kiểm thử OCR đạt; bộ 40 ảnh không ảnh nào kém đi |
| 12 | Chạy bộ 40 ảnh mẫu trên Redmi 7 bằng bản QA có bật chế độ chạy bộ ảnh | Claude Sonnet 5.5 (giữ điện thoại) | Không | Kết quả kèm SHA-256 từng ảnh |

### Đợt 4: tính năng còn thiếu so với Figma (cần bạn chọn làm cái nào)

| # | Việc | Người làm · model · mức | Ghi chú |
|---|---|---|---|
| 13 | "Lưu vào máy" lưu thẳng vào thư viện ảnh (hiện mở bảng chia sẻ) | Codex · medium | Thêm thư viện gốc `expo-media-library`, cần build lại phần gốc |
| 14 | Cỡ chữ và giảm chuyển động trong Cài đặt (lưu trên máy) | Codex · medium | Theo frame Figma |
| 15 | Đổi ảnh đại diện | Codex · medium (ứng dụng) + phiên chính (kho ảnh và quyền trên Supabase) | Cần thay đổi máy chủ, triển khai do bạn |
| 16 | Mã xác thực qua tin nhắn | Để sau | Chưa có nhà cung cấp tin nhắn |

### Đợt 5: phát hành và dọn dẹp

| # | Việc | Người làm · model · mức | Cần bạn |
|---|---|---|---|
| 17 | Duyệt và công bố đáp án bài học trên trang quản trị | Người phụ trách nội dung | Có |
| 18 | Cập nhật tài liệu trạng thái dự án và nhật ký thay đổi | Codex · low | Không |
| 19 | Dọn tệp tạo ra khi build, giữ đúng một bản cài QA | Claude Haiku 5.5 | Không |
| 20 | Tăng phiên bản, build bản phát hành, nộp lên **kiểm thử nội bộ** trên Google Play | Phiên chính | Có (bạn quyết định thời điểm) |

## 2b. Đã làm thêm (07/11/2026, 16:35)

| Lỗi bạn báo | Nguyên nhân | Đã sửa | Kiểm tra trên Redmi 7 |
|---|---|---|---|
| Mở app từ đầu vẫn hiện "Đang xác minh tài khoản" | Lúc khởi động chưa có kết quả xác minh trong bộ nhớ nên phải chờ máy chủ | Dùng kết quả xác minh đã lưu (còn hạn 24 giờ, đúng tài khoản) để vào ngay; vẫn xác minh ngầm, tài khoản bị thu hồi quyền vẫn đăng xuất | Không còn màn này |
| Màn "Picket đã khóa · Đang xác thực…" hiện dù đã tắt khoá ứng dụng | Khi chưa đọc xong cài đặt, phần khoá mặc định coi là đã khoá và vẽ luôn màn khoá | Trong lúc chờ đọc chỉ hiện nền trống; màn khoá chỉ hiện khi khoá thật sự bật | Không còn màn này |
| Chi tiết giao dịch vẫn mang tiêu đề màn hoá đơn cũ | Tiêu đề "Ảnh hoá đơn" khi giao dịch có hoá đơn | Luôn là "Chi tiết giao dịch" | Đạt |
| Sửa giao dịch không sửa được sản phẩm OCR; OCR không tách được thì không thêm được | Chế độ sửa chỉ có danh mục, nội dung, số tiền, ghi chú | Thêm phần "Sản phẩm trên hoá đơn": sửa tên, số lượng, đơn giá, thành tiền (tự tính), thêm hoặc xoá dòng, cảnh báo khi tổng khác số tiền; lưu xong ở lại màn D5. Bỏ lối sang màn hoá đơn cũ | Đã thêm "Razer Viper V3 Pro SE · 2.370.000 đ" cho hoá đơn GEARVN và lưu thành công |
| Hiệu năng khởi động và tải màn | 57 MB ảnh minh hoạ 2048 px; bản QA bật chế độ gỡ lỗi | Codex (`gpt-6.1-sol`, medium) thu nhỏ 31 ảnh: 59,1 MB → 1,7 MB. Bản QA mặc định tắt chế độ gỡ lỗi | Màn Nhà hiện đủ sau khoảng **2,1 giây** (trước khoảng 9 giây). Ví, Danh mục, Chi phí định kỳ, Hoá đơn hiện đủ trong 0,4 giây |

Kiểm thử: ứng dụng 1142/1142, kiểm tra kiểu và quy tắc mã sạch.

Ghi chú: bản QA giờ mặc định không gỡ lỗi được (`build.ps1`). Chỉ khi chạy bộ 40 ảnh OCR mới dùng `build-debuggable.ps1`.

## 3. Thứ tự chạy song song
1. **Ngay:**
   - Bạn: mục 1.
   - Codex: mục 3 (rà soát, chỉ đọc) và mục 11 (OCR, chỉ sửa thư mục OCR). Hai việc không đụng nhau.
   - Sonnet: mục 8 (giữ điện thoại).
2. **Sau mục 1:** Sonnet chạy mục 2.
3. **Sau mục 3 và 8:** Codex sửa (mục 4, 9) → phiên chính kiểm chứng và chạy kiểm thử toàn dự án.
4. **Sau mục 11:** Sonnet chạy mục 12 trên máy.
5. **Bạn duyệt** → phiên chính làm mục 5 (lưu phiên bản), rồi mục 19, 20.
6. Đợt 4 làm theo lựa chọn của bạn.

## 4. Ước tính lượng dùng
- Phần lớn công việc nặng (rà soát toàn bộ, OCR, sửa lỗi) giao cho Codex, nên tiết kiệm hạn mức Claude.
- Claude Sonnet chủ yếu thao tác điện thoại và chạy tập lệnh có sẵn; Haiku chỉ làm việc dọn dẹp.
- Phiên chính (Opus) chỉ điều phối, kiểm chứng và làm phần nhạy cảm (bảo mật, máy chủ, lưu phiên bản).
