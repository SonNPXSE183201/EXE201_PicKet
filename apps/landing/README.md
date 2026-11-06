# Picket landing page

Landing tĩnh tại **https://picketfinance.com**, độc lập với Next.js ở `web/` và `app.picketfinance.com`. Source công khai ở `site/`; `dist/` là output build và không commit. Không có analytics hoặc font từ bên thứ ba. Animation/tương tác dùng module JavaScript local theo progressive enhancement; nội dung và link tải vẫn đọc được khi tắt JavaScript.

Readback ngày 01/11/2026: landing public đang phục vụ APK **1.0.14/code 28 ARM64**, 161.644.903 bytes; manifest HTTPS và URL APK trả 200, hash manifest khớp artifact đã ký. Artifact: `.artifacts/releases/picket-1.0.14-28-20261101-1713c3df.apk`. Trạng thái Google Play/APKPure xem [readback cửa hàng](../../docs/migration/STORE_RELEASE_READBACK_20261101.md); các mục phát hành cũ dưới đây là checkpoint lịch sử.

## Sửa giao diện và xem thử

- `site/index.html`: nội dung, liên hệ, footer, FAQ và bảng hỗ trợ.
- `site/launch-assets/paper-v1.css`: token Paper, layout và responsive.
- `site/launch-assets/paper-motion-v1.css`, `paper-motion-v1.js`, `paper-motion-state.js`: animation, story, giảm chuyển động và mô phỏng khoản chi; không gọi API.
- `site/launch-assets/`: ảnh minh họa, ảnh giao diện, font Nunito local và QR.
- `site/privacy.html`, `site/account-deletion.html`: nội dung chính sách, dùng chung font/footer landing.
- `release.json`: metadata của APK đã được ký và xác minh. Không đổi metadata chỉ vì sửa landing.

Để xem source landing trong lúc chỉnh sửa:

```powershell
cd apps/landing
npm install
npm run dev
```

Mở `http://localhost:4175`. Development server phục vụ trực tiếp thư mục
`site/`; link tải APK chỉ được kiểm chứng trong output build hoàn chỉnh.

Để tạo và xem output build với APK đã ký, chạy tại thư mục gốc repository bằng
PowerShell, với Node và Python đã cài:

```powershell
npm test --prefix apps/landing
$env:PICKET_APK = (Resolve-Path '.artifacts/releases/picket-1.0.14-28-20261101-1713c3df.apk').Path
npm run build --prefix apps/landing
python -m http.server 4175 --bind 127.0.0.1 --directory apps/landing/dist
```

Mở `http://127.0.0.1:4175`. Kiểm tra cả desktop/mobile, footer, bảng hỗ trợ và link tải. Build kiểm đúng byte size và SHA-256 từ `release.json`, từ chối APK thiếu hoặc không khớp. Việc xác minh mã gói/chữ ký/ABI thực phải làm bằng công cụ Android trước khi duyệt metadata.

## Đưa code landing mới nhất lên production

Source được deploy là source hiện có trên máy chạy lệnh. Review thay đổi và lưu commit có phạm vi trước khi phát hành. **Git push hiện chỉ chạy kiểm tra CI; chưa tự deploy VPS.**

Điều kiện: Node, Python, OpenSSH (`ssh`, `scp`) và `tar`; quyền SSH tới VPS; Python 3.12+ và Docker trên VPS. Khóa mặc định là `$env:USERPROFILE/.ssh/picket_ovh`; không commit khóa.

Chạy tại gốc repository:

```powershell
./apps/landing/scripts/deploy.ps1 `
  -ApkPath '.artifacts/releases/picket-1.0.14-28-20261101-1713c3df.apk'
```

Nếu dùng máy/khóa SSH khác:

```powershell
./apps/landing/scripts/deploy.ps1 `
  -ApkPath 'D:/releases/picket-production-arm64.apk' `
  -SshTarget 'ubuntu@51.79.207.154' `
  -SshKey 'D:/keys/picket_ovh'
```

Script tự chạy test → build với APK được kiểm hash → đóng gói file public của bản hiện hành → upload → backup → publish assets trước HTML/metadata → validate/reload Caddy. Script server ở `deploy/deploy-landing.py`; thư mục serve là `/opt/picket/apps/landing/dist`.

- Giữ nguyên APK cũ và URL đã phát hành; từ chối ghi đè URL APK với byte khác.
- Chỉ bổ sung `font-src 'self'` và `script-src 'self'` trong CSP của landing nếu cần. Không deploy hoặc restart web/API/OCR.
- Backup riêng từng lượt trong `/opt/picket/deploy/backups/landing-<UTC>/before`; đường dẫn được in trong kết quả.
- Nếu bước publish/validate/reload thất bại, tự phục hồi HTML, assets, metadata và Caddy từ backup.
- Không chạy toàn bộ `docker compose up` để chỉ sửa landing.

Sau deploy, kiểm tra `https://picketfinance.com`, `/privacy.html`, `/account-deletion.html`, `/release.json`, tải APK và đối chiếu SHA-256. Mở bảng hỗ trợ, xem footer trên điện thoại và xác nhận `/login` vẫn chuyển tới web. Không coi thông báo upload thành công là nghiệm thu trình duyệt.

## Phát hành APK mới khác với cập nhật landing

### Đồng bộ `release.json` từ trang Phiên bản (admin)

`npm run sync:release` đọc `GET /v1/releases/landing` (mặc định `https://api.picketfinance.com`, đổi bằng `PICKET_API_URL`) và ghi lại `release.json` nếu registry có bản landing mới. Bước build vẫn kiểm tra byte APK theo manifest này, nên APK đã ký phải khớp trước khi deploy.

### Liên kết Google Play

Landing v2 dùng một nguồn cấu hình duy nhất: `PLAY_STORE_URL` trong
`site/launch-assets/paper-motion-v1.js`. Giá trị tạm thời là `#`; thay bằng URL listing chính thức
khi Google Play đã sẵn sàng. Badge vẫn là ảnh chính thức tiếng Việt lưu cục bộ, không dùng CDN.

Để đưa **mobile source mới** tới người dùng, phải build APK/AAB production mới với versionCode tăng và khóa ký hiện có; xác minh bằng `apksigner`/`aapt2`, kiểm tra cấu hình API và nghiệm thu cài mới/cập nhật giữ dữ liệu. Sau đó cập nhật `release.json` bằng metadata thực, dùng filename có hash mới rồi chạy lại script landing. Google Play cần upload AAB riêng; script landing không phát hành Google Play.

Sửa landing không làm thay đổi APK. Lượt motion/release tiếp theo ngày 27/10 đã đưa APK 1.0.7/code 20 lên landing, chứa UI Paper mới. Ảnh native vẫn dùng dữ liệu QA tổng hợp; không coi đó là nghiệm thu thiết bị thật.

## Phục hồi bản landing trước

Dùng đúng đường dẫn `before` mà lượt deploy đã in. Trên VPS, sao chép `index.html`, `privacy.html`, `account-deletion.html`, `release.json` và nội dung `launch-assets/` từ backup về `/opt/picket/apps/landing/dist/`; phục hồi `Caddyfile` về `/opt/picket/deploy/Caddyfile`. Chạy `docker exec picket-caddy-1 caddy validate --config /etc/caddy/Caddyfile`, rồi `docker exec picket-caddy-1 caddy reload --config /etc/caddy/Caddyfile`. Không xóa thư mục downloads. Kiểm tra HTTPS, font, link tải và checksum lại sau phục hồi.

## Thiết kế và bằng chứng

Paper dùng đúng palette mobile: canvas `#FFF8ED`, surface `#FFFCF5`, text `#302132`, muted `#72636E`, primary `#793268`, border `#EADDD5`; font Nunito 400/700 local. Dùng nút pill, thẻ radius 22, nền mint/lilac/peach và minh họa từ `apps/mobile/assets/paper`. Ảnh native chỉ chứa dữ liệu tổng hợp của tài khoản QA; không công bố tài khoản thật. Không thêm nhận xét khách hàng, lượng người dùng, giờ hỗ trợ hoặc thông tin pháp nhân chưa được xác minh.

Bảng hỗ trợ dùng HTML Popover: mở bằng nút Hỗ trợ, đóng bằng ×, Escape hoặc bấm ngoài; kênh liên hệ luôn có ở footer khi trình duyệt cũ không hỗ trợ Popover. FAQ/checksum dùng details/summary. Link ngoài có tên rõ, tab mới được báo cho screen reader; focus hiển thị và tôn trọng reduced motion.

[Báo cáo deploy Paper](../../docs/migration/LANDING_PAPER_DEPLOYMENT_20261027.md) · [Trạng thái dự án](../../docs/PROJECT_STATUS.md).

[Nghiên cứu motion và kiểm chứng](../../docs/migration/LANDING_MOTION_RESEARCH_20261027.md) · [Android 1.0.7/code 20](../../docs/migration/ANDROID_RELEASE_1_0_7_20261027.md).

## Cập nhật điều hướng và chuyển động 27/10

Đã bỏ nút bật/tắt chuyển động theo yêu cầu chủ dự án. Hiệu ứng tự khởi chạy khi mở trang; hiệu ứng trang trí tự chạy kết thúc sau một lượt, còn phản hồi theo con trỏ/cuộn vẫn hoạt động. Thiết lập reduced motion của hệ thống vẫn được ưu tiên.

Các liên kết section trong trang cuộn đến nội dung mà không thêm hash vào URL khi JavaScript hoạt động; giữ query string, focus và liên kết gốc cho keyboard/no-JS. Link cũ có fragment hợp lệ vẫn mở đúng section rồi làm sạch URL bằng replaceState, không tạo thêm history entry.

## APK 1.0.9/code 22 — 28/10/2026

Landing production đã cập nhật APK ARM64 1.0.9/code 22, ký cùng khóa các bản trực tiếp trước đó. Đã tải toàn bộ APK công khai và đối chiếu SHA-256; cập nhật native từ code 18 sang code 22 trên máy ảo x86_64 giữ tài khoản, số dư và 4 ví. Bản x86 chỉ dùng QA, không phải file tải public. Xem [báo cáo vòng đời và phát hành](../../docs/migration/BILLING_RELEASE_ACCEPTANCE_20261028.md).

## APK 1.0.14/code 28 — readback 01/11/2026

Manifest production trả version 1.0.14/code 28; URL tải APK trả HTTP 200 và đúng Content-Length 161.644.903 bytes. SHA-256 công khai khớp artifact build đã ký. Google Play Internal và alpha cũng có code 28 completed; APKPure có artifact local nhưng trạng thái portal chưa xác minh. Xem [readback cửa hàng](../../docs/migration/STORE_RELEASE_READBACK_20261101.md) và [artifact build](../../.artifacts/apkpure-store-20261101/BUILD-AND-LISTING.txt).
