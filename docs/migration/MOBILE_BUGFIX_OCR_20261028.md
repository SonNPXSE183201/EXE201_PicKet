# Mobile — sửa lỗi giao diện và OCR ngày 28/10/2026

## Phạm vi và trạng thái

Đối chiếu 12 ảnh tham chiếu trong `Bug/` và kiểm tra 36 ảnh trong `Bill/`. Ảnh chỉ dùng để kiểm tra, không đưa vào APK phát hành. Đã build bản ARM64 1.0.11/code 24 và kiểm thử trên Redmi 7. Bản QA có package riêng `com.picket.mobile.bugqa` (Picket QA); app Google Play code 22 vẫn được giữ nguyên vì khác chứng thư ký. Không thay migration Supabase trong lượt này. APK mới đã phát hành lên landing; AAB đã cập nhật Google Play Internal và đọc lại completed.

| Phản hồi | Thay đổi |
| --- | --- |
| Chi tiêu mở camera | Tab luôn điều hướng tới lịch sử; không đọc capture journal để tự chuyển camera. Giữ nguyên bản nháp và luồng phục hồi ở Chụp. Bỏ hitSlop lớn cạnh tab để tránh chạm nhầm. |
| Chuyển tiền nhập quá nhiều | Mặc định chọn ví nguồn/đích hợp lệ cùng tiền tệ; chỉ cần nhập số tiền. Nội dung có mặc định, ghi chú thu gọn và không bắt buộc; có đổi chiều ví. Chặn gửi lặp trong cùng frame. |
| Hồ sơ chưa đồng bộ | Header peach, nhóm menu gọn, tùy chọn lilac và khoảng cách rõ; dùng token Paper/dashboard, không thêm design document riêng. |
| Không thêm tiền vào ví | Thêm hành động ở chi tiết ví, mở khoản thu với đúng ví và nội dung điền sẵn. Không sửa opening balance; giữ lịch sử tài chính. |
| Hoa che ẩn/hiện số dư | Thu nhỏ và đặt minh họa thấp hơn; control có nền/viền riêng để dễ nhìn ở sáng/tối. |
| Xóa tài khoản thiếu viền | Thêm viền danger, bo góc và chiều cao theo control chung. |
| Popup đăng xuất hệ thống | Thay Alert bằng ActionSheet của ứng dụng, giữ kiểm pending/conflict và owner trước khi xác nhận; Hủy bên trái và Thoát/Đăng xuất bên phải, cùng hàng, hai cột bằng nhau, gap 12 dp. Hủy không đăng xuất, lỗi không xóa dữ liệu. |
| Sửa giao dịch | Nhóm trường có nhãn vào card Paper peach; giữ kiểm phiên bản, offline queue, xóa mềm và các hành động chia/hoàn tiền. |
| Chi tiết trong ảnh | Khoảng cách thẻ thông báo, nút nhập thủ công tương phản rõ, amount input chỉ có một khung, hiệu ứng nhấn được giới hạn trong góc bo. Bỏ brand nhỏ lặp ở header Nhà. |

## OCR: nghiên cứu và lựa chọn

Mở rộng pipeline ML Kit/Paddle hiện có, không đổi engine, không thêm dịch vụ trả phí hoặc upload ảnh riêng tư ra dịch vụ nghiên cứu.

- **Định dạng tiền:** kiểm nguyên token và grouping, không xóa mọi separator rồi nối số. Ca `Tổng thanh toán 100.000 90.000` trước đây thành `10.000.090.000` mà không cảnh báo; nay không suy ra tổng từ token mơ hồ. Giữ chính sách số nguyên tiền tệ hiện hành, không tự đổi sang hỗ trợ cents đa tiền tệ.
- **Tổng mâu thuẫn:** ứng viên tổng mạnh khác nhau ở mức tương đương bắt buộc review; điểm heuristic không được coi là xác suất chính xác.
- **Hóa đơn nhiều cột:** adapter cloud dùng polygon/confidence khi toàn bộ dòng có geometry hợp lệ, giới hạn số dòng/tọa độ; fallback toàn bộ raw text nếu thiếu/sai, không bỏ âm thầm dòng. Dòng tổng đã nối được giữ lại để reparse sau restart.
- **Đọc lại vùng tổng:** mở retry giới hạn cho nhãn tổng POS/Grand total/Amount due đã quan sát; không đoán vị trí chỉ từ số điện thoại hoặc phương thức thanh toán. Giữ budget 20 giây và giới hạn retry hiện hành.
- **Ảnh cloud:** kiểm pixel limit trước decode, EXIF transpose trước RGB→BGR, không re-encode lossy. Native đã có pipeline hướng ảnh riêng.

Nguồn primary: [ML Kit input guidelines](https://developers.google.com/ml-kit/vision/text-recognition/v2/android), [PaddleOCR pipeline](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html), [Pillow EXIF transpose](https://pillow.readthedocs.io/en/stable/reference/ImageOps.html#PIL.ImageOps.exif_transpose). Không nâng Paddle/model ngầm theo default của tài liệu mới.

## Kiểm chứng trên Redmi 7

- Thiết bị thật Redmi 7 ARM64, serial kết thúc `bc71`; cài release QA độc lập, không cần Metro. Giữ nguyên app Play và dữ liệu của app đó.
- Mobile: **935/935 tests đạt**, lint và typecheck đạt. Test chuyển tiền chạy component thật: một input mặc định, cặp ví hợp lệ, đổi chiều và chống gửi lặp.
- Provider: **6 unit tests đạt** cho EXIF, BGR, pixel limit, ảnh lỗi và contract. Đây không phải Paddle inference; thay đổi provider chưa được deploy.
- Android production ARM64 và QA release build đạt. APK được giữ tại `.artifacts/releases/`; kiểm thử corpus dùng APK instrumentation riêng, không đóng gói Bill vào release.
- UI thật: Chi tiêu mở lịch sử; thêm thu 50.000 vào ví qua hành động mới; sửa thành 60.000; chuyển 10.000 sang ví thứ hai chỉ cần số tiền. Kết quả 50.000/10.000, tổng 60.000 không đổi sau chuyển tiền.
- Đã xem hồ sơ và popup sáng/tối trên Redmi: **Hủy và Thoát cùng hàng**, khoảng cách 12 dp, không dính nhau. Hủy giữ phiên guest. Dashboard có control ẩn/hiện số dư riêng, không bị hoa che.
- Luồng OCR chọn ảnh từ thư viện đã nhận tổng 54.000 và ngày 18/02/2019. Một lượt full UI đo được 1.330 ms (native 987 ms); không dùng số này như p95.
- Cài lại bản QA cuối, số dư 60.000 được giữ nguyên. Quét lại hóa đơn 54.000 xác nhận không còn số điện thoại/số hóa đơn trong danh sách sản phẩm. Ảnh này hiện chưa đọc được các dòng sản phẩm; UI thông báo rõ, không bịa chi tiết.
- Đã tắt lại quyền cài ứng dụng không rõ nguồn cho File Manager (`REQUEST_INSTALL_PACKAGES: deny`) và gỡ app instrumentation chứa corpus sau khi lưu kết quả. Picket QA được giữ trên máy để xem lại.

Ảnh và log: `.artifacts/mobile-bugs-20261028/`; mở `index.html` để xem gallery. Dữ liệu ví trong gallery là dữ liệu QA tổng hợp. Ảnh hóa đơn giữ cục bộ.

## Benchmark OCR với Bill/

Chạy direction/full-read ML Kit thật trên Redmi cho **36/36 ảnh, không có lỗi thực thi**. Áp parser hiện tại vào kết quả native, đối chiếu tổng tiền được đọc thủ công bởi một người. Ground truth chưa được reviewer độc lập kiểm tra lần hai.

| Nhóm 22 hóa đơn VND đủ rõ và không trùng | Trước sửa | Sau sửa |
| --- | ---: | ---: |
| Tổng tiền chính xác | 12 | 15 |
| Tổng sai, có cờ kiểm tra | 1 | 1 |
| Chưa lấy được tổng | 9 | 6 |

14 ảnh còn lại gồm ảnh cắt mất tổng, mờ khó đọc, trùng, hóa đơn mẫu hoặc tiền tệ khác; không đưa vào tỷ lệ VND. Có 32/36 ảnh rộng dưới 500 px. p50 852 ms, p95 1.188 ms là direction + full-read native, **không phải toàn bộ pipeline UI/crop/cloud**.

Sửa parser gồm: nối dòng tổng nghiêng vừa phải theo geometry; loại số lượng khỏi nhãn total; loại ký hiệu VAT khỏi nhãn trước phân tích; chỉ lấy dòng số thuần khi tìm dòng tổng lân cận; không nhận số điện thoại/số hóa đơn thành sản phẩm. Không hardcode số tiền hoặc tên file trong source.

Thử upscale ảnh cho kết quả thấp hơn (11 đúng, 5 sai, 6 thiếu), vì vậy **không bật upscale trong production**. Raw output, ground truth và bảng từng hóa đơn nằm trong thư mục artifact, gồm `redmi-native-corpus-v2.json`, `bill-ground-truth.json`, `redmi-benchmark-final.json`.

## Giới hạn và phát hành

Còn 6/22 hóa đơn chưa lấy được tổng và 1/22 sai có cảnh báo. Không thể tuyên bố đọc chính xác mọi hóa đơn. OCR chỉ đề xuất dữ liệu; người dùng phải kiểm tra trước khi lưu. Các ảnh thiếu thông tin cần chụp lại hoặc nhập thủ công.

Bản QA code 24 tách biệt với app Play code 22 do khác khóa ký. APK production code 24 đã lên landing; AAB code 24 đã lên Google Play Internal. Production track vẫn chưa phát hành công khai. Bản sửa cloud provider cần triển khai service riêng trước khi có hiệu lực trên server.

## Phát hành theo yêu cầu tiếp theo

- Landing `https://picketfinance.com`: APK **1.0.11/code 24**, 82.830.508 bytes, SHA-256 `f5e447b330221df00317c84e1863e99fd28bbc0d7a35b3676ae6e1a999b32a6c`. Public browser fetch xác nhận toàn bộ bytes/hash, HTML và release.json khớp; HTTP Range trả 206/1.024 bytes đúng. 13 landing tests đạt.
- Google Play **Internal completed**: AAB **1.0.11/code 24**, 80.924.217 bytes, SHA-256 `80387c25bb7c5f7ff09f1015de862397a90f495f395fe9694be00be47ac9be61`. Đã upload, validate, commit và đọc lại bằng edit mới. Alpha/beta/production giữ nguyên.
- AAB có ARM64 + x86_64, chữ ký upload đúng, không có REQUEST_INSTALL_PACKAGES/SYSTEM_ALERT_WINDOW; không chứa corpus Bill/instrumentation. Ba kiểm tra update channel đạt. App Play nhận cập nhật theo phân phối của Google, chưa xác nhận lượt cài Play code 24 trên thiết bị ở bước này.
- Script landing nhận diện thêm CSP hiện có `connect-src 'self'`; giữ nguyên chính sách. Lần deploy đầu rollback vì CSP chưa được script nhận diện; lần sau thành công, protected web/API/OCR containers không restart. Rollback backup: `/opt/picket/deploy/backups/landing-20261028T124248528831Z/before`.
- Bằng chứng: `release24-aab-verification.json`, `release24-play-deploy.json`, `release24-play-readback.json`, `landing-release24-public-check.json`, log build/deploy trong `.artifacts/mobile-bugs-20261028/`.
