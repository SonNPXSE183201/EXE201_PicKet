# Nghiên cứu và triển khai chuyển động landing Picket — 27/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).

## Mục tiêu

Biến landing thành trải nghiệm khám phá sản phẩm có phản hồi, giữ ngôn ngữ Paper của mobile và đường tải Android rõ ràng. Không sửa giao diện `app.picketfinance.com`, không sao chép asset/code của website tham khảo và không thêm backend chỉ để làm animation.

## Nghiên cứu trực tiếp

Đã đọc các trang dưới đây và mở Copilot Money, Superlist, Paper Tiger bằng Chromium để xem bố cục thực. Ảnh tham khảo giữ riêng trong `.artifacts/completion-20261027/landing-paper/research-*.png`, không đưa vào asset public. Đây là đối chiếu thiết kế, không phải nghiên cứu người dùng hoặc bằng chứng tăng conversion.

| Nguồn gốc | Quan sát / bài học | Quyết định cho Picket |
| --- | --- | --- |
| [Copilot Money](https://www.copilot.money/) | Hero chữ lớn, nhãn tình huống chi tiêu vây quanh; trình bày sản phẩm bằng tình huống đời thường | Chuyển thành bàn giấy với phiếu cà phê, túi dự định và hoa tiền của Picket; không dùng palette tối, asset, số liệu giải thưởng hoặc tuyên bố tự động hóa của Copilot |
| [Superlist](https://www.superlist.com/) | Một thông điệp lớn dẫn tới giao diện sản phẩm; ảnh app là trung tâm thay vì hình stock | Hero rõ CTA; khu khám phá ba màn native Nhà/Chi tiêu/Dự định thay đổi theo cuộn hoặc nút chọn |
| [Paper Tiger](https://www.papertiger.com/) | Chữ có cá tính, chất liệu và mảng hình tạo nhận diện riêng | Giữ Nunito/Paper, dùng lệch góc giấy, phiếu thu răng cưa và vùng mô phỏng nền tím mận; không chuyển sang thẩm mỹ agency |
| [Lusion — About](https://lusion.co/about/) | Studio kết hợp motion, 3D và kỹ thuật để tạo trải nghiệm; là đối chiếu hướng immersive | Không đưa WebGL/model/video nặng vào trang tải ứng dụng hiện tại. Dùng nhiều lớp CSS và phản hồi con trỏ để tạo chiều sâu phù hợp asset giấy có sẵn |
| [Chrome: Scroll-driven animations](https://developer.chrome.com/docs/css-ui/scroll-driven-animations) | Timeline theo scroll/view có thể diễn đạt bằng CSS; phải xử lý khác biệt hỗ trợ trình duyệt | Thanh tiến độ và xoay nhẹ minh họa dùng `@supports`; không có hỗ trợ thì nội dung vẫn đầy đủ |
| [web.dev: High-performance CSS animations](https://web.dev/articles/animations-guide) | Ưu tiên transform/opacity; tránh gây layout/paint liên tục | Điện thoại/parallax và chuyển màn dùng transform/opacity; không có custom smooth-scroll hoặc vòng JavaScript chạy liên tục khi người dùng đứng yên |
| [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) | Tôn trọng yêu cầu giảm chuyển động từ hệ thống | Tắt animation/transition dưới reduced motion; mô phỏng và đổi màn vẫn dùng được ngay lập tức |

Không lấy số giải thưởng, hiệu quả kinh doanh hoặc dữ liệu của các website trên làm thành tích của Picket.

## Thiết kế đã áp dụng

1. Hero mới chữ lớn, nền giấy, điện thoại có chiều sâu và các phiếu ví dụ xung quanh. Minh họa hoa chuyển động chậm; con trỏ làm điện thoại nghiêng trong giới hạn nhỏ trên máy có hover/pointer chính xác.
2. Story ba màn: màn hình sticky trên desktop đổi theo phần nội dung đang đọc bằng IntersectionObserver; có nút chọn trực tiếp. Mobile dùng bố cục cuộn bình thường, nút chọn đổi màn; không ép pin cả trang.
3. Mô phỏng ngân sách 200.000 ₫: chọn cà phê 35.000, đi chợ 80.000, di chuyển 20.000; thấy số còn lại, thanh tiến độ và khoản mới nhất. Có reset và trạng thái vượt khoảng dành. Chỉ giữ state trong bộ nhớ của trang, không lưu tài khoản, không gọi API hoặc ghi dữ liệu tài chính.
4. Thanh tiến độ cuộn và minh họa phản hồi nhẹ; hover trên hình, nút có phản hồi. Không áp fade-up đại trà lên mọi section.
5. Nút Dừng/Bật chuyển động luôn có khi JavaScript hoạt động; thiết lập giảm chuyển động của OS được ưu tiên. Khi JavaScript tắt, animation lặp không bắt đầu và nội dung/tải app/footer vẫn có.
6. Giữ footer, Facebook, YouTube, email, điện thoại và bảng hỗ trợ đã chốt. Bảng hỗ trợ vẫn dùng HTML Popover.

Token không đổi: canvas `#FFF8ED`, surface `#FFFCF5`, ink `#302132`, plum `#793268`, Nunito local; mint/lilac/peach là nền phụ. File mới: `paper-motion-v1.css`, `paper-motion-v1.js`, `paper-motion-state.js`. Script UI khoảng 5,8 KB raw; không thêm GSAP, Three.js, CDN, analytics hoặc dependency runtime.

CSP landing chỉ thêm `script-src 'self'`; giữ chặn inline script, eval, form và kết nối mạng tùy ý. Script mới không fetch dữ liệu. Deploy chỉ reload Caddy; web/API/OCR giữ nguyên ID/start time.

## Kiểm chứng

- RED: test không import được state module trước implementation; GREEN: cộng/reset/ngoài ngân sách đạt. Tổng landing suite: **13/13 PASS**.
- Chromium local và production: demo cộng ba khoản còn 65.000 ₫, reset 200.000 ₫, vượt ngân sách vẫn hiển thị đúng; chọn màn và cuộn tới màn giữa đạt.
- Dừng animation và Escape đóng hỗ trợ đạt. Chế độ OS reduced motion không còn animation chạy, vẫn bấm mô phỏng được.
- JavaScript disabled: đọc nội dung và tải APK được, nút demo không giả vờ hoạt động.
- Không tràn ngang ở 320/390/768/1024/1440, kể cả thời điểm vào trang sau khi sửa watermark quá rộng ở 320.
- Ảnh desktop/mobile/demo/story đã được xem. Không khẳng định field Core Web Vitals, FPS điện thoại thật hoặc conversion uplift khi chưa có dữ liệu tương ứng.

Evidence: `motion-browser.log`, `live-motion-browser.log`, `motion-tests.log`, ảnh `motion-*` và `live-motion-*` trong artifact task. Kiểm tra release và checksum trong [báo cáo Android 1.0.7](ANDROID_RELEASE_1_0_7_20261027.md).

Coverage riêng hai module thuần `release.mjs` và `paper-motion-state.js`: line/branch/function 100%. Không dùng con số này làm coverage cho toàn bộ UI browser. Lượt lab production có LCP 716ms, CLS 0.000040 và không có page error; giới hạn phép đo nêu trong báo cáo release.

## Cập nhật theo phản hồi chủ dự án — cùng ngày

Đã bỏ hoàn toàn nút Dừng/Bật chuyển động; JS tự kích hoạt motion khi mở trang và tiếp tục tôn trọng reduced motion của OS. Hoa ở hero chạy một lượt 4,5 giây thay vì loop vô hạn; scroll/parallax vẫn phản hồi khi tương tác. Header, footer và các link section trên trang cuộn mượt mà không đổi URL sang #section. Deep link cũ vẫn tìm section và xóa fragment hợp lệ, giữ query. Anchor/focus/no-JS fallback được giữ.

Đã deploy và kiểm tra trực tiếp: không còn toggle; auto motion PASS; bốn link header giữ URL sạch và đến đúng section; query/deep-link cleanup và Enter trên mobile PASS; reduced motion và demo PASS. APK vẫn 1.0.7/code 20. Backup: `/opt/picket/deploy/backups/landing-20261027T135624119205Z/before`. Evidence: `clean-nav-deploy.log`, `clean-nav-browser.log`.

### Tinh gọn nhãn và header

Theo phản hồi tiếp theo, đã bỏ dấu chấm trang trí ở hero, gạch ngang trước ba story-tag và nút Tải ứng dụng bên phải header; khu vực action chỉ còn Đăng nhập. Hai link tải APK trong nội dung và checksum vẫn giữ. Đã deploy production và kiểm tra DOM/computed pseudo-element bằng Chromium, cùng 13 landing tests trong pipeline. Backup cuối: `/opt/picket/deploy/backups/landing-20261027T140539238774Z/before`.

### Rà thiết kế sau khi tinh gọn CTA

Áp dụng product-ui-ux/frontend-design và kiểm trực tiếp bằng Playwright: header còn một action Đăng nhập nền #793268/chữ trắng; hero chỉ còn Tải APK Android, giữ căn giữa. Contrast trắng/tím 8,51:1; button header cao 46px; focus outline 3px, link /login đúng. Không tràn ngang ở 320/390/768/1440; đã xem ảnh hero desktop/mobile, story và footer. Scroll tới bước giữa đổi đúng màn Chi tiêu sau khi chuyển cảnh ổn định. Không phát hiện blocker hoặc lệch bố cục cần chỉnh thêm trong phạm vi này; không coi đây là nghiên cứu conversion thực tế.

13/13 landing tests trong pipeline deploy PASS. Backup cuối: `/opt/picket/deploy/backups/landing-20261027T140906967089Z/before`. Ảnh review: `cta-review-desktop.png`, `cta-review-mobile.png`, `cta-review-story.png`, `cta-review-footer.png` trong artifact landing-paper.
