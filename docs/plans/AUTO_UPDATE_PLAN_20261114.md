# Kế hoạch: tự động cập nhật khi mở ứng dụng (14/11/2026)

## Mục tiêu
- Khi người dùng mở Picket, nếu có phiên bản mới thì ứng dụng **tự kiểm tra và tự cập nhật**, không cần vào mục "Ứng dụng › Cập nhật ứng dụng" và bấm "Kiểm tra cập nhật".
- Gỡ mục `AppUpdateSection` khỏi màn hình Hồ sơ (`src/app/(tabs)/profile.tsx`, dòng `<AppUpdateSection />`). Giữ dòng hiển thị phiên bản đang cài (`InstalledVersion`).

## Hiện trạng (đã đọc code)
- Bản Google Play (`android-app-updates.play.ts`): chỉ mở trang Play, không có cơ chế cập nhật trong app.
- Bản APK landing/APKPure (`android-app-updates.ts` + module `modules/picket-app-updates`): đọc `/v1/releases/landing`, tải APK, kiểm tra SHA-256/kích thước/chữ ký (`UpdateVerification.kt`) rồi mở trình cài bằng `Intent.ACTION_VIEW`, nên người dùng phải tự bấm "Cài đặt".
- Luồng do người dùng kích hoạt thủ công qua `app-update-controller.ts` và `app-update-section.tsx`.
- Sổ phiên bản: từ 14/11, worker tự ghi bản landing mới vào sổ, nên `/v1/releases/landing` luôn trả bản mới nhất. Đã có trường `minSupportedVersionCode` để ép cập nhật.

## Giới hạn của Android (cần nói rõ với người dùng)
- **Google Play:** dùng Play In-App Updates API. Kiểu *flexible* tải nền rồi khởi động lại app; kiểu *immediate* chặn màn hình đến khi cập nhật xong. Play không cho cài hoàn toàn im lặng; người dùng thấy một màn xác nhận của Play, hoặc app tự khởi động lại khi tải xong (flexible).
- **APK ngoài Play:** Android chỉ cho cập nhật **không cần bấm** (`PackageInstaller.SessionParams.setRequireUserAction(USER_ACTION_NOT_REQUIRED)`, Android 12+) khi Picket là "installer of record" của chính nó. Lần cài đầu từ trình duyệt hoặc APKPure thì installer là trình duyệt hoặc APKPure, nên **lần cập nhật đầu tiên vẫn cần người dùng bấm Cài đặt**. Từ lần sau, nếu bản trước được cài qua `PackageInstaller` của Picket, có thể cập nhật im lặng. Android dưới 12 luôn cần xác nhận. Quyền "Cài ứng dụng không rõ nguồn" vẫn phải được cấp một lần.

## Thiết kế
1. **Kiểm tra khi mở app** (`src/app/_layout.tsx`, sau khi phiên đăng nhập sẵn sàng): gọi kiểm tra một lần khi mở và khi app quay lại foreground, giãn cách tối thiểu 6 giờ (lưu mốc thời gian). Chỉ khi có Wi-Fi hoặc mạng không tính phí (`expo-network`), trừ khi bản hiện tại dưới `minSupportedVersionCode`.
2. **Bản Play:** thêm module Expo cục bộ `modules/picket-play-updates` (Kotlin, `com.google.android.play:app-update-ktx`).
   - Bản thường dùng kiểu flexible: tải nền, xong thì hiện snackbar "Đã tải bản mới, khởi động lại để cập nhật" và tự `completeUpdate()` khi app vào nền.
   - Nếu `versionCode < minSupportedVersionCode` thì dùng kiểu immediate.
3. **Bản APK:** mở rộng `picket-app-updates`.
   - Tải nền (đã có), kiểm tra SHA-256, kích thước, chữ ký trùng với app đang cài (đã có).
   - Cài bằng `PackageInstaller` session, có `setRequireUserAction(USER_ACTION_NOT_REQUIRED)` trên Android 12+, thay cho `ACTION_VIEW`.
   - Nhận kết quả qua `BroadcastReceiver`. Nếu Android yêu cầu xác nhận (`STATUS_PENDING_USER_ACTION`), hiện thông báo nhỏ "Bản mới đã sẵn sàng, chạm để cài".
4. **Giao diện:**
   - Gỡ `AppUpdateSection`.
   - Thêm banner nhẹ ở trang chủ chỉ khi đang tải, đã sẵn sàng hoặc cần xác nhận; không có nút "Kiểm tra cập nhật".
   - Bản bắt buộc hiển thị màn chặn có nút cài.
5. **An toàn:** giữ nguyên toàn bộ kiểm tra hiện có (HTTPS, hash, kích thước, chữ ký, package name, `minSdk`, ABI). Không tải qua mạng di động nếu không bắt buộc. Không cập nhật khi pin dưới 20% (trừ bản bắt buộc). Ghi sự kiện ẩn danh `update_downloaded`, `update_installed`, `update_failed`.
6. **Admin:** trang "Phiên bản" đặt `minSupportedVersionCode` (đã có trường "Bắt buộc cập nhật nếu thấp hơn code") để ép cập nhật khi có lỗi nghiêm trọng.

## Các bước thực hiện
1. Viết test trước cho `app-update-policy` mới: lịch kiểm tra, điều kiện mạng/pin, bắt buộc hay tùy chọn.
2. Module `picket-play-updates` + lớp `android-app-updates.play.ts` gọi In-App Updates. Test bằng Internal app sharing hoặc Internal testing (Play chỉ báo có bản mới khi cài từ Play).
3. Mở rộng `picket-app-updates` dùng `PackageInstaller` session + receiver; thêm quyền `UPDATE_PACKAGES_WITHOUT_USER_ACTION` (Android 12+) cho bản APK. Bản Play không có quyền này (plugin `with-play-store-build` đã loại module APK).
4. Controller tự động + banner. Gỡ `AppUpdateSection` khỏi Hồ sơ, giữ `InstalledVersion`.
5. Thử trên Redmi 7 (Android 10, nên APK luôn cần bấm Cài đặt) và máy ảo Android 14 (thử cập nhật im lặng):
   - Play: bản Internal N rồi N+1, kiểm tra flexible và immediate.
   - APK: cài bản N từ landing, cập nhật lên N+1 (cần bấm), rồi N+2 (im lặng trên Android 12+).
6. Phát hành theo skill `picket-versioning`: bản có tính năng mới nên là **1.1.0**.

## Rủi ro
- Lần cập nhật đầu của người dùng APK vẫn cần một lần bấm (giới hạn Android). Cần ghi rõ trong ghi chú phát hành.
- Google Play có thể xem quyền `UPDATE_PACKAGES_WITHOUT_USER_ACTION` là nhạy cảm, nên quyền này chỉ được có trong bản APK, không có trong AAB.
- Tải nền tốn dữ liệu: mặc định chỉ tải qua Wi-Fi.

---

# Phần B. Bảo mật web, chống bot và DDoS (bổ sung 14/11/2026)

## B1. Hiện trạng đã kiểm chứng
| Hạng mục | Trạng thái | Nguồn |
| --- | --- | --- |
| VPS | Ubuntu 24.04.5; SSH chỉ nhận khóa, cấm root; ufw bật (22/tcp LIMIT); fail2ban bật; unattended-upgrades bật; **đang chờ khởi động lại** (`/var/run/reboot-required`) | đọc trực tiếp trên VPS ngày 14/11 |
| Cổng web | Caddy publish 80/443/443-udp cho mọi nguồn; Docker đi vòng qua ufw | `compose.production.yml:17-20` |
| Đường vòng Cloudflare | `picket.51-79-207-154.sslip.io` và `api.51-79-207-154.sslip.io` phục vụ thẳng IP origin, không qua Cloudflare | `deploy/Caddyfile:78,96` |
| **Lỗi bảo mật** | `phone-login` lấy IP từ phần tử đầu `X-Forwarded-For` do client tự đặt, nên kẻ tấn công đổi IP giả để né giới hạn đăng nhập | `apps/api/routes/v1/auth/phone-login.dart:35-42` |
| IP thật | Caddy chưa khai báo `trusted_proxies` Cloudflare / `CF-Connecting-IP` | `deploy/Caddyfile` |
| Header | Landing có CSP; web app và API chưa có CSP | `deploy/Caddyfile`, `web/next.config.ts` |
| Thống kê bên thứ ba | Cloudflare Web Analytics tự chèn `static.cloudflareinsights.com` vào landing, chạy trước khi người dùng đồng ý | quan sát trên trang 14/11 |

## B2. Giới hạn gói Cloudflare Free (đã đối chiếu)
- WAF: chỉ **Free Managed Ruleset**; tối đa **5 custom rule** (không regex, không có action Log).
- Rate limiting: **1 rule**, cửa sổ 10 giây. Nguồn: [Cloudflare WAF docs](https://developers.cloudflare.com/waf/), [Tech Insider: Rate limiting 2026](https://tech-insider.org/cloudflare-rate-limiting-rules-terraform-13-steps-2026/).
- **Bot Fight Mode không bỏ qua (skip) được** bằng WAF rule hay Page Rule; chỉ Super Bot Fight Mode (gói Pro trở lên) mới skip được. Nguồn: [Cloudflare skip options](https://developers.cloudflare.com/waf/custom-rules/skip/options), [Bot Fight Mode chặn webhook](https://stackharbor.com/en/knowledge-base/cffix-bot-fight-mode-blocking-webhooks/). Vì `api.picketfinance.com` chung zone với web, bật Bot Fight Mode có thể chặn app mobile, webhook PayOS và RTDN Google Play. **Không bật** khi còn ở gói Free; dùng WAF custom rule thay thế.
- Chống DDoS L3/L4/L7 (HTTP DDoS managed ruleset) bật sẵn ở mọi gói, không cần cấu hình. Chỉ bật "I'm Under Attack" khi đang bị tấn công, vì nó cũng chặn app mobile và webhook.

## B3. Kế hoạch theo ưu tiên
**P0, làm ngay (rủi ro thấp)**
1. Sửa lỗi IP: Caddy đặt `servers { trusted_proxies static <dải IP Cloudflare> ; client_ip_headers CF-Connecting-IP }`, reverse_proxy ghi đè `X-Forwarded-For {client_ip}`. API đọc IP do Caddy đặt, không tin header client. Có test, deploy theo quy trình image ứng viên.
2. Cloudflare SSL/TLS chế độ **Full (strict)**, Always Use HTTPS, TLS tối thiểu 1.2 (origin đã có chứng chỉ Let's Encrypt hợp lệ).
3. Tắt **Web Analytics tự chèn** của Cloudflare (Analytics & Logs › Web Analytics). Landing đã có thống kê riêng có xin đồng ý.
4. WAF custom rule (5 rule):
   - (1) Skip cho `/v1/billing/payos/webhook`.
   - (2) Chặn quốc gia/ASN lạ trên `/admin*` (tùy chọn).
   - (3) Managed Challenge cho `/login`, `/register`, `/forgot-password` trên web (người thật, không áp cho API).
   - (4) Chặn user-agent rỗng trên web.
   - (5) Chặn đường dẫn dò quét phổ biến (`/wp-*`, `/.env`, `/.git`).
5. Rate limiting rule duy nhất: `starts_with(http.request.uri.path, "/v1/auth/")`, khoảng 20 request/10 giây/IP, Block. Không áp lên webhook.
6. Khởi động lại VPS trong khung giờ thấp điểm để nhận bản vá kernel đang chờ, rồi kiểm tra lại toàn bộ container và smoke test.

**P1**
7. Khóa origin chỉ cho Cloudflare: thêm chain `DOCKER-USER` với ipset dải IP Cloudflare (Docker đi vòng ufw), có cron cập nhật danh sách IP. Làm sau khi xác nhận webhook PayOS, RTDN và app cũ không còn gọi IP/sslip.io.
8. Ngừng phục vụ sslip.io khi app cũ không còn dùng. App ≥ 1.0.14 đã dùng `api.picketfinance.com`; kiểm tra log trước khi tắt.
9. Turnstile (miễn phí) cho đăng nhập/đăng ký/OTP trên web, kiểm tra token ở server. App mobile giữ giới hạn trong DB theo IP và số điện thoại.
10. CSP cho web app (`next.config.ts › headers()`) và `default-src 'none'` cho API; giới hạn kích thước body ở Caddy (trừ upload OCR).
11. DNSSEC (DNS › Settings) rồi thêm bản ghi DS ở nhà đăng ký; SPF/DKIM/DMARC cho email gửi từ domain.
12. Cache Rule cho `/downloads/*.apk` và `/launch-assets/*` để giảm tải origin khi nhiều người tải.

**P2**
13. Authenticated Origin Pulls hoặc Cloudflare Tunnel (không mở cổng 80/443) khi bỏ hẳn sslip.io.
14. Cân nhắc gói Pro nếu cần Super Bot Fight Mode có thể skip cho API, hoặc thêm rate limit rule.

## B4. Kiểm tra sau mỗi bước
- `deploy/smoke.ps1` đạt; app Play và APK đăng nhập, đồng bộ, quét OCR được; webhook PayOS nhận (đơn thử); RTDN Google Play vẫn tới Supabase.
- Cloudflare Security › Events: theo dõi 24-48 giờ, không có chặn nhầm request của app.
- Gọi trực tiếp IP origin phải bị từ chối sau bước 7.

## B5. Đã áp dụng ngày 14/11/2026 (qua MCP Cloudflare và SSH, có kiểm tra sau mỗi bước)
- Caddy: `trusted_proxies` = dải IP Cloudflare, `client_ip_headers CF-Connecting-IP`; mọi `reverse_proxy` ghi đè `X-Forwarded-For {client_ip}` (repo `deploy/Caddyfile` và VPS; bản cũ lưu `releases/worker-release-sync-20261114/Caddyfile.before-realip`). Ghi chú: trước đó IP chưa giả được vì Caddy đã bỏ XFF của client không tin cậy; bước này cần để IP vẫn đúng khi đi qua Cloudflare.
- Cloudflare: Always Use HTTPS = on, TLS tối thiểu = 1.2 (SSL đã là Full strict), tắt Web Analytics tự chèn (beacon đã biến mất khỏi landing).
- **`api` và `app` đã bật proxy Cloudflare** (trước đây "DNS only", lộ IP và không có chống DDoS/WAF).
- WAF custom: (1) skip cho `/v1/billing/payos/webhook` (bỏ qua rate limit và managed rules), (2) chặn đường dò quét `/wp-`, `/.env`, `/.git`, `phpmyadmin`, `*.php`, (3) chặn request không User-Agent vào `app`.
- Rate limit: `api` `/v1/auth/*` 20 request/10 giây theo IP, chặn 10 giây.
- DNSSEC: đã bật phía Cloudflare (trạng thái pending), cần thêm bản ghi DS ở nhà đăng ký: `picketfinance.com. 3600 IN DS 2371 13 2 925BF0B8788F383A1BD66A7CA498546149FDDFD1F43E38C9D39D4146ADD94D16`.
- Kiểm tra: smoke production đạt; `/.env` và `wp-login.php` → 403; app không UA → 403; webhook PayOS tới ứng dụng (400 với body thử rỗng, không bị Cloudflare chặn); đăng nhập sai → 401; 30 request liên tiếp tới `/v1/auth/channels` → 23×200, 7×429.
- DNSSEC: bản ghi DS đã công bố, trình phân giải trả cờ AD (đã xác thực).
- Khởi động lại VPS (B3.6): kernel 6.8.0-149, 6 container tự chạy lại, smoke đạt.
- Khóa origin ở tầng Caddy: snippet `cloudflare_only` ngắt mọi kết nối tới `picketfinance.com`, `app`, `api` không đến từ dải IP Cloudflare hoặc mạng nội bộ. Gọi thẳng IP origin → ngắt kết nối; qua Cloudflare, webhook PayOS, probe của admin-worker vẫn 200. Bản cũ: `releases/worker-release-sync-20261114/Caddyfile.before-cfonly`.
- **Chưa khóa bằng tường lửa và chưa ngừng sslip.io (B3.7, B3.8)**: mọi bản APK đến 1.0.18 kiểm tra cập nhật ở `picket.51-79-207-154.sslip.io` (không qua Cloudflare). Mã mobile đã đổi nguồn cập nhật sang `https://picketfinance.com` (`app-update-policy.ts`), có hiệu lực từ bản 1.1.0. Chỉ ngừng sslip.io và khóa cổng 80/443 bằng `DOCKER-USER` khi phần lớn người dùng APK đã lên 1.1.0 (đặt `minSupportedVersionCode` nếu cần).
- CSP web (B3.10): image `picket-web:security-20261114` (rollback: `picket-web:finance-20261113`). Header CSP, `Permissions-Policy`; API có `default-src 'none'`. Kiểm tra trên Chrome: login, register, dashboard, admin, realtime không có vi phạm CSP; chỉ beacon Cloudflare Web Analytics tự chèn bị chặn (đúng ý, vì chưa có đồng ý).
- Turnstile (B3.9): mã đã deploy (chỉ kiểm tra token ở server trước khi trình duyệt gọi Supabase/API, để giới hạn theo IP vẫn thấy IP thật); đang tắt cho tới khi cài khóa vào `.env.production`. Widget "Picket web auth" đã tạo trên Cloudflare.
