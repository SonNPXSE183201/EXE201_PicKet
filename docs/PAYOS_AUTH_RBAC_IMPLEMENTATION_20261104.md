# PayOS, SĐT và phân quyền — triển khai source 04/11/2026

Trạng thái cập nhật: source đã kiểm thử, API/web/worker đã deploy và migration đã áp trên Supabase production. PayOS/PIN đang bật; Play Billing được giữ. Đã nghiệm thu [tiền thật 19.000đ và cấp Plus cho đơn #1000000001](PAYOS_LIVE_PAYMENT_ACCEPTANCE_20261104.md); SMS/OTP chưa tích hợp theo yêu cầu. Xem [nghiệm thu production và phần còn lại](PAYOS_PRODUCTION_DEPLOYMENT_20261104.md). Báo cáo này mô tả phạm vi implementation của [kế hoạch](PLAN_PAYOS_AUTH_RBAC_20261103.md).

## Giá đã được chủ dự án xác nhận

| SKU | Kỳ | Giá VND |
|---|---|---:|
| picket_plus_monthly | Plus 1 tháng | 19.000 |
| picket_plus_yearly | Plus 1 năm | 199.000 |
| picket_pro_monthly | Pro 1 tháng | 39.000 |
| picket_pro_yearly | Pro 1 năm | 499.000 |

Giá nằm trong `billing_catalog`, không lấy từ request client. Đây là giá PayOS; không tự thay giá sản phẩm Google Play. Kỳ hạn dùng tháng lịch. MVP chặn mua khi còn gói trả phí và chặn nhiều đơn pending cùng user; chưa có prorating, nâng/hạ gói giữa kỳ hoặc tự trích tiền định kỳ.

## Hành vi đã có

- Dart REST adapter dùng `http`, HMAC-SHA256 từ `crypto`; kiểm chữ ký create/get/cancel và toàn bộ signed data của webhook theo SDK PayOS. Từ chối URL checkout không thuộc HTTPS PayOS.
- Tạo đơn với `Idempotency-Key`, snapshot giá server, orderCode cố định. Khi không rõ kết quả tạo link, có thể retry cùng key hoặc kiểm tra lại đúng đơn. Return URL chỉ đọc trạng thái, không cấp gói theo query string.
- Lưu đơn, từng khoản nhận có reference duy nhất, timeline sự kiện và entitlement riêng. Transaction DB chống ghi/cấp trùng. Đối chiếu mã thành công, tiền VND, paymentLinkId, tài khoản nhận. Thiếu/thừa, muộn hoặc xung đột gói vào `review`; hủy đến muộn không hạ trạng thái đã trả tiền.
- `current_plan()` đọc thêm PayOS, giữ Play và manual grants. Dữ liệu tiền nhận không cascade mất khi xóa tài khoản; liên kết user được đặt null.
- Web `/billing`, `/billing/return`: danh mục, tạo/mở checkout, kiểm tra, hủy link và lịch sử. APK trực tiếp dùng màn PayOS. Metro chọn module Play riêng khi `PICKET_PLAY_BUILD=1`; test kiểm tra resolver và giữ các kiểm thử khôi phục/mua Play hiện có.
- `/admin/revenue`: hôm nay/tháng/năm/khoảng thời gian, nhóm ngày/tháng/năm theo `Asia/Ho_Chi_Minh`. Hiện tổng là **tiền thực nhận PayOS**, gồm khoản cần đối soát; chưa trừ hoàn tiền, không cộng lẫn Google Play hay thu chi cá nhân.
- `/admin/payments`: danh sách đơn và timeline; phân trang theo thời gian + UUID. Chỉ trả thông tin vận hành cần thiết, không lộ payload thô, key hoặc số tài khoản đối ứng.
- Quyền trong DB: danh mục chức năng đọc/ghi, `revenue.read`, `payments.read`, `permissions.manage`, nhóm tùy chỉnh, thành viên nhóm có hạn, allow/deny riêng có hạn. Deny riêng đang hiệu lực ghi đè quyền nhóm. Quyền owner gốc được bảo toàn; không có role giảng viên hardcode.
- `/admin/permissions`: chọn UUID user bất kỳ, cấp/thu hồi từng quyền, tạo/sửa nhóm, thêm/gỡ thành viên. Thay đổi cần MFA và lý do, ghi audit; sửa rule/nhóm kiểm revision. Không được tự thay quyền riêng/thành viên của mình.
- User có quyền portal vẫn được dùng app cá nhân trên mobile/web. Điều hướng và middleware không còn bắt user quản trị chỉ dùng web.
- Web/mobile đăng nhập **email hoặc SĐT + mật khẩu**, giữ nút Google để tài khoản cũ tiếp tục dùng được trong giai đoạn chưa có SMS. Email trim/lowercase như luồng cũ, số Việt Nam chuẩn hóa sang E.164, mật khẩu giữ nguyên. Chỉ gửi một loại identifier vào Supabase, không tạo/link user hoặc đổi UUID. Backend chấp nhận tài khoản đã xác minh email **hoặc** SĐT. Admin tìm kiếm/xuất có thông tin SĐT; reset bằng email không bị gọi với email null của user phone-only.
- PIN web: browser token ngẫu nhiên trong HttpOnly cookie; verifier HMAC có server key; refresh token mã hóa AES-GCM và gắn browser. Bật PIN ngay sau đăng nhập gần đây, khóa phiên và xóa cookie Auth của đúng project. Có thể khóa lại bằng PIN đã lưu. Backend chặn phiên đang khóa; mở khóa dùng refresh chính thức của Supabase và kiểm đúng user/session. Tối đa 5 lần thử/15 phút, chống thử đồng thời, hạn binding 30 ngày, đăng xuất thu hồi binding. Không tự ký JWT hoặc giả đăng nhập qua admin API.
- Mobile tiếp tục dùng sinh trắc học và SecureStore trong `DeviceLockProvider` hiện có để mở phiên đã đăng nhập; không quảng bá vân tay thay cho đăng nhập cloud lần đầu.

## SMS và chuyển tài khoản

Chưa có gửi SMS/Zalo OTP, đăng ký phone OTP, phục hồi mật khẩu bằng SĐT hoặc đổi SĐT có xác minh. Màn đăng ký SĐT mới vẫn hiển thị chưa sẵn sàng theo phạm vi đã để lại. Đăng nhập email và phục hồi email cũ được giữ; không đổi trạng thái xác minh hoặc UUID tự động.

Đã bổ sung form đăng nhập tương thích email/SĐT trong source ngày 04/11 để không bắt user email-only chuyển đổi ngay khi deploy. Nếu sau này bỏ email, cần xác minh SĐT và gắn vào đúng UUID hiện tại; chưa thực hiện hàng loạt trên production. Google OAuth cũ được giữ tương thích. Không bật auto-confirm phone để bỏ qua bước này.

## File và cấu hình vận hành

Migration mới: [`20261103173421_payos_auth_permissions.sql`](../supabase/migrations/20261103173421_payos_auth_permissions.sql). Tên được CLI tạo theo UTC ngày 03/11; báo cáo dùng ngày Việt Nam 04/11. Migration cũ không bị sửa.

Backend `.env` / `deploy/.env.production`, chỉ điền trên máy vận hành:

```dotenv
PAYOS_ENABLED=false
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYOS_ACCOUNT_NUMBER=
PAYOS_RETURN_URL=https://app.picketfinance.com/billing/return
PAYOS_WORKER_SECRET=
QUICK_LOGIN_ENABLED=false
QUICK_LOGIN_ENCRYPTION_KEY=
```

`SUPABASE_SECRET_KEY` backend cũng cần cho ghi nhận receipt, vault và đối soát. `PAYOS_ACCOUNT_NUMBER` là tài khoản nhận chính, chuỗi số nguyên vẹn không có dấu cách. Hiện adapter đối chiếu một tài khoản; phải bổ sung allowlist trước khi dùng ngân hàng dự phòng.

`PAYOS_WORKER_SECRET`: ít nhất 32 ký tự ngẫu nhiên. `QUICK_LOGIN_ENCRYPTION_KEY`: 32 byte ngẫu nhiên mã hóa base64. Không dùng chung hai khóa, không đưa vào `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`, không gửi key trong chat hoặc commit. Đổi khóa PIN làm vault cũ không giải mã được; cần thu hồi session/binding tương ứng và cho user đăng nhập lại.

Compose đã truyền các biến backend. Worker profile `admin` gọi API nội bộ `/v1/billing/payos/reconcile` mỗi chu kỳ khi PayOS được bật; mỗi batch tối đa 30 đơn, luân phiên theo lần kiểm tra, retry sau 5 phút trong cửa sổ 30 ngày. Worker chỉ kiểm tra/cập nhật đơn có sẵn, không tạo giao dịch hoặc chuyển tiền. Đơn cũ hơn cần đối soát thủ công.

## Rollout và nghiệm thu còn cần môi trường thật

Các bước schema/deploy/webhook/PIN, một khoản tiền thật và [phân quyền/MFA trên portal](RBAC_PRODUCTION_ACCEPTANCE_20261104.md) đã được nghiệm thu. Còn APK native mới; danh sách này đồng thời giữ trình tự vận hành cho lần triển khai sau.

1. Giữ form tương thích email/SĐT đã triển khai và kiểm thử đăng nhập bằng tài khoản QA trên môi trường thật; không tự sửa `phone_confirmed_at`. Chuyển email-only sang phone-only là hạng mục sau khi có OTP, không phải điều kiện bắt user chuyển ngay.
2. Đã backup DB, đối chiếu SHA-256 bản local/VPS và khôi phục vào Supabase PostgreSQL cô lập. Migration và SQL test đã qua; nội dung 86 bảng cũ giữ nguyên. Chi tiết tại [báo cáo preflight](PAYOS_PRODUCTION_PREFLIGHT_20261104.md). Còn áp migration production và chạy advisors sau migration.
3. Deploy Dart API và web cùng schema mới. Điền credentials backend; để `PAYOS_ENABLED=false` trong lúc cấu hình. Màn PIN chỉ hoạt động khi backend được cấu hình và bật cờ riêng.
4. Webhook PayOS `https://api.picketfinance.com/v1/billing/payos/webhook` đã được đăng ký thành công qua `/confirm-webhook` trong lượt deploy được yêu cầu tiếp tục. Sample/đơn lạ được ACK nhưng không cấp gói.
5. Sau khi endpoint sẵn sàng mới bật PayOS, mở worker profile `admin` và nghiệm thu khoản tiền nhỏ được chủ dự án duyệt. PayOS không có sandbox riêng. Soát receipt/reference, trạng thái đơn, entitlement và doanh thu; lặp webhook không được tăng gói/tiền hai lần.
6. Kiểm thử browser thật với Supabase: bật PIN, khóa, mở bằng PIN sai/đúng, refresh phiên, khóa lại, logout, revoked/suspended session và hết hạn binding. Các nhánh crypto/Auth transport và SQL đã có test mô phỏng; chưa thay thế nghiệm thu Supabase cookie/session thực tế.
7. Build QA Android theo skill APK rồi kiểm trên emulator/device. Chưa tạo APK mới trong lượt triển khai code này. Khi build Play phải đặt `PICKET_PLAY_BUILD=1` ở cả bước prebuild và Gradle; không bật PayOS bằng remote flag trong artifact Play.

Tắt mua mới: `PAYOS_ENABLED=false`; handler webhook vẫn nhận receipt hợp lệ nếu credentials còn được cấu hình. Không xóa bảng/grant hoặc rollback resolver làm mất quyền đã bán. Không xóa vault đang khóa để mở lại token cũ: ghi revocation trước, sau đó xóa binding. Rollback image/Auth cần phối hợp với schema mới; không giả định có thể hạ toàn bộ về code email/staff cũ mà không ảnh hưởng người dùng.

## Bằng chứng kiểm thử

| Phần | Kiểm tra |
|---|---|
| PayOS chữ ký | Hai golden vectors từ SDK chính thức; payload bị sửa bị từ chối; response unsigned bị từ chối |
| PayOS service | Giá và chữ ký request, mô tả ngắn, phục hồi cùng orderCode, chặn amount sai, nhận webhook khi đóng checkout mới, thứ tự receipt/trạng thái khi đối soát |
| PIN | AES-GCM/AAD và sai key/browser, verifier riêng theo browser, enrollment gần đây, xoay refresh, PIN sai không refresh, limiter, khóa lại và revoke |
| SQL | Giá đã duyệt, phone-only verified, search phone, user/group grants, deny precedence, self-escalation, revision cũ, owner isolation, sai bank/currency/code, duplicate receipt/grant, paid không hạ bởi cancel, entitlement PayOS, PIN khóa/lease/5 lần/revoke |
| Hồi quy | Mobile 1.044 test; web 59 test; DB 15 suite SQL cùng các test legacy và quota; worker Python 12 test |
| Build/QA | Next production build, typecheck/lint; Dart analyze, Dart Frog production build và compile executable; Playwright desktop/mobile dùng dev mock, không tạo payment thật |

Các lệnh và kết quả cuối cùng được ghi trong [báo cáo kiểm tra](PAYOS_AUTH_RBAC_VERIFICATION_20261104.md). Không gọi toàn bộ luồng production đã nghiệm thu chỉ từ test mô phỏng.

Nguồn contract: [PayOS API](https://payos.vn/docs/api/), [SDK payment canonicalization](https://github.com/payOSHQ/payos-lib-node/blob/main/src/utils/convert-obj-to-query-str.ts), [golden vectors](https://github.com/payOSHQ/payos-lib-node/blob/main/tests/crypto/testCases.json), [Supabase phone/password](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).
