# Công việc còn mở

Cập nhật 04/11/2026. [Hiện trạng](PROJECT_STATUS.md) · [Readback cửa hàng](migration/STORE_RELEASE_READBACK_20261101.md) · [Roadmap học tập cloud và các phần mở rộng](ROADMAP_CLOUD_FEATURES_20261102.md) · [Thiết kế duy nhất](../PICKET-DESIGN.md) · [Báo cáo OCR](migration/MOBILE_OCR_EXPANDED_20261028.md).

Đây là backlog hiện hành; không cộng lại mọi dòng “pending” trong checkpoint cũ. Phân biệt code đã có nhưng chưa nghiệm thu, tính năng chưa có và việc chủ động hoãn. Build, ảnh UI hoặc test source không thay thế nghiệm thu thiết bị/người dùng thật.

## Cần nghiệm thu trước khi mở rộng phát hành

| Việc | Trạng thái / bằng chứng còn cần | Phụ thuộc |
| --- | --- | --- |
| OCR mobile | QA51 trên Redmi 7 chạy đủ 40 ảnh Bill; trong 25 tổng có nhãn, 19 đúng, 1 sai, 5 thiếu; 1 ảnh không chấm được, 14 chưa có nhãn. OCR chưa nghiệm thu tổng quát. Phát hành code 28 không đồng nghĩa đã đạt accuracy OCR. | Xử lý tổng sai/thiếu, tăng nhãn độc lập cho hàng hóa, đo fallback/date/edit và soak/nhiệt; xem [báo cáo OCR](migration/MOBILE_OCR_EXPANDED_20261028.md) |
| Điện thoại ARM64 | QA OCR code 36 đã chạy chọn ảnh trên Redmi; chụp giấy thật, sinh trắc, thông báo, độ mượt dài hạn và giữ dữ liệu sau cập nhật còn cần nghiệm thu riêng. QA thật chỉ dùng `com.picket.mobile.bugqa`; không cài đè/xóa/gỡ `com.picket.mobile`. | Chủ dự án nghiệm thu các phần phần cứng; ghi đúng QA version/hash và thiết bị |
| Google Play | Internal và alpha/closed đều có 1.0.14/code 28 `completed`, rollout 100%; beta/production chưa có release. Listing gần nhất được đọc lại 31/10; trạng thái Console review chưa được kiểm tra lại ngày 01/11. Alpha có một Google Group, nhưng số thành viên/opt-in/14 ngày chưa rõ. | Xác minh cohort thật và yêu cầu Console trước khi kết luận tester đã đủ hoặc xin production access; xem [readback 01/11](migration/STORE_RELEASE_READBACK_20261101.md) |
| RTDN từ Play | Đã quan sát RTDN purchase/renew/cancel/revoke và server cập nhật khi app đóng. Live duplicate/out-of-order replay bị approval chặn; offline handler test đạt | Thiết bị license tester |
| APKPure | Đã build APK universal 1.0.14/code 28 và chuẩn bị 7 ảnh + release notes ngày 01/11. Trạng thái portal chưa có readback; không kết luận đã nộp, được duyệt hoặc xuất bản dựa vào artifact local. | Chủ tài khoản kiểm tra submission/review trên APKPure; cập nhật trạng thái sau khi đọc lại |
| TalkBack | Có semantic/font/responsive kiểm từng phần; chưa có spoken audit toàn bộ luồng chính | Thiết bị hoặc môi trường assistive-tech phù hợp |

## Có implementation nhưng cần mở rộng kiểm chứng

- Backup/restore kèm ảnh: native round-trip, sai mật khẩu/file lỗi/giới hạn ảnh/lỗi giữa chừng. Codec tests không thay ca native.
- Hai thiết bị: media receipt/keepsake, cache và thay đổi đồng thời. CRUD offline/A→B→A và native conflict merge đã có bằng chứng, không coi toàn bộ sync chưa làm.
- Thông báo: ngưỡng ngân sách, đọc/ẩn, đổi lịch từ nơi khác, hoạt động nền trên thiết bị thật.
- Admin đã triển khai và nghiệm thu thêm owner/MFA, phân quyền user/group và thu hồi trên production theo [báo cáo 04/11](RBAC_PRODUCTION_ACCEPTANCE_20261104.md). Còn luồng native staff online end-to-end và nguồn Play/vitals/sales khi nền tảng có quyền/báo cáo. Không bật bảo trì hoặc khóa user thật để thử.
- Ma trận dữ liệu: thống kê với income/refund/split/lịch sử lớn; bulk conflict/network/validation/tập lớn; UI từ chối thay đổi tháng đóng; điều kiện gói/ngày của partner notice.

## Chờ quyết định hoặc ngoài MVP hiện tại

| Việc | Quyết định hiện tại |
| --- | --- |
| PayOS, SĐT và quyền tùy chỉnh | API/web/worker, PayOS/PIN đã deploy; tiền thật 19.000đ/cấp Plus và phân quyền user/group/MFA/thu hồi đã nghiệm thu. Còn APK native mới. SMS/OTP cùng đăng ký/khôi phục/đổi SĐT hoãn; giữ email/mật khẩu và Google cho tài khoản cũ. Xem [nghiệm thu RBAC/MFA](RBAC_PRODUCTION_ACCEPTANCE_20261104.md) |
| Billing | Bốn SKU test verified/Publisher-acknowledged. Cancel/expiry/refund/decline/offline recovery/owner rejection/grace/hold/recovery và RTDN tương ứng đã kiểm chứng. Pending native không áp dụng cho auto-renew; còn live replay bị approval chặn; xem báo cáo 28/10 |
| Nội dung học cloud | VI/EN biên tập 2 đã có trong code 20; còn review độc lập/pilot và quyết định publish. Cloud hiện không có bài published |
| Cloud grading trả phí | Hoãn ngoài MVP. Không bật AI cá nhân hoặc truyền câu trả lời local lên cloud chỉ để đóng checklist |
| Diện mạo túi cloud | Tùy chỉnh đã lưu owner-local; chưa đồng bộ appearance qua cloud |
| Liên kết hóa đơn–món đồ | Hai mục riêng; hai hạn nhập thủ công. Liên kết/tự nhận diện hạn là mở rộng sản phẩm |
| Dự báo | Cần dữ liệu được phép dùng, completeness và backtest 7/30 ngày trước tuyên bố độ chính xác |
| Pilot thật | Cần người dùng tự nguyện, thời gian sử dụng và phản hồi; không tạo bằng chứng giả |
| Import Flutter thật | Đã loại khỏi MVP theo chủ dự án; chỉ mở lại khi có file lịch sử thật và nhu cầu cụ thể |
| CD tự động | Có script deploy landing; Git push chạy CI, chưa tự deploy VPS/Google Play |

## Đã có bằng chứng hoàn tất và trạng thái release

- Landing, Play Internal và Play closed alpha đã đọc lại ở 1.0.14/code 28; alpha/Internal completed 100%. Beta và production Google Play chưa có release. APKPure code 28 mới xác nhận ở mức artifact local, chưa xác minh trạng thái portal.
- Paper mobile, asset, sign-out/updater/guest splits; landing motion/footer/CTA và điều hướng sạch URL đã triển khai theo phản hồi.
- SMTP đã đổi sang Picket Production `<picketfinance@gmail.com>`, email recovery tới inbox thật đạt.
- Supabase đã đồng bộ 53 migration sau sửa lỗi revision ngày 04/11; không cần chạy lại migration chỉ để đồng bộ tài liệu.
- Dọn output build và hợp nhất design thuộc lượt repository sync hiện tại, theo [báo cáo](migration/REPOSITORY_SYNC_20261027.md).

Checkpoint Billing code 22 được bổ sung bởi [nghiệm thu ngày 28/10](migration/BILLING_RELEASE_ACCEPTANCE_20261028.md). Không còn gate Publisher ack/cancel/refund/grace/hold; pending native không áp dụng cho danh mục auto-renew; live replay còn bị approval chặn.

Ngày 28/10: [lifecycle và public release](migration/BILLING_RELEASE_ACCEPTANCE_20261028.md) thay checkpoint code 22 ở trên về các ca đã bổ sung. Publisher ack, cancel/expiry/refund, decline, offline recovery và owner rejection đã có bằng chứng mới. Không liệt kê lại các ca này là chưa chạy. Pending native không áp dụng cho auto-renew; grace/hold đã kiểm chứng; live replay còn bị approval chặn, xem báo cáo.
