# Google Play Internal và store listing — 31/10/2026

## Phát hành

- Package: `com.picket.mobile`; version `1.0.13`, version code `27`.
- AAB: `.artifacts/releases/picket-1.0.13-27-google-play.aab`, 80,959,883 bytes; SHA-256 `d01953b9cfcee15356d0bf234f9a388f8f7454227a0beb2ee7b7e48ea8480845`.
- Google Play Android Publisher API nhận bundle, validate và commit thành công. Đọc lại độc lập: Internal `completed`, code 27; Production không có release.
- Release notes VI: cải thiện nhận diện hóa đơn, chọn ảnh thư viện và độ ổn định khi quét. EN: corresponding receipt recognition, gallery selection and scan stability improvements.
- Không thay đổi landing APK code 24, production Play, hoặc closed-test draft.

## Store listing

- VI và EN-US title, short description, full description đã đồng bộ với `docs/google-play/store-listings.json`; title 24 ký tự, short description 52 ký tự, full description lần lượt 1.539 và 1.608 ký tự.
- Nội dung mô tả cách ghi thu chi, ví, ngân sách, chế độ khách/đồng bộ và quét hóa đơn. OCR được mô tả là thông tin gợi ý cần kiểm tra/chỉnh sửa; không tuyên bố nhận diện chính xác mọi hóa đơn. Giữ lưu ý PicKet không phải ngân hàng, không cho vay và không tư vấn đầu tư.
- Icon VI: PNG RGBA 512×512; feature graphic VI/EN-US: PNG RGB 1024×500.
- Phone screenshots: 7 ảnh cho mỗi locale, JPEG RGB 1170×2340. Đây là các ảnh UI thật đã có trên Play; bản upload giữ nguyên UI và mở rộng viền nền 45 px mỗi bên từ ảnh gốc 1080×2340, không cắt màn hình.
- Feature graphics mới dùng màu Paper của PicKet và ảnh màn hình thật Sáng/Tối. Asset cục bộ và log API: `.artifacts/google-play-assets/`; xác nhận sau commit: `submission-verified-20261031.json`.
- Google Play Developer API đọc lại đủ mô tả, icon, feature graphic và 7 ảnh mỗi locale. API commit thành công; trạng thái duyệt listing trong giao diện Console chưa được xác nhận.
- 31/10: sửa lỗi gõ `ajuda` thành `giúp` trong mô tả dài VI trên Play Console và lưu thành bản nháp; đã đọc lại nội dung sau khi lưu. Không gửi listing để xét duyệt.
- Còn lệch ngôn ngữ ở 7 ảnh EN-US: đồ họa/tiêu đề dùng tiếng Anh nhưng chữ trong giao diện app vẫn là tiếng Việt. Chưa thay bằng ảnh dựng; cần chụp lại từ app chạy tiếng Anh trước khi gửi listing để xét duyệt.

## Giới hạn và bước sử dụng

- QA51 trước phát hành đã chạy đủ 40 ảnh Bill trên Redmi 7; trong 25 tổng có nhãn: 19 đúng, 1 sai, 5 thiếu; 1 ảnh không chấm được và 14 ảnh chưa có nhãn. Bản Internal cho phép tester kiểm tra tiếp; kết quả này không chứng minh OCR tổng quát.
- Tester mở Play Console → Internal testing, opt in bằng tài khoản được thêm vào track, rồi cài/cập nhật PicKet từ Google Play. AAB không cài trực tiếp như APK.
- Bản này chưa được đưa lên landing hoặc Production. Không có commit, push hay deploy web trong lượt này.
