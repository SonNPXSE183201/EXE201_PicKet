# Landing → đăng nhập web — 22/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


**Đã lên production theo phê duyệt tiếp theo:** landing HTTPS có ba nút Đăng nhập, click mở login thật, APK cũ giữ nguyên. [Báo cáo và rollback](WEB_PRODUCTION_20261022.md). Trạng thái local/chưa publish bên dưới là checkpoint trước triển khai.

Yêu cầu: thêm đường vào ứng dụng web từ landing, responsive; sau đó chủ sở hữu yêu cầu nhãn chỉ là **Đăng nhập**, bỏ chữ “web”. Không đổi mobile, API, cơ chế đăng nhập hoặc APK.

## Triển khai

- Ba liên kết `/login`: header, hero và footer. Mở cùng tab, không có thuộc tính download. Caddy hiện có chuyển `/login` về Next.js, không phục vụ đường dẫn này như file landing.
- Header dùng hai nút cùng hàng trên điện thoại; hero xếp nút toàn chiều rộng. Giữ palette/typography/radius hiện hữu, dùng nút viền cho đăng nhập và nút màu đặc cho APK. Focus bàn phím và reduced motion hiện hữu được giữ nguyên.
- Ghi rõ bản web cần đăng nhập và kết nối mạng; không thay lời giới thiệu chế độ dùng riêng Android thành cam kết offline web.
- Build local giữ bản APK 1.0.4/code 5, 70.320.600 byte và SHA-256 hiện hữu; không tạo APK mới.

## Bằng chứng TDD và kiểm tra

Journeys được suy ra trực tiếp từ yêu cầu, không có plan riêng: người đọc tìm nút đăng nhập trên điện thoại/máy tính, mở đúng login; vẫn tải đúng APK cũ.

| Gate | Kết quả |
| --- | --- |
| RED thêm login | `node --test apps/landing/test/*.test.mjs`: 8 đạt, 2 lỗi đúng vì thiếu liên kết và ghi chú web; checkpoint `1688859` |
| GREEN thêm login | Cùng target 10/10 đạt; checkpoint `2309bd1` |
| RED đổi nhãn | `node --test apps/landing/test/site.test.mjs`: 3 đạt, 1 lỗi đúng vì nhãn còn “Đăng nhập web”; checkpoint `34fd699` |
| GREEN đổi nhãn | `node --test apps/landing/test/*.test.mjs`: 10/10 đạt |
| Build | `PICKET_APK` trỏ APK đã ký hiện hữu, `node apps/landing/scripts/build.mjs` xác minh kích thước/hash và render thành công |
| Coverage | `node --experimental-test-coverage --test-coverage-include=apps/landing/src/release.mjs --test apps/landing/test/*.test.mjs`: release renderer 100% line/branch/function. Không gọi đây là coverage HTML/CSS |
| Responsive | Chromium tại 320/390/768/1024/1440px: ba login link đều hiện, không tràn ngang; vùng bấm đăng nhập cao ít nhất 48px. Đã xem ảnh mobile và desktop |

Ảnh local nằm trong `output/playwright/landing-login-390.png`, `landing-login-1440.png` và ảnh chốt nhãn `landing-login-final-390.png` (không commit). Audit nhỏ theo design-system: màu/component/spacing giữ nguyên hệ thống hiện hữu; không thêm hiệu ứng, asset hoặc dependency. Không thay dark mode. Không phải nghiệm thu screen reader hay điện thoại thật.

Source và `dist` đã cập nhật **local, chưa push hoặc publish production**. Preview static chỉ phục vụ landing, không chạy Next login tại cùng port; kiểm thử xác minh href và routing Caddy, không tuyên bố đã login E2E từ preview. Các thay đổi tài liệu khác có sẵn trong worktree được giữ nguyên.
