# Đối chiếu catalogue với Picket mobile hiện tại

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ngày: **22/10/2026, Asia/Saigon**. Source đọc tại `828e23e`. Phạm vi: mobile Expo Android và backend/contract phục vụ mobile; không bổ sung web. Đây là inventory lập kế hoạch theo nhóm năng lực, không phải chứng nhận hoàn thành từng business rule hoặc kết quả E2E mới.

Nguồn yêu cầu: [Picket Feature Catalogue Final](../../Picket.FeatureCatalogue.Final.docx), version 1.0 ngày 04/10/2026. Đã đọc nội dung OOXML theo paragraph/table để đối chiếu chức năng; không sửa hay xác nhận chất lượng dàn trang DOCX. [Kế hoạch chi tiết](MOBILE_SETTINGS_LEARNING_AI_PLAN_20261022.md) có research, UX, AI/provider, dependencies và nghiệm thu.

## Cách đọc trạng thái

Bản nghiên cứu mở rộng: [11 ứng dụng thị trường](MOBILE_MARKET_RESEARCH_20261022.md), [học tài chính/khác biệt](MOBILE_LEARNING_DIFFERENTIATION_SPEC_20261022.md), [AI/dự báo](MOBILE_AI_FORECAST_INTEGRATION_SPEC_20261022.md). Đây là đặc tả đề xuất, **không chuyển bất kỳ khoảng trống nào thành đã triển khai**.

- **Có nền tảng:** tìm thấy model/flow/code liên quan, không có nghĩa đạt mọi yêu cầu mở rộng trong cùng mục catalogue.
- **Một phần:** có luồng cơ bản, còn khoảng trống được nêu cụ thể.
- **Chưa thấy triển khai:** chưa tìm thấy domain/schema/API/UI tương ứng trong vùng source mobile, Dart routes và migration đã rà; cần audit chi tiết trước khi code.
- **Chưa nghiệm thu:** có code nhưng còn đầu vào thiết bị/môi trường hay ca kiểm thử, không được gọi là “chưa làm toàn bộ”.
- **Ưu tiên đợt này:** Settings, Learning, insight/forecast, AI governance và assessment. **Sau đợt này:** backlog, không nằm trong estimate hoặc quyền triển khai hiện tại.

## 1. Tài khoản dữ liệu và tài chính

| ID | Catalogue | Nền tảng đang có | Phần còn thiếu hoặc phải làm tiếp | Quyết định |
| --- | --- | --- | --- | --- |
| GAP-01 | §3.1, §25, §27.2 | Email/password, Google, onboarding, hồ sơ, locale lưu được | UI chuyển vi/en, theo ngôn ngữ thiết bị, pipeline chuỗi/plural/format, nội dung legal có version | Ưu tiên |
| GAP-02 | §3.1, §24 | Light palette và component dùng chung | Theme system/light/dark toàn app, semantic tokens, status/navigation bar, contrast dark; không chỉ switch | Ưu tiên |
| GAP-03 | §3.1, §3.15 | App lock bằng sinh trắc/mã thiết bị, auth/recovery | Passkey/MFA đầy đủ, quản lý phiên/thiết bị và logout từ xa UI, cảnh báo đăng nhập lạ, đổi email/phone theo policy | Sau đợt này; khóa thiết bị thật vẫn cần nghiệm thu |
| GAP-04 | §3.1 | Persona/goal định tính và currency | Chu kỳ lương, nghĩa vụ cố định, financial week/month start, thu nhập tương lai có cấu trúc | Lịch thu/chi là dependency forecast; onboarding nâng cao sau |
| GAP-05 | §3.2 | Ví cash/bank/ewallet/other, opening balance, archive và transfer | Savings/credit/loan/investment/asset có semantics riêng, net worth, nhóm tài khoản, shared ownership | Sau; không chỉ thêm tên loại ví |
| GAP-06 | §3.2, §3.16 | Mã currency được lưu ở các account | Tỷ giá có nguồn/timestamp, quy đổi historical/base và ledger nhiều minor unit; nhiều màn còn format VND | Forecast đợt đầu cùng VND, không giả parity multi-currency |
| GAP-07 | §3.2, §3.14 | Nhập tay và .picket backup/restore | Bank/ecard/e-wallet sync qua provider được phép; CSV/OFX/QIF import với mapping, preview, dedupe và undo batch | Sau; CSV export không phải CSV import |
| GAP-08 | §3.2/3.3, §27.4 | Thu/chi/transfer/refund, splits, optimistic version, reconcile/close | Pending/posted/chargeback hoàn chỉnh, provenance/quality rõ, statement source; payment thẻ tín dụng không đếm sai | Adapter quality cần trước forecast; workflow nâng cao sau |
| GAP-09 | §3.3 | Tạo/sửa/archive, tìm/lọc, bulk và inbox, bản nháp phục vụ capture/offline | Templates/favorites, duplicate transaction/merge hoàn chỉnh, trash retention/restore UI, nhãn dự án/người/địa điểm, file/PDF nhiều attachment | Sau, không xóa các draft/duplicate cơ bản đã có |
| GAP-10 | §3.3 | Split theo danh mục và refund giới hạn | Chia theo người hưởng/trả, dự án, hoàn ứng/thuế, thuế/phí/tip/voucher đa cấp và trip grouping | Sau, khác household settlement |
| GAP-11 | §3.5 | CRUD danh mục mặc định/tùy chỉnh | Cây nhiều cấp, tags, merge/remap/sort, merchant normalization/aliases, rule engine AND/OR/priority/preview/undo và rule suggestion | Sau; AI gợi ý đầu tiên không tự tạo automation rule |
| GAP-12 | §3.6 | Budget/period, threshold, phương pháp chọn được, chuyển hạn mức, close/rollover | Weekly/pay-cycle/custom scope, phương pháp có semantics đầy đủ, shared budget, spending reservation, dự báo vượt và tác động Goal | Dự báo/pace cần trong đợt; phần còn lại sau |
| GAP-13 | §3.7 | Bill/subscription thủ công, payment liên kết và reminder | Auto-detect recurring, giá thay đổi/trial/duplicate service, đánh giá ít dùng, lịch lương, chọn nguồn thanh toán cho bill | Schedule và chống double-count cần cho forecast; detection sau |
| GAP-14 | §3.8, §27.6 | `profile.goal` là chuỗi mục đích cá nhân | Goal entity, contribution, target/date/progress, quỹ dự phòng/quỹ chìm; không coi chuỗi goal là chức năng tiết kiệm | Goal cơ bản tùy chọn trong đợt; full goals sau |
| GAP-15 | §3.8 | Ghi khoản chi/bill có thể mô tả thanh toán nợ | Debt model gốc/lãi/phí/tối thiểu, snowball/avalanche, lịch trả và mô phỏng lãi | Sau; bài học dùng ví dụ giả lập, không cần debt engine |

## 2. Camera hóa đơn đồ dùng và chia sẻ

| ID | Catalogue | Nền tảng đang có | Phần còn thiếu hoặc phải làm tiếp | Quyết định |
| --- | --- | --- | --- | --- |
| GAP-16 | §3.4 | Camera/library, giữ ảnh, xoay, ML Kit local và PP-OCR cloud, review, line items, duplicate receipt | Edge/blur/glare detection, crop/phối cảnh/contrast, nhiều trang/PDF/batch, source-region highlight, confidence từng field và loại chứng từ/ngôn ngữ rộng | Sau; không ghi OCR fallback/line items là chưa có |
| GAP-17 | §3.4 | Capture draft, phục hồi và hàng đợi theo owner, cache/ảnh riêng | Bốn camera mode, shopping trip/moment story, lockscreen widget/OS shortcut, cảnh báo chất lượng chuyên sâu | Sau; kiểm native ARM64 còn riêng |
| GAP-18 | §3.4/3.9 | Keepsake ảnh/ghi chú, warranty/return reminders, private media | Nhiều ảnh/serial/manual, room/album collections, background removal/collage, image search, lifecycle maintenance, resale/gift/lost status, cost-per-use | Sau; không xây shopping AI trước dữ liệu item |
| GAP-19 | §3.4/3.15 | Media private, encrypted local vault, signed URL, backup | Redaction địa chỉ/QR/face trước chia sẻ, audience preview, share expiry/revoke, lựa chọn giữ ảnh/data chi tiết | Sau khi có chia sẻ; AI không gửi ảnh gốc mặc định |
| GAP-20 | §3.11, §27.11 | Ownership cá nhân và staff riêng | Circle, invitations, feed/comment/reaction, household roles, shared expenses/settle-up, approval trẻ, shared goals/budgets, moderation/block/report | Sau toàn bộ; không tự gán pro thành Family |

## 3. Giáo dục AI và dự báo trọng tâm

| ID | Catalogue | Hiện trạng | Việc cần làm | Quyết định |
| --- | --- | --- | --- | --- |
| GAP-21 | §3.10, §18.1, §16.1 | Insights tháng/danh mục, chưa thấy Learning Hub | Catalogue bài có version và nguồn, learning path, micro-lesson, quiz/lời giải, progress guest/offline/cloud, gợi bài có lý do | Ưu tiên |
| GAP-22 | §18.2 | Chưa thấy minigame | Needs vs Wants có bối cảnh/tap alternative; Budget Tetris, Scam Detective, Receipt Recall | Game đầu trong đợt; 3 game còn lại sau |
| GAP-23 | §18.3, §21.3 | Chưa thấy rubric/assessment AI | Scenario đã duyệt, answer draft, rubric 5 tiêu chí, giải thích, version, regrade/report, quota và eval | Ưu tiên sau AI safety nền tảng |
| GAP-24 | §18.3, §21.4 | Chưa thấy Financial Fitness | Knowledge/Awareness/Planning/Resilience/Action, thiếu dữ liệu không chấm thấp, fairness và validation | Sau pilot, không dùng XP làm điểm tài chính |
| GAP-25 | §18.4, §22 | Reminder hiện có không phải challenge system | Challenge/progress/verification, một weekly challenge, XP event idempotent, basic badge, rest day và activity history | Bản tối thiểu trong đợt; economy phức tạp sau |
| GAP-26 | §18.4, §3.10 | Có số liệu tháng, chưa thấy Money Story | Weekly summary template + AI optional, ngôn ngữ trung tính, liên kết số liệu, một bài học/hành động, privacy | Bản rút gọn trong đợt; export/share/monthly family wrap sau |
| GAP-27 | §3.6/3.7/3.10, §18.5 | Chưa thấy engine forecast | Schedule thu/chi, quality/coverage, scope/currency, số dư dự kiến 7/30 ngày, scenario, dataAsOf, backtest | Ưu tiên, không giao phép tính cho LLM |
| GAP-28 | §3.10, §21 | OCR không phải Coach | Analytics facts, bounded Q&A, evidence refs, opt-in, provider adapter, schema validator, safe actions mở form | Ưu tiên |
| GAP-29 | §18.5 | Chưa thấy Financial Twin/Pause Before Purchase | What-if khoản mua với assumptions; full Twin theo goal/nợ, giờ lao động và cool-off workflow | Scenario nhỏ trong đợt, full Twin sau |
| GAP-30 | §18.5 | Chưa có dữ liệu item/usage/price đủ | Shopping Intelligence, giá lịch sử, tương tự, chi phí mỗi lần dùng, sửa/bán/tặng đề xuất | Sau, không gợi ý mua theo affiliate |
| GAP-31 | §21, §27.9 | Có consent OCR, chưa thấy consent purpose cho AI Coach | Consent/revoke versioned, minimization, AI jobs/output/report/audit/delete, prompt/model/rubric versions, refusal/fallback/kill switch | Bắt buộc trước AI |
| GAP-32 | §23.4, §21.8 | Có OCR quota nền tảng, chưa có AI usage ledger | AI feature entitlement, reserve/commit/release, concurrency/idempotency, token và tiền trần, retry không charge trùng, quota UX | Bắt buộc trước paid AI |

## 4. Trải nghiệm nền tảng thương mại và vận hành

| ID | Catalogue | Nền tảng đang có | Phần còn thiếu hoặc phải làm tiếp | Quyết định |
| --- | --- | --- | --- | --- |
| GAP-33 | §3.12 | In-app/local reminders bills, budgets, subscriptions, warranty/return | User control theo kênh/loại/quiet hours/digest toàn diện, widget/shortcut, action notification, advanced push/email | Nhắc học opt-in/frequency cap trong đợt; hệ sinh thái còn lại sau |
| GAP-34 | §3.13 | Tìm/lọc giao dịch; CSV/JSON/.picket export và restore | Search toàn cục OCR/items/tags/merchant/serial; saved filters, natural language; XLSX/PDF/ZIP packages và share read-only có expiry/access log | Sau; Coach query chỉ giới hạn, không tuyên bố global search |
| GAP-35 | §3.14 | Supabase Auth/Storage, Google OAuth, store verification, share/picker | Bank sync, email receipt ingestion, drive/calendar/maps enrichment, retailer/accounting/API/webhook | Sau; không mở rộng quyền email trong đợt AI |
| GAP-36 | §3.15 | RLS, encrypted cache/backup, device lock, data export/delete, admin audit | Privacy dashboard tập trung/retention theo đối tượng, security/session UX mở rộng, legal/cross-border review và AI privacy controls | AI/privacy controls bắt buộc; governance khác theo risk backlog |
| GAP-37 | §3.16, §26 | Accessibility policy, labels, nhiều ca chữ lớn/TalkBack có báo cáo; offline queue/cache | Audit dark/vi–en/new chart/game/rubric, reduce-motion và input alternatives toàn flow; native device acceptance còn lại | Regression bắt buộc cho màn thay đổi, không reset trạng thái cũ thành chưa làm |
| GAP-38 | §3.16 | Queue theo owner có retry/conflict và native recovery evidence | Wi-Fi-only/data/battery controls sâu hơn; queue/progress/reward/AI drafts mới; migrate backup/resource kinds | Chỉ phần phục vụ feature mới trong đợt |
| GAP-39 | §19/23 | free/plus/pro, verified purchase path/quota OCR/admin grants | Feature-level AI rights; Free/Premium/Family mapping chưa chốt, lifecycle trial/grace/downgrade đầy đủ và seats | AI rights trong đợt; không đổi plan identifier hoặc bật subscription mới ngầm |
| GAP-40 | §19/23 | Google Play code đã có | Track/license tester/products/sandbox và các bước Play thật chưa đủ nghiệm thu theo status | Dependency nếu thương mại hóa; có thể pilot không trả phí bằng quota thử |
| GAP-41 | §3.18 | Admin web user/OCR/partner/settings/audit hiện hữu; mobile không phải nơi admin vận hành | Content CMS, AI review/cost dashboard, support tickets, moderation và RBAC nhiều cấp | Không xây web mới; dùng Git-reviewed content và vận hành backend tối thiểu |
| GAP-42 | §24/25 | TS brand tokens/component, Vietnamese copy nhiều màn | Mobile semantic theme, localization pipeline, content inventory/legal versions; không sinh Flutter token | Ưu tiên, giữ export dùng chung của web tương thích |
| GAP-43 | §27 | Normalized schema/API cho nhiều nghiệp vụ, guest local, legacy snapshot compatibility | Learning/Goal/AI/Cashflow metadata/schema và lifecycle mới; compatibility client/backup cũ | Migration theo cụm nhỏ, không viết lại ledger |
| GAP-44 | §28 | ocr_events và log/audit kỹ thuật | Learning/AI/forecast events, retention/behavior baseline, cost/safety/fairness, consent-aware analytics | Tập event nhỏ trong pilot; không thu raw finance/chat |
| GAP-45 | §15, §29 | Catalogue mô tả proto-persona và research plan | Chưa có bằng chứng trong lượt này của phỏng vấn hợp lệ/hiệu quả bài học/giá/quota/bản địa hóa score | Phải thực hiện và lưu bằng chứng; không biến giả thuyết thành research result |

## 5. Những điều không nên làm lại hoặc nhầm là đã xong

1. Không chuyển Dart backend sang Flutter/Expo; Dart backend vẫn đúng kiến trúc hiện tại.
2. Không coi đổi `locale` database là dịch toàn app, hoặc đổi `userInterfaceStyle` là đã có dark theme toàn màn.
3. Không xây lại thu/chi, split/refund, OCR fallback/line items, encrypted vault, outbox và backup chỉ vì catalogue mô tả snapshot cũ.
4. Không gọi `profile.goal` là Goal tracker; không gọi Insights thống kê là dự báo; không gọi OCR là AI Coach.
5. Không coi chọn phương pháp envelope/50-30-20 trong UI là đã có mọi semantics ngân sách nâng cao của catalogue.
6. Không dùng Free/Premium/Family quota đề xuất 15 OCR/tháng hay 5 assessment/tháng làm config production mặc định. Runtime đang có entitlement khác; cần phê duyệt/migration.
7. Không gán tài khoản `pro` thành Family tự động: chưa có household, seats, dữ liệu trẻ em hay quyền chia sẻ.
8. Không đóng các gate ARM64/Google Play/staging chỉ nhờ unit test, model demo hoặc bản kế hoạch.

## 6. Thứ tự backlog được khuyến nghị

**Đợt ưu tiên:** GAP-01/02/21/22 phần đầu/23/25 phần đầu/26/27/28/31/32/42/44; kèm dependency GAP-04/08/13/37/38/43. GAP-14 và GAP-29 bản nhỏ cần chốt scope rõ.

**Đợt sau khi có pilot:** Financial Fitness, goals đầy đủ, debt planning, Full Financial Twin, games còn lại, recurring detection, rule engine/merchant/tags, import và báo cáo nâng cao.

**Đợt hệ sinh thái riêng:** circle/household/Family/trẻ em, bank/email integrations, sharing/moderation, widgets và shopping intelligence. Mỗi nhóm cần roadmap, security/legal và estimate riêng; không gộp vào 12–20 tuần dự phòng của đợt ưu tiên hoặc thời gian pilot bổ sung.

Nguồn code đã đọc gồm `apps/mobile/src/app`, `features/profile`, `features/transactions`, `core/local`, `core/sync`, `core/ui`, `apps/api/routes/v1`, `apps/api/lib/src/profile_contract.dart`, `packages/domain-ts`, `packages/design-tokens`, `supabase/migrations`. Cần lập ticket mức từng rule/màn/test khi chủ dự án duyệt phạm vi; bảng này không tuyên bố một cuộc audit dòng-code exhaustive cho mọi ý tưởng trong catalogue.
