# Landing Paper — production 27/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).

## Phạm vi và quyết định thiết kế

Đã redesign riêng `picketfinance.com`, không sửa giao diện Next.js tại `app.picketfinance.com`. Trang chủ và navigation/footer trên hai trang chính sách dùng Nunito cùng palette Paper mobile: nền `#FFF8ED`, mặt thẻ `#FFFCF5`, chữ `#302132`, tím mận `#793268`, metadata `#72636E`, đường viền `#EADDD5`.

Đối tượng là người muốn ghi chi tiêu trên Android. Luồng chính: hiểu giá trị → xem tính năng/ảnh → tải APK → cài đặt → tìm trợ giúp. Hero dùng ảnh native và minh họa giấy cắt; phần còn lại ưu tiên nội dung, khoảng thở và đường phân chia, không rải thẻ hoặc hiệu ứng nổi. Footer chuyển về surface sáng và giữ bốn nhóm nội dung có thể quét nhanh.

Nội dung: hero, ba tính năng chính, bộ sưu tập/hạn đổi trả-bảo hành, ba ảnh màn hình, chế độ offline/sao lưu, bản tải và checksum, hướng dẫn cài, FAQ, hỗ trợ, footer. Không thêm số người dùng/đánh giá giả, địa chỉ/pháp nhân chưa cung cấp hoặc cam kết phản hồi 24/7. Hạn đổi trả/bảo hành được mô tả đúng là nhập thủ công; hóa đơn và kỷ vật còn hai mục riêng. Google Play chỉ Internal nên không quảng cáo đã có bản công khai.

Thông tin liên hệ đã áp dụng:

- Email: `picketfinance@gmail.com`.
- Điện thoại: `0369076214`, link `tel:+84369076214`.
- Facebook: `https://www.facebook.com/profile.php?id=61594108596611`.
- YouTube: `https://www.youtube.com/@PicKetFinance26`.

Footer có sản phẩm, tải/đăng nhập/phiên bản, hướng dẫn, quyền riêng tư, xóa tài khoản, mạng xã hội và copyright. Bảng hỗ trợ theo tham khảo của chủ dự án được diễn đạt lại cho Picket, sử dụng HTML Popover, không có runtime JavaScript. Không thêm form thu lead khi chưa có hệ thống tiếp nhận.

## Asset và khả năng truy cập

Tái sử dụng logo, Nunito 400/700, bloom/food/transport/gift và receipt từ mobile; xuất WebP phù hợp web. Không gọi dịch vụ tạo ảnh trong lượt này. Ba ảnh giao diện native được lấy từ QA tổng hợp trong lượt mobile Paper; ghi rõ ảnh minh họa và khác biệt theo phiên bản. APK vẫn code 19, chưa chứa lượt UI source mới.

Ảnh có kích thước/alt, lazy load ngoài hero; không gọi font/CDN/analytics bên ngoài. CSP của landing chỉ bổ sung `font-src 'self'`. Giữ skip link, semantic landmarks/headings, visible focus, reduced motion, details/summary. Escape đóng bảng hỗ trợ và trả focus về nút mở; liên hệ vẫn đọc được trong footer.

## Deploy

Đã chạy script mới `apps/landing/scripts/deploy.ps1`, build từ source local, dùng APK production hiện có được kiểm hash. Server script `deploy/deploy-landing.py` backup, publish assets trước HTML/metadata, validate rồi reload Caddy. Các container web/API/OCR giữ nguyên ID và thời điểm start, không rebuild/restart. Giữ nguyên URL APK cũ.

Backup thực tế: `/opt/picket/deploy/backups/landing-20261027T114420151684Z/before`.

Giữ APK **1.0.6/code 19**, 80,617,780 byte, SHA-256 `05dd46752fb370c9ff99fb32cc8c5deecd590da3835a1637c6409cab3d985bf5`. Lượt này không phát hành mobile hoặc Google Play.

## Kiểm tra

- 10/10 landing tests PASS; build kiểm byte size/hash APK PASS.
- Playwright Chromium: không tràn ngang ở 320/390/768/1024/1440; hai trang legal không tràn ở 320.
- Desktop/mobile screenshots đã xem; bảng hỗ trợ mở/đóng bằng Escape đúng và trả focus.
- Production HTTPS trả 200; HTML, legal pages, release manifest và mọi asset tham chiếu khớp byte build local.
- Font Nunito thực sự load trên production dưới CSP mới; bảng hỗ trợ production PASS.
- Tải toàn bộ APK qua HTTPS: size/SHA-256 đúng; range request 206.
- Web login, API health và landing legacy HTTPS smoke 200.

Evidence: `.artifacts/completion-20261027/landing-paper/`, gồm `deploy.log`, `live-verification.json`, ảnh desktop/mobile và production. Browser automation không thay thế nghiệm thu tương thích mọi trình duyệt hoặc thiết bị Android thật.

## Đưa thay đổi tiếp theo lên production

Xem [hướng dẫn landing](../../apps/landing/README.md). Git push hiện chạy CI, chưa tự deploy. Chạy script từ gốc repository sau review source; script tự test/build/upload/backup/publish. Cập nhật APK là luồng riêng: tăng versionCode, ký build production, nghiệm thu và đổi metadata thực trước khi deploy landing; upload AAB lên Play riêng.
