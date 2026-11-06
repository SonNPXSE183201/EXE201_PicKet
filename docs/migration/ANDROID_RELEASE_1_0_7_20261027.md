# Android 1.0.7 / code 20 và landing có chuyển động — 27/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).

[Trạng thái dự án](../PROJECT_STATUS.md) · [Nghiên cứu motion](LANDING_MOTION_RESEARCH_20261027.md).

## Đã phát hành

- APK direct production ARM64: **1.0.7/code 20**, đã đưa lên landing public.
- AAB Google Play: **1.0.7/code 20**, track **Internal**, `completed`. Đọc lại bằng edit độc lập xác nhận code 20; alpha vẫn code 6 draft, beta/production không thay đổi.
- Không mở closed test/public production, không kích hoạt base plan Billing hoặc publish bài học cloud.

## Mobile thay đổi so với code 19

Đóng gói lượt [đồng bộ mobile Paper](MOBILE_PAPER_UNIFICATION_20261027.md): thẻ/nút/filter/typography gọn và cùng chủ đề Nhà; minh họa danh mục/túi/công cụ, receipt mới; cảnh báo sign-out theo queue thực, bỏ nút recheck dư trong updater, sửa chia danh mục guest bị tải mãi. Phiên bản Expo là 1.0.7, Android versionCode 20.

Không thay API, schema hoặc Supabase trong lượt phát hành này. Email SMTP đã đổi ở lượt riêng và không cần nhúng mật khẩu vào app.

## Build và kiểm chứng

- Direct APK và Play AAB build riêng, release preflight production HTTPS/public config PASS.
- 914/914 mobile tests PASS; lint 0 lỗi/cảnh báo; `tsc --noEmit` PASS.
- 13/13 landing tests PASS, gồm test mô phỏng và hợp đồng release. Node syntax check cho module mới PASS.
- APK `apksigner` verify và AAB `jarsigner` verify PASS. Certificate SHA-256 khớp bản stable: `07c04346fc367a7ea5c6c08f34704dd3e36e2db0d68bad6d0f722175e4568bce`.
- Package `com.picket.mobile`, Android minSdk 24, 28 native library ARM64 trong AAB. Direct có REQUEST_INSTALL_PACKAGES; Play không có REQUEST_INSTALL_PACKAGES/SYSTEM_ALERT_WINDOW và không đóng gói APK installer.
- Bytecode của cả hai có API production và registry minh họa Paper mới. Xác minh ảnh receipt trong resource sau tối ưu bằng alpha/composite pixels, không dựa vào tên resource đã bị shrink. Prefix `sb_secret_` là literal kiểm tra trong SDK; đọc bảng chuỗi Hermes xác nhận chỉ có prefix guard, không có giá trị secret key.
- Source manifest SHA-256 lưu riêng, không có keystore hoặc credential. Không coi build/test là nghiệm thu camera/sinh trắc/Billing trên điện thoại thật; chủ dự án đã nhận tự kiểm thiết bị thật.

## APK public

- File: `picket-1.0.7-20-production-arm64-v8a.apk`.
- Bytes: **81,184,844**.
- SHA-256: `fe3b2d8396a6f4dbee972b3a6be628da5d0d11cd4164b9baa443d7641d3af661`.
- [Tải APK 1.0.7](https://picketfinance.com/downloads/picket-1.0.7-20-20261027-fe3b2d83-arm64.apk).
- Đã tải lại toàn bộ APK qua HTTPS: size/hash/MIME đúng, range request 206. HTML, release metadata, ảnh/font/script tham chiếu khớp local build; web login/API/legacy HTTPS vẫn 200.
- Giữ nguyên URL APK 19 và các bản cũ. Landing không cung cấp AAB để cài trực tiếp; AAB dùng cho Play.

## Google Play

- AAB: `picket-1.0.7-20-google-play.aab`, **58,147,778** byte.
- SHA-256: `07cfa783c04938d143a4fa78d4ea7643434e50a7b14b6ddaf52876a326990ac4`.
- Upload bằng Android Publisher API với service account đã cấu hình, không đưa khóa vào repository. Upload resumable lần đầu bị httplib2 xử lý HTTP 308 như redirect; edit lỗi đã xóa, chuyển sang media request thường, timeout 300s. Upload/checksum/validate/commit và đọc lại độc lập đều PASS.
- Evidence: `release20-play-deploy.json`, `release20-play-readback.json`, `release20-play-upload-retry.log`.

## Landing motion

Đã deploy hero giấy nhiều lớp, parallax con trỏ, story đổi màn theo cuộn, mô phỏng khoản chi và điều khiển giảm chuyển động. Giữ footer/liên hệ đã duyệt; không sửa Next.js app. CSP chỉ cho script/font cùng origin. Caddy validate/reload PASS; container ID/start time web/API/OCR giữ nguyên.

Backup: `/opt/picket/deploy/backups/landing-20261027T121724010563Z/before`.

Live browser: responsive 320/390/768/1024/1440; cộng/reset/overspend; đổi màn; pause; support Escape; reduced motion không animation; no-JS vẫn đọc/tải được đều PASS. Hero thực sự đổi transform và pointer tilt phản hồi; không có page error trong lượt lab.

Một lượt Chromium desktop, context mới trên production: LCP 716ms, CLS 0.000040, tổng phần long task vượt 50ms là 0ms; hai JS request transfer tổng 3,147 byte. Đây là số đo lab tại máy kiểm tra, không phải field Core Web Vitals, Lighthouse score, FPS hoặc cam kết hiệu năng mọi điện thoại.

## Vận hành và rollback

[Hướng dẫn deploy landing](../../apps/landing/README.md): chạy script với APK đã ký được xác minh, không sửa link bằng tay. Giữ release metadata đồng bộ APK. Khi rollback landing, phục hồi HTML/assets/metadata/Caddy từ backup, giữ file APK mới để link đã chia sẻ còn hoạt động. Google Play không hạ versionCode; nếu cần sửa mobile, build code cao hơn và phát hành Internal lại.

Artifacts riêng tư ở `.artifacts/completion-20261027`, APK/AAB tại `.artifacts/releases`; không commit binary, keystore, cache hoặc credential.
