# Plan tổng hoàn thiện Picket — 05/11/2026

Nhánh làm việc: `fix/mobile-completion-plan`. Plan này thay cho phần “đợt B/C” trong [MOBILE_COMPLETION_PLAN_20261105.md](MOBILE_COMPLETION_PLAN_20261105.md); chi tiết PayOS vẫn ở [PAYOS_EXPIRY_HARDENING_PLAN_20261105.md](PAYOS_EXPIRY_HARDENING_PLAN_20261105.md).

## Nguyên tắc chung

1. **Kênh thanh toán theo nơi phát hành.** Bản Google Play chỉ dùng Google Play Billing; APK ngoài Play (landing, APKPure) chỉ dùng PayOS. Đã tách ở thời điểm build (`billing-entry.play.tsx` / `billing-entry.tsx`); giữ nguyên và thêm test chặn rò PayOS vào bản Play.
2. **Production chỉ nhận thay đổi đã test đủ:** unit + SQL (PGlite) + API + typecheck/lint → diễn tập migration trên bản sao DB → backup → deploy có tag rollback → smoke → nghiệm thu. Mỗi đợt có báo cáo trong `docs/`.
3. **Mở rộng bằng dữ liệu/cấu hình, không bằng refactor:** nguồn doanh thu, ưu đãi, kênh OTP, gói nội dung học, thông báo và phiên bản đều là bản ghi có schema/version; thêm mới không cần build lại app khi có thể.
4. **Truy vết:** mọi thay đổi tiền, giá, quyền, nội dung, thông báo có `revision`, người sửa, lý do, thời điểm (audit) và MFA cho thao tác admin.
5. **Bí mật** chỉ ở `apps/api/.env`, `deploy/.env.production` (VPS). Không đưa key vào bundle mobile/web, Git hay báo cáo.

## Tiến độ (cập nhật 05/11/2026, tối)

| Đợt | Trạng thái |
| --- | --- |
| 0 PayOS 15 phút | ✅ Đã code, test và chạy trên production ([báo cáo](../PAYOS_EXPIRY_DEPLOYMENT_20261105.md)). Còn: nghiệm thu tiền thật trên Redmi |
| 1 Sổ doanh thu | ✅ Production ([báo cáo](../REVENUE_PROMO_NOTICE_RELEASE_DEPLOYMENT_20261105.md)). Còn: cấp quyền bucket báo cáo tài chính Play để xác nhận số tiền Google |
| 2 Ưu đãi | ✅ Production (chưa tạo ưu đãi nào). Còn: tạo offer trên Play Console nếu muốn áp ưu đãi cho bản Play |
| 3 Thông báo | ✅ Backend/web trên production; mobile chờ APK |
| 4 Phiên bản | ✅ Production; readback Play trong worker đang tắt (`PLAY_TRACK_READBACK`) |
| 5 Học tài chính | ✅ 30 bài VI/EN, tự duyệt theo checklist; bật trong app bằng `EXPO_PUBLIC_LEARNING_ENABLED`. Chấm điểm cloud cần thêm đáp án cho bài 13–30 |
| 6 Dự báo AI | ⏸ Đã nghiên cứu ([báo cáo](AI_FORECAST_RESEARCH_20261105.md)); đã sửa lỗi gom ngày theo UTC. Phần LLM chưa bật, chờ: đánh giá tác động theo Luật BVDLCN 91/2025, Gemini gói trả phí, nhóm thử nghiệm 30 người × 8 tuần |
| 7 Đăng ký email/SĐT | ✅ Backend trên production (OTP email qua Gmail SMTP của Supabase; SMS chỉ cần cấu hình). Mobile chờ APK |
| 8 Mobile còn lại | ✅ Đường vào Học tài chính và Kỷ niệm, module cờ tính năng, xóa màn preview. Còn: chuyển i18n các màn capture/receipts/onboarding |
| 9 APK QA / internal | 🔄 Đang build APK QA `com.picket.mobile.bugqa` cho Redmi 7 |

## Thứ tự thực hiện

| Đợt | Nội dung | Tự làm được | Cần chủ dự án |
| --- | --- | --- | --- |
| 0 | Phát hành PayOS 15 phút (đã code) | Toàn bộ test, backup, deploy, smoke | Nghiệm thu tiền thật trên Redmi |
| 1 | Sổ doanh thu hợp nhất Google Play + PayOS | Toàn bộ | Bật đọc báo cáo tài chính Play (nếu chưa cấp quyền bucket) |
| 2 | Ưu đãi linh hoạt cho 4 gói | Toàn bộ phía PayOS | Tạo offer tương ứng trong Play Console |
| 3 | Thông báo ưu đãi / sự cố / bảo trì | In-app + banner + local notification | Credential FCM nếu muốn push khi app đóng |
| 4 | Quản lý phiên bản phát hành | Toàn bộ, đọc lại Play/landing tự động | Nhập trạng thái APKPure (portal không có API) |
| 5 | Nội dung học tài chính v2 | Nghiên cứu, soạn, tự duyệt, test | Xem lại trước khi publish (khuyến nghị) |
| 6 | Dự báo tài chính AI | Nghiên cứu, engine, AI giải thích, backtest | Đồng ý dùng dữ liệu thật để backtest; chốt quota |
| 7 | Đăng ký/đăng nhập email + SĐT, OTP Gmail → SMS | Toàn bộ code + test | App password Gmail cho API; sau này credential SMS |
| 8 | Hoàn thiện mobile còn lại (Keepsakes, i18n, flag, dọn preview) | Toàn bộ | — |
| 9 | Build APK QA + nghiệm thu thiết bị + phát hành store | Build, ký, kiểm tra | Thao tác điện thoại, Play Console, APKPure |

Đợt 1→4 dùng chung nền admin (MFA, audit, revision) nên làm liền nhau; đợt 7 đặt sau vì phụ thuộc credential Gmail cho API.

---

## Đợt 0 — Phát hành PayOS 15 phút

Đã code và test: link `expiredAt = now + 900`, hủy link cũ khi mua lại, GET trước khi hủy/hết hạn, tiền vào trễ vẫn mở gói, doanh thu chỉ cộng đơn `paid`, đếm ngược mobile/web, worker 60 giây.

1. Commit theo Conventional Commits trên nhánh; chạy lại `npm run test` toàn repo.
2. Diễn tập: restore bản dump production gần nhất vào Postgres tạm trên VPS → áp `20261105090000_payos_expiry_hardening.sql` → chạy suite `payos-expiry-hardening` trên bản sao.
3. Production: `pg_dump` trước migration (lưu SHA-256) → áp migration → advisors → tag image cũ `before-payos-expiry-*` → build/deploy API, web, worker → `deploy/smoke.ps1`.
4. Nghiệm thu không chuyển tiền: tạo link, kiểm tra `expiredAt` trên PayOS, bấm mua lại (link cũ bị hủy), để hết hạn → `Hết hạn`. Nghiệm thu tiền thật (chủ dự án): thanh toán 1 đơn trên `com.picket.mobile.bugqa`.
5. Rollback: image cũ; migration chỉ thay hàm (`create or replace`) nên có thể áp lại định nghĩa cũ từ `20261103173421`.

## Đợt 1 — Sổ doanh thu hợp nhất (Google Play + PayOS)

**Hiện trạng:** PayOS có `payment_transactions`; Google Play chỉ có `play_purchases` (không có số tiền) và báo cáo bán hàng hằng tháng được worker nhập vào số liệu admin, chưa nối với người dùng/đơn.

**Thiết kế:**

- `revenue_sources(code, name, enabled, settlement_currency)`: `payos`, `google_play`. Thêm nguồn mới = thêm một dòng + một bộ nhập liệu, không đổi schema.
- `revenue_ledger` (chỉ ghi thêm, không sửa/xóa):
  - `source`, `kind` (`charge` / `refund` / `chargeback` / `adjustment`), `status` (`estimated` / `confirmed` / `reversed`)
  - `external_ref` (PayOS `reference`, Play `GPA.xxxx`), duy nhất theo `(source, external_ref, kind)`
  - `user_id`, `sku`, `tier`, `order_id` / `purchase_token_hash`
  - `currency`, `amount_original`, `amount_vnd`, `fx_rate`, `fx_source`, `fee_vnd`, `net_vnd`
  - `occurred_at`, `recorded_at`, `evidence` (webhook/GET PayOS, file báo cáo + checksum, event id)
- **Ghi dữ liệu:**
  - PayOS: `payment_receive` ghi `charge confirmed` khi đơn `paid`. Đơn `review` ghi ở trạng thái chờ và không tính vào doanh thu. Hoàn tiền là `refund` do admin nhập (MFA + lý do).
  - Google Play: khi xác minh hoặc RTDN, ghi `charge estimated` theo giá catalog và `latestOrderId`. Báo cáo bán hàng tháng đối chiếu theo Order Number để chuyển sang `confirmed` với số tiền thật, đồng thời ghi `refund` / `chargeback`. Đối soát lệch (có trong báo cáo mà không có trong DB, hoặc ngược lại) đưa vào danh sách cần xem.
- **Admin:**
  - Tổng doanh thu VND, tách theo nguồn, gói, kênh và ngày/tháng/năm.
  - Tách `estimated` / `confirmed`; drill-down từ một dòng tới đơn hoặc purchase, event và bằng chứng.
  - Xuất CSV qua hạ tầng export sẵn có, kèm mã truy vết.
- **Chỉ còn PayOS sau này:** tắt `revenue_sources.google_play` cho dữ liệu mới, bỏ build Play Billing (`BILLING_CHANNELS=payos`); dữ liệu cũ giữ nguyên. Lưu ý chính sách: app phân phối trên Google Play mà bán gói số phải dùng Play Billing (hoặc chương trình billing thay thế đủ điều kiện), nên “chỉ PayOS” đồng nghĩa phát hành ngoài Play hoặc đăng ký chương trình đó.
- **Test:** SQL (ledger bất biến, trùng ref, refund, tổng theo nguồn, quyền `revenue.read`), API, worker parser báo cáo Play, admin UI.

## Đợt 2 — Ưu đãi linh hoạt cho 4 gói

Giữ đúng 4 gói hiện tại. Ưu đãi là dữ liệu do admin bật/tắt; **chưa tạo gói sáng lập**, chỉ đảm bảo tạo được khi cần.

- `billing_promotions`:
  - `name`, `code` (tùy chọn), `discount_percent` (1–90) hoặc `discount_amount`, `skus[]`, `channels` (`payos`; `google_play` chỉ để ánh xạ)
  - `starts_at` / `ends_at`, `max_redemptions` (ví dụ 100 suất), `per_user_limit`
  - `enabled`, `priority`, `revision`, `play_offer_id` (ánh xạ offer trong Play Console)
- `promotion_redemptions(order_id, promotion_id, state: reserved/consumed/released)`.
- `payment_reserve` tính giá ở server, khóa giá trên đơn (`list_amount`, `discount_amount`, `promotion_id`).
  - Đơn pending giữ suất trong 15 phút; hết hạn hoặc hủy thì trả suất; `paid` thì dùng suất.
  - Tiền vào trễ vẫn được giá đã khóa.
  - Tăng/giảm % chỉ áp cho đơn mới.
- Admin web:
  - Tạo/sửa/tạm dừng ưu đãi, tăng/giảm %, xem trước giá.
  - Xem số suất còn lại và lịch sử thay đổi; MFA + lý do + audit.
- Mobile/web: giá gạch ngang, % giảm, thời hạn và suất còn lại (nếu có giới hạn).
- Google Play: giá ưu đãi thật phải là offer trong Play Console (hoặc Publisher API `monetization.subscriptions` ở bước sau); app hiển thị đúng offer Play trả về.
- **Test:** đếm suất đồng thời (100 suất, 101 người), hết hạn trả suất, đổi % giữa chừng, giá khóa khi trả trễ.

## Đợt 3 — Thông báo ưu đãi, sự cố, bảo trì

- `app_announcements`:
  - `kind` (`promotion` / `incident` / `maintenance` / `info`), `severity`, tiêu đề/nội dung VI/EN
  - CTA (route trong app hoặc `promotion_id`)
  - Đối tượng: tất cả, kênh `play`/`apk`, tier, khoảng `version_code`, guest/đăng nhập
  - `starts_at`/`ends_at`, `dismissible`, `pinned`, `revision`
  - Liên kết `admin_records` loại incident
- Bảo trì: thông báo `maintenance` có cờ `blocking` → app hiện màn bảo trì có thời gian dự kiến, giữ dữ liệu local. Cơ chế chặn ghi `enforce_maintenance` đã có ở DB.
- API `GET /v1/announcements`: public, có ETag/cache ngắn; khi có token thì lọc theo tier.
- Mobile:
  - Tải khi mở app/foreground; banner ở Trang chủ và hộp thông báo ở màn Thông báo; đánh dấu đã đọc local.
  - Local notification cho thông báo mức cao khi app nhận được.
  - Push khi app đóng là bước sau (cần FCM).
- Web: banner người dùng + trang admin tạo/lên lịch/kết thúc thông báo (MFA, audit).
- **Test:** lọc theo đối tượng, khung giờ, bảo trì chặn, locale.

## Đợt 4 — Quản lý phiên bản phát hành

- `app_releases`:
  - `version_name`, `version_code`
  - `channel` (`play_internal` / `play_alpha` / `play_beta` / `play_production` / `apkpure` / `landing`)
  - `status` (`draft` → `submitted` → `in_review` → `live` → `halted` / `superseded`), `rollout_percent`
  - `sha256`, `bytes`, `url`, chứng chỉ ký
  - Release notes VI/EN, `min_supported_code` (bắt buộc cập nhật)
  - `released_at`, bằng chứng readback, người ghi
- Đồng bộ trạng thái:
  - Worker đọc Play Publisher API (tracks/rollout) và manifest landing (hash, HTTP 200).
  - APKPure: admin nhập tay trạng thái và ảnh bằng chứng.
- Manifest landing sinh từ bản ghi `landing` đang `live` (thay việc sửa tay). Mobile kiểm tra cập nhật theo manifest + `min_supported_code`. Thông báo đợt 3 có thể nhắm theo phiên bản.
- Admin: dòng thời gian theo kênh, so sánh phiên bản giữa các kênh, cảnh báo lệch (ví dụ landing cũ hơn Play).
- **Test:** chuyển trạng thái hợp lệ, manifest khớp hash, chặn hạ `min_supported_code` ngoài ý muốn.

## Đợt 5 — Nội dung học tài chính v2

**Hiện trạng:** 12 bài VI/EN (`curriculum.*.v1.json`), quiz/tự kiểm tra; cổng publish và CMS admin đã có; cloud chưa publish bài nào.

- **Nghiên cứu nguồn:**
  - Khung năng lực tài chính OECD/INFE; CFPB “Your Money, Your Goals”; tài liệu giáo dục tài chính của NHNN/Bộ Tài chính.
  - Quy định VN liên quan (lãi suất tiết kiệm, thẻ tín dụng, BNPL, cảnh báo tín dụng đen và lừa đảo chuyển khoản, thuế TNCN cơ bản).
  - Ghi nguồn + ngày truy cập cho từng số liệu.
- **Cấu trúc 4 chặng, khoảng 30 bài:**
  - *Nền tảng*: thu–chi, ngân sách theo túi, 50/30/20 điều chỉnh cho VN, mục tiêu.
  - *Ổn định*: quỹ khẩn cấp, nợ (lãi phẳng vs dư nợ giảm dần, APR), thẻ tín dụng, BNPL.
  - *Bảo vệ*: lừa đảo, an toàn thanh toán số, bảo hiểm cơ bản, quyền người tiêu dùng.
  - *Phát triển*: tiết kiệm và lãi kép, gửi tiết kiệm, đầu tư cơ bản (không khuyến nghị sản phẩm), thuế cơ bản, thu nhập phụ.
- **Phương pháp:** bài ngắn 3–5 phút, ví dụ có lời giải, máy tính nhỏ, quiz có giải thích. Có câu hỏi áp dụng vào dữ liệu thật của người dùng (xử lý local), ôn tập ngắt quãng và cột mốc.
- **Schema gói nội dung v2:** module → lesson → block (`text` / `example` / `calculator` / `quiz` / `reflection` / `source`), có version, locale, hash và trạng thái duyệt.
  - App mang theo gói gốc; gói mới tải từ cloud sau khi admin publish, không cần phát hành app.
  - Gói v1 vẫn đọc được để giữ tiến độ học.
- **Tự duyệt theo checklist:** đúng nguồn, số liệu có ngày, không tư vấn đầu tư cá nhân, dễ đọc, văn phong phù hợp, quiz đúng và được validate bằng test. Bản publish cloud nên được chủ dự án xem lại.

## Đợt 6 — Dự báo tài chính AI

**Hiện trạng:** engine tất định (`forecast.ts`, `variable-spending`, backtest), chỉ chạy dev; AI hiện dùng Gemini cho học tập (`GEMINI_API_KEY`, `GEMINI_MODEL` ở server).

- **Nghiên cứu:** dự báo dòng tiền cá nhân. So sánh baseline seasonal-naive, exponential smoothing và phân vị cho chi tiêu biến đổi; phát hiện khoản định kỳ. Đánh giá MAE/MAPE và độ phủ khoảng 7/30 ngày.
- **Nguyên tắc:** con số do engine tất định tính (có khoảng tin cậy và nhãn đủ/thiếu dữ liệu). LLM chỉ diễn giải và gợi ý hành động, dùng output có cấu trúc. LLM chỉ nhận số liệu tổng hợp, không nhận giao dịch thô; cần đồng ý của người dùng.
- **Hạ tầng:**
  - Job queue như `learning_ai_jobs`; quota theo Free/Plus/Pro, trần chi phí, cache và kill switch.
  - Model lấy từ env; có thể đổi provider qua adapter.
- **Phát hành:**
  - Backtest trên dữ liệu thật được phép, công bố độ chính xác nội bộ.
  - Bật flag cloud theo từng nhóm.
  - Chuyển route preview thành tính năng thật trong tab Kế hoạch.

## Đợt 7 — Đăng ký/đăng nhập email + SĐT, OTP Gmail → SMS

- **Giữ nguyên:** mọi tài khoản email/mật khẩu và Google hiện có đăng nhập như cũ.
- **Đăng ký:** Google (Gmail OAuth), email + mật khẩu (OTP email, đã có), SĐT + mật khẩu.
- **Kiến trúc OTP (Dart API), thêm kênh không phải refactor:**
  - `OtpChannel` (`send(destination, code, purpose, locale)`); `EmailOtpChannel` (SMTP Gmail); `SmsOtpChannel` + adapter nhà cung cấp (eSMS/SpeedSMS/OmiCall đã có nghiên cứu).
  - `OtpService`: mã 6 số lưu HMAC, hạn 5 phút, tối đa 5 lần thử, gửi lại sau 60 giây, giới hạn theo IP/đích/ngày, audit.
  - Thứ tự kênh qua cấu hình: `OTP_CHANNELS=email` hôm nay → `sms,email` khi có nhà cung cấp.
- **Luồng SĐT khi chưa có SMS:**
  - Người dùng nhập SĐT + email + mật khẩu → OTP gửi email → xác minh → API tạo user. Email đã xác minh; SĐT gắn với tài khoản nhưng ghi là chưa xác minh qua SMS.
  - Đăng nhập bằng SĐT + mật khẩu qua API: tra SĐT → tài khoản → cấp phiên.
  - Khi có SMS thì yêu cầu xác minh bổ sung. Không bật Phone provider của Supabase cho tới lúc đó.
- **Bảng:** `user_contact_methods(user_id, kind, value, verified_via, verified_at)` (SĐT duy nhất), `picket_private.otp_challenges`.
- **Quên mật khẩu:** qua OTP email; sau này thêm SMS. Lưu ý Gmail giới hạn khoảng 500 email/ngày, đủ cho giai đoạn đầu.

## Đợt 8 — Hoàn thiện mobile còn lại

- Keepsakes: thêm đường vào từ Hồ sơ/Kế hoạch, chuyển sang i18n.
- i18n các màn còn chữ cứng: capture, receipts/[id], onboarding, receipt-camera, review-inbox, insights, `api-error-message.ts`.
- Gom feature flag vào `core/config/feature-flags.ts`, ghi đủ vào `.env.example`.
- Xóa `settings-preview`; chuyển cashflow/learning/weekly-story sang route thật được chặn bằng flag.
- Màn `register` được thay bằng luồng của đợt 7.
- Test ma trận dữ liệu (thu nhập/hoàn tiền/chia khoản, xung đột bulk-edit, tháng đã khóa).

## Đợt 9 — Nghiệm thu thiết bị và phát hành

- Build APK QA `com.picket.mobile.bugqa` theo `.agents/skills/picket-apk-testing`; kiểm tra chữ ký/hash; dọn output.
- Chủ dự án nghiệm thu trên Redmi: PayOS thật, ưu đãi, thông báo, đăng ký SĐT/email, học, dự báo.
- Phát hành: AAB lên Play (internal → alpha → production), APK lên landing (manifest từ `app_releases`), APKPure; ghi lại mọi bước trong `app_releases`.

## Những gì cần từ chủ dự án

1. App password Gmail (hoặc SMTP khác) dành riêng cho API gửi OTP — cho đợt 7.
2. Quyền đọc bucket báo cáo tài chính Google Play cho service account worker — cho đợt 1 (nếu chưa cấp).
3. Offer trong Play Console khi muốn ưu đãi trên bản Play — cho đợt 2.
4. Credential FCM nếu muốn push khi app đóng — cho đợt 3 (tùy chọn).
5. Đồng ý dùng dữ liệu thật để backtest dự báo và mức quota AI theo gói — cho đợt 6.
6. Nghiệm thu thiết bị/tiền thật và thao tác store — cho đợt 0 và 9.
