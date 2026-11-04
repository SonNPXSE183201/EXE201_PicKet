# APK QA PayOS/Auth/RBAC — 04/11/2026

Trạng thái: đã build/cài APK và hoàn tất các ca Google, email/mật khẩu, sinh trắc học, PayOS và cấp/thu hồi quyền bằng tài khoản thật trên **Redmi 7**. Ca SĐT/mật khẩu còn phụ thuộc Phone provider/tài khoản phù hợp; OTP/SMS tiếp tục hoãn theo yêu cầu. Kết quả máy ảo/tài khoản tạm ở giai đoạn trước không thay thế nghiệm thu Redmi. Không commit, push hoặc tạo PR.

## Artifact và nguồn build

| Thuộc tính | Giá trị |
| --- | --- |
| Package | `com.picket.mobile.bugqa` |
| Version | `1.0.14-payos-qa`, code `59` |
| ABI điện thoại | `arm64-v8a` |
| Source | `dev` tại `f2a9da2aa7cf091409e1e9bde300ff833f9517ab`, kèm sửa local trên `fix/mobile-payos-qa` |
| APK | `../.artifacts/releases/picket-qa-payos-auth-arm64-v8a.apk` |
| Build record | `../.artifacts/releases/picket-qa-payos-auth-arm64-v8a.json` |
| SHA-256 | `306ee4bd684d6588c03d0567eb82808ddd18cb3879f22fcb806f09c00c3210c7` |
| Kích thước | 118.852.048 bytes |
| API | `https://api.picketfinance.com` |
| Kênh mua | PayOS cho APK trực tiếp |

APK được kiểm bằng `aapt2`, `apksigner`, danh sách thư viện native và source map. Source map của các file đã sửa khớp source hiện tại. Chữ ký khớp bản QA đã cài trên Redmi, nên có thể cập nhật bằng `adb install -r`.

## Thay đổi local phục vụ nghiệm thu

- Màn PayOS hiển thị gói hiện tại; chặn tạo đơn mới khi đang có gói trả phí.
- Bổ sung hủy đơn chưa thanh toán. Sau một checkout thành công, lần mua mới dùng idempotency key mới; retry khi mất phản hồi vẫn dùng key cũ.
- Khi quay lại app hoặc đổi access token của cùng owner, giữ cây điều hướng và trạng thái khóa thiết bị trong lúc kiểm tra lại quyền. Nội dung bị ẩn và chặn tương tác/truy cập hỗ trợ cho đến khi xác minh xong. Đổi owner hoặc bị từ chối quyền không mở dữ liệu chưa xác minh.

## Kiểm tra build/source

- `npm run test:mobile`: **1.061 PASS**, không skip/fail.
- Auth/Billing/Security/Config/Updates focused: **113 PASS**.
- Mobile typecheck và lint: PASS.
- Release preflight: HTTPS API/Supabase, không dùng server secret làm public key.
- Export Android với `PICKET_PLAY_BUILD=1`: chứa Play Billing và adapter cập nhật Play; không chứa màn PayOS. Export này cũng chứa sửa lỗi chuyển nền mới nhất. Không tạo/upload bản phát hành Google Play.
- Có log RED/GREEN cho các ca thanh toán và giữ điều hướng khi kiểm tra lại quyền.

## Nghiệm thu tài khoản thật trên Redmi 7

| Ca | Trạng thái / bằng chứng |
| --- | --- |
| Cài đè và mở APK | PASS; từ QA code 58 lên 59. Thời điểm cài đầu tiên vẫn là 31/10/2026 14:36:59; cập nhật 04/11/2026 05:18:49 |
| Giữ phiên và dữ liệu | PASS; tài khoản Google cũ vẫn đăng nhập, số ví và tổng số dư giữ nguyên qua cập nhật |
| Gói đã thanh toán | PASS; màn PayOS trên APK hiển thị PLUS và đơn `1000000001`, 19.000đ, Đã thanh toán; nút mua mới bị khóa đúng giới hạn MVP |
| Đăng nhập Google mới | PASS; sau đăng xuất local, nút Google trên APK mở Chrome Custom Tab, chọn tài khoản cũ và chọn Picket QA trong chooser Android. Quay lại đúng tài khoản Plus/4 ví; `phone-google-login.png` |
| Email/mật khẩu | PASS trên Redmi bằng tài khoản admin thật; đăng nhập mới và vào trang chủ tài chính, không đổi hồ sơ/mật khẩu |
| Đăng xuất/đổi tài khoản | PASS qua UI native: đăng xuất local khỏi tài khoản Google, đăng nhập email admin rồi trở lại đúng tài khoản Google Plus. Phiên Google test được giữ đăng nhập khi bàn giao |
| SĐT/mật khẩu | Chưa có tài khoản phù hợp: tài khoản Plus chưa xác minh SĐT và Phone provider hiện tắt. Giữ nguyên cấu hình production; không bật auto-confirm hoặc SMS |
| Bật/khóa/mở/hủy sinh trắc | PASS trên Redmi: bật bằng vân tay thật, cold start khóa dữ liệu, hủy hộp thoại vẫn khóa, mở khóa thành công, chuyển nền quá 30 giây khóa lại. Người dùng xác thực và tắt khóa bằng UI để khôi phục trạng thái ban đầu; đã quan sát switch OFF. Bằng chứng `phone-biometric-enabled.png`, `phone-cold-locked.png`, `phone-biometric-cancelled.png`, `phone-biometric-unlocked.png`, `phone-background-locked.png`, `phone-biometric-restored-off.png` |
| Checkout/quay lại/kiểm tra/hủy đơn | PASS trên Redmi với admin thật đang ở gói Free: tạo đơn `1000000004`, 19.000đ; mở QR PayOS trong Chrome; Back về đúng màn/đúng vị trí; bấm kiểm tra rồi hủy. Backend xác nhận `cancelled`; không chuyển tiền |
| Admin dùng tài chính cá nhân | PASS; trang chủ mở được 1 ví, số dư 0đ của chính admin, không tạo/sửa giao dịch. Bằng chứng `phone-admin-finance.png` |
| Cấp/thu hồi quyền khi app mở | **PASS bằng instrumentation chạy trong tiến trình gói QA trên Redmi**. Dùng chính token native hiện có, API doanh thu đổi **403 → 200 → 403** qua trước cấp/cấp/thu hồi; sau khôi phục vẫn 403. API quyền và tài khoản tài chính cá nhân luôn 200, `mobileAllowed=true`. Hash token giữ nguyên cả 4 pha, PID quan sát giữa cấp và thu hồi là `10766`, không đăng nhập/refresh bằng harness. Giao diện giữ nguyên 4 ví. Bằng chứng `native-rbac-proof.json`, `native-probe/results.jsonl`, `phone-native-read-granted.png`, `phone-native-read-revoked.png` |

Thông tin đăng nhập không được ghi trong báo cáo hoặc build record. Admin có MFA; mọi thao tác quản trị nhạy cảm phải đi qua xác thực hiện có.

Baseline quyền riêng và thành viên nhóm của tài khoản test đều rỗng. Sau hai RPC quản trị có MFA, thao tác dọn có điều kiện chỉ xóa dòng `revenue.read` do lượt QA tạo (đúng user, revision 2, `allowed=false`, `expires_at=null`), rồi ghi audit khôi phục. Không để lại dòng từ chối làm thay đổi quyền nhóm trong tương lai. So sánh baseline sau dọn khớp chính xác; bằng chứng `real-permission-baseline.json`, `real-permission-grant.json`, `real-permission-revoke.json`, `real-permission-restored.json`.

Instrumentation chỉ đọc nằm ở `.artifacts/apk-qa-payos-auth/native-probe/`, ký cùng chứng chỉ và cố định target `com.picket.mobile.bugqa`. Người dùng cài harness trực tiếp trên Redmi sau khi MIUI từ chối cài mới qua ADB. Bản kiểm tra cuối code 3 giữ token trong bộ nhớ của tiến trình QA, không xuất credential, chỉ ghi trạng thái HTTP và hash token để đối chiếu. Endpoint doanh thu được gọi với `period=day&bucket=day`; không lưu payload doanh thu hay tài chính. Bộ thử không có API thay đổi dữ liệu; cấp/thu hồi do phiên admin AAL2 thực hiện riêng. Đây là kiểm tra API từ ngữ cảnh native thực, kèm kiểm tra giao diện tài chính; không phải màn doanh thu quản trị native (menu quản trị vẫn ở web). Tài liệu nền tảng: https://developer.android.com/reference/android/app/Instrumentation.

Đã kết thúc instrumentation, gỡ `com.picket.mobile.bugqa.test`, xóa file APK tải xuống và các file lệnh/kết quả tạm trên điện thoại sau khi giữ bằng chứng ở máy phát triển. Gói QA chính vẫn code 59, cùng SHA-256 đã lưu; mở lại được đúng tài khoản test. Đã đăng xuất **cục bộ đúng phiên admin trình duyệt do QA tạo**, không thu hồi các phiên khác; đã bỏ cổng ADB forwarding dùng cho CDP. Trạng thái cuối: `final-state.json`, `phone-final.png`.

## Phạm vi production và dữ liệu thử

- Đơn thật `1000000001` và quyền Plus được giữ nguyên.
- Trước khi có ràng buộc chỉ dùng tài khoản thật/Redmi, giai đoạn kiểm thử máy ảo đã tạo hai tài khoản tạm gắn nhãn task và hai đơn `1000000002`, `1000000003`. Cả hai đơn đã hủy, không chuyển tiền. Các kết quả này chỉ là bằng chứng giai đoạn trước.
- Sau ràng buộc mới, không thay đổi hồ sơ/mật khẩu/dữ liệu tài chính/gói của tài khoản production. Ngoại lệ được cho phép là cấp/thu hồi tạm quyền đọc trên tài khoản test Redmi rồi khôi phục. Việc xử lý hai fixture tạm cần tôn trọng ràng buộc mới.
- Không thay migration, giá bán, tài khoản ngân hàng nhận, webhook hoặc cấu hình OTP trong lượt QA mobile.

## Dọn output

Đã xác minh lại SHA-256 APK canonical và hash của cả 5 source/test trong build record; đã chạy `npm run cleanup:generated:apply`, xóa **30 thư mục generated, khoảng 5,1 GiB**. Không có build hoặc dev server đang dùng các output này.

Còn khoảng 308 MB ở 3 module build cục bộ, export kiểm tra kênh Play và APK cũ dùng để đối chiếu chữ ký. Lệnh dọn bổ sung (bao gồm snapshot/log trình duyệt tạm) bị bộ duyệt tự động chặn với thông báo `blocked by policy`, không nêu chi tiết; giữ lại các đường dẫn đó, không thử lại bằng công cụ khác. APK hiện tại và các backup phát hành vẫn được giữ nguyên.

Đã bỏ riêng bàn phím English (US) thêm tạm cho thao tác ADB; Gboard trở về chỉ tiếng Việt (Việt Nam), QWERTY như ban đầu (`phone-keyboard-restored.png`). Khóa sinh trắc học đã tắt lại qua xác thực phần cứng của người dùng. Phiên Google đã đăng nhập lại đúng tài khoản Plus sau ca email admin; native đã trở lại tài khoản test ban đầu.

Bằng chứng riêng tư và log được lưu tại `../.artifacts/apk-qa-payos-auth/`. Ảnh có dữ liệu tài khoản thật không được đưa vào assets hoặc commit.
