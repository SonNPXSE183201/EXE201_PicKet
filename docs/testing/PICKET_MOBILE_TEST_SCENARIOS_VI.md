# Kịch bản kiểm thử ứng dụng PicKet trên Android

Cập nhật theo source và tài liệu dự án ngày **01/11/2026**. Đây là bộ kịch bản kiểm thử thủ công và hồi quy cho ứng dụng mobile; không phải kết quả đã chạy. Ghi kết quả thực tế vào cột trạng thái/bằng chứng khi thực thi, không đánh dấu PASS chỉ vì test tự động pass.

## 1. Phạm vi và trạng thái cần xác nhận

- Phạm vi: ứng dụng PicKet Android — onboarding, khách và tài khoản cloud, dashboard, giao dịch, ví, danh mục, ngân sách/kế hoạch, hóa đơn và OCR, đồng bộ/offline, hồ sơ/cài đặt, xuất/khôi phục, xóa tài khoản, thông báo và Google Play Billing.
- Không thuộc phạm vi: landing page, web app/admin portal, API/Supabase kiểm thử độc lập, APKPure và thao tác phát hành production. Tài liệu có thêm checklist chuẩn bị nhân viên cho closed test, nhưng không tự mở track hoặc phát hành bản nháp.
- Snapshot 01/11: source khai báo **1.0.14 (28)**; Google Play Internal và closed testing (`alpha`) đều có code 28 `completed`, rollout 100%; beta/production chưa có release. Landing public đang phục vụ APK code 28. APKPure có artifact nhưng trạng thái portal chưa xác minh. Đọc [readback cửa hàng](../migration/STORE_RELEASE_READBACK_20261101.md) trước khi thực hiện bất kỳ bước phát hành nào.
- Package mặc định trong `apps/mobile/app.json` là `com.picket.mobile`. Kiểm thử thiết bị thật chỉ dùng biến thể QA độc lập `com.picket.mobile.bugqa`; tuyệt đối không gỡ, cài đè, xóa dữ liệu hoặc `pm clear` package production.
- Một số route có hậu tố `-preview` hoặc bị chặn ngoài development, gồm `cashflow-preview`, `forecast-observations-preview`, `learning-preview`, `settings-preview`, `weekly-story-preview`. Không tính chúng là tính năng release nếu build đang thử không mở chúng theo cấu hình phát hành.

## 2. Cách ghi nhận và quy tắc dừng

Mỗi ca ghi: **ID | ngày/giờ | thiết bị/Android | phiên bản + versionCode | package | tài khoản/fixture giả danh | bước chạy | kết quả mong đợi | kết quả thực tế | PASS/FAIL/BLOCKED/N/A | ảnh/log/video**.

- **PASS**: thực hiện đủ bước và quan sát đúng kết quả mong đợi trên build/thiết bị được ghi lại.
- **FAIL**: tái hiện sai lệch; ghi bước tái hiện, dữ liệu đầu vào và bằng chứng. Không sửa dữ liệu bằng tay để làm ca thành PASS.
- **BLOCKED**: thiếu tester, quyền, mạng, track, email, thiết bị hoặc dịch vụ ngoài; nêu phụ thuộc cụ thể.
- **N/A**: tính năng không có trong đúng build đang thử; dẫn căn cứ.
- Dùng tài khoản QA và dữ liệu giả. Không nhập thông tin tài chính thật, không mua bằng tiền thật, không lưu hóa đơn corpus thành giao dịch, không dùng tài khoản admin trên mobile.
- Trước ca phá hủy (xóa tài khoản, khôi phục bản sao, dọn dữ liệu), xác nhận đang ở tài khoản QA dùng riêng và đã lưu bằng chứng cần thiết.
- Với lỗi mất dữ liệu, sai số dư, sai chủ sở hữu dữ liệu, vượt quota, giao dịch bị lưu khi chưa xác nhận, hoặc đụng package production: dừng ca, chụp bằng chứng và không tiếp tục ghi dữ liệu.

## 3. Thiết bị, tài khoản và dữ liệu chuẩn bị

### Thiết bị

1. **Thiết bị chính**: Redmi 7 ARM64, ghi model, Android, free storage, battery, mạng và build QA trước khi bắt đầu; dùng để nghiệm thu camera, gallery, OCR và luồng thao tác thực tế.
2. **Thiết bị phụ**: Android khác hoặc emulator chỉ để kiểm tra bố cục/kích thước màn hình và hồi quy. Emulator không thay thế Redmi cho camera, ML Kit, nhiệt độ, hiệu năng hoặc Play Billing.
3. **Mạng**: Wi-Fi ổn định; sau đó lặp lại các ca sync cần thiết trên mạng di động hoặc bật/tắt mạng có chủ đích.
4. **Build**: cài đúng APK QA có package `com.picket.mobile.bugqa`; ghi SHA-256 của APK và nguồn build. Kiểm tra màn Hồ sơ/About hiển thị đúng phiên bản. Nếu package QA không được tạo từ source cần nghiệm thu, không coi kết quả đó là bằng chứng cho source này.

### Tài khoản/fixture

- `QA-GUEST`: phiên khách sạch, chỉ dùng dữ liệu local.
- `QA-A` và `QA-B`: hai tài khoản thử nghiệm cloud riêng để xác minh cô lập dữ liệu, đổi tài khoản, sync và recovery. Có quyền truy cập inbox xác minh email nếu kiểm thử đăng ký/khôi phục.
- `QA-PLAY`: tester đã đăng ký License Testing, đã tham gia đúng Play track, cài ứng dụng từ link Play phù hợp và ở quốc gia hỗ trợ sản phẩm. Không dùng APK sideload để kết luận Play Billing sandbox hoạt động.
- Nhân viên vào closed test bằng **Google account riêng của họ**; tài khoản Google Play này khác với tài khoản PicKet đăng nhập trong app. Không dùng chung mật khẩu, OTP hoặc một Google account cho nhiều nhân viên.
- Tạo fixture với tiền VND nguyên, tên hư cấu có tiền tố `QA-<ngày>`. Trước khi bắt đầu chụp dashboard/số dư rỗng để làm baseline.
- Cho bộ tính toán kiểm tra số dư: ví Tiền mặt **1.000.000đ**, ví Ngân hàng **300.000đ**; giao dịch chi **12.345đ**; chuyển ví **100.000đ**. Tổng tài sản chỉ đổi bởi thu/chi, còn chuyển ví chỉ đổi phân bổ giữa ví.
- Fixture ngân sách: hạn mức **500.000đ**, thực chi **0đ**, thêm khoản chi **125.000đ** thuộc đúng danh mục. Ngưỡng và chu kỳ theo lựa chọn của màn hình; ghi chính xác cấu hình khi chạy.
- Dùng bản sao 40 ảnh trong `Bill/` cho corpus; không sửa, nén lại hoặc đổi ảnh nguồn. Lưu manifest SHA-256 để chứng minh ảnh test đúng file gốc.

### Cohort tài khoản nhân viên cho closed test

Readback ngày 01/11/2026: closed-testing/alpha có release **1.0.14/code 28 `completed`** và một Google Group được gán vào track. Publisher API không cho biết số thành viên nhóm, ai đã opt-in hay số ngày tham gia liên tục; chưa thể kết luận cohort đã đáp ứng yêu cầu tester/14 ngày. Có **3 license tester** được xác nhận trong danh sách “Picket Internal” theo readback 31/10; đây là license-testing configuration riêng, không phải số tester alpha. Không lưu email thật trong tài liệu.

**Không tạo email/mật khẩu giả và không ghi thông tin đăng nhập vào tài liệu dự án.** Mỗi nhân viên cung cấp địa chỉ Google account họ sẽ thực sự dùng trong Play Store trên điện thoại. Email phải khớp chính xác với danh sách closed-test hoặc là thành viên Google Group được chọn. Nhân viên tự đăng nhập; quản trị viên chỉ thêm địa chỉ vào tester list và gửi opt-in link.

#### Bảng roster cần điền ngoài repo

Lưu roster có email thật trong nơi hạn chế quyền truy cập của nhóm, không commit vào Git hoặc đưa vào screenshot/log. Các dòng NV-01…NV-15 dưới đây là **ô chờ điền, không phải tài khoản đã tạo hay tester đã mời**. Khuyến nghị chuẩn bị 15 nhân viên thật để dự phòng vắng mặt; nếu Play Console áp điều kiện production access cho tài khoản developer cá nhân mới, cần tối thiểu 12 tester thực opt-in liên tục đủ 14 ngày. Kiểm tra điều kiện đúng loại tài khoản trong Console trước khi đặt mốc nghiệm thu.

| ID | Email Google Play của nhân viên | Máy / Android | Vai trò kiểm thử | Tài khoản PicKet trong app | Đã thêm vào track | Opt-in (ngày/giờ) | Version cài | Ngày opt-in liên tục | Trạng thái / feedback |
|---|---|---|---|---|---|---|---|---|---|
| NV-01 | — | — | Cài đặt, onboarding, guest | Guest QA | — | — | — | — | Chưa đăng ký |
| NV-02 | — | — | Đăng ký, xác minh email, đăng nhập | QA account riêng | — | — | — | — | Chưa đăng ký |
| NV-03 | — | — | Mật khẩu, khôi phục, Google Sign-In | QA account riêng | — | — | — | — | Chưa đăng ký |
| NV-04 | — | — | Dashboard, số dư, theme | Guest QA | — | — | — | — | Chưa đăng ký |
| NV-05 | — | — | Ví, danh mục, giao dịch thu/chi | QA account riêng | — | — | — | — | Chưa đăng ký |
| NV-06 | — | — | Chuyển tiền, split, refund, bulk | QA account riêng | — | — | — | — | Chưa đăng ký |
| NV-07 | — | — | Ngân sách và kế hoạch | QA account riêng | — | — | — | — | Chưa đăng ký |
| NV-08 | — | — | Chọn ảnh / Photo Picker / hủy-chọn lại | Guest QA; không lưu | — | — | — | — | Chưa đăng ký |
| NV-09 | — | — | OCR hóa đơn và 40 ảnh Bill | Guest QA; không lưu corpus | — | — | — | — | Chưa đăng ký |
| NV-10 | — | — | Offline, đồng bộ, A/B isolation | QA-A và QA-B riêng | — | — | — | — | Chưa đăng ký |
| NV-11 | — | — | Export, restore, xóa account QA | Tài khoản disposable | — | — | — | — | Chưa đăng ký |
| NV-12 | — | — | Billing sandbox / quota | QA-PLAY; chỉ test payment | — | — | — | — | Chưa đăng ký |
| NV-13 | — | — | Redmi 7 / Android cũ / hiệu năng | Guest QA; không lưu corpus | — | — | — | — | Chưa đăng ký |
| NV-14 | — | — | Máy Android mới / cập nhật / accessibility | QA account riêng | — | — | — | — | Chưa đăng ký |
| NV-15 | — | — | Regression độc lập và tổng hợp lỗi | QA account riêng | — | — | — | — | Chưa đăng ký |

Một nhân viên có thể chạy nhiều nhóm, nhưng dùng một Google account riêng cho tư cách tester. `QA-PLAY` cần được thêm **riêng** vào License Testing nếu kiểm tra giao dịch sandbox; việc có tên trong closed track không tự biến giao dịch thành test payment. Tài liệu hiện xác nhận ba license tester nhưng không nêu email, nên phải kiểm tra danh sách trong Play Console, không tự suy đoán NV-01…NV-15 là những tài khoản đó.

#### Checklist thêm tester và tham gia track

1. Xác nhận alpha có code 28 `completed` trong Play Console và chốt cohort thật. Internal release không tự thay thế opt-in của closed testers.
2. Thu email Google Play do từng nhân viên tự cung cấp; xác nhận họ có thể đăng nhập Google Play trên máy Android. Không thu password/OTP.
3. Play Console → ứng dụng PicKet → **Test and release → Testing → Closed testing → Manage track → Testers**. Chọn email list và thêm từng email thật, hoặc chọn đúng Google Group nếu nhóm đã được tạo và có member thật. Lưu thay đổi.
4. Cấu hình feedback URL hoặc địa chỉ hỗ trợ mà nhân viên có thể dùng; chia sẻ opt-in link riêng cho nhóm. Người thử mở link bằng đúng Google account đã được mời, nhấn tham gia test, sau đó mở link Play/cài app.
5. Trên điện thoại, kiểm tra Play Store đang dùng đúng account; xác nhận trang ứng dụng ghi test enrollment, rồi cài từ Google Play. Ghi `versionName`, `versionCode`, package và ngày/giờ opt-in.
6. Nhân viên chạy ca được giao trong mục 6–13; báo lỗi bằng Run ID, test case ID, version, thiết bị, bước tái hiện và ảnh/log đã che email/token. Không gửi ảnh hóa đơn có dữ liệu cá nhân vào nhóm rộng.
7. Nếu điều kiện tài khoản cá nhân mới áp dụng, giữ ít nhất 12 tester **thật** opt-in liên tục 14 ngày; nếu một tester opt-out thì mốc liên tục của họ bị ngắt. Không dùng account giả, thiết bị farm hoặc ghi nhận tester không thực sự tham gia.
8. Khi kết thúc đợt, thu phản hồi, phân loại lỗi P0/P1/P2, xác nhận tester tiếp tục hay rời track; chỉ chủ tài khoản quyết định chuyển draft/release sang bước phát hành.

**Các ca cohort:** CT01 — email được mời mở opt-in link bằng account khác (phải không được nhận nhầm quyền); CT02 — account được mời tham gia và tải từ Play; CT03 — account chưa tham gia thử mở store listing (phải thấy hành vi giới hạn theo track); CT04 — cài/cập nhật qua Play giữ fixture QA; CT05 — thiết bị đăng nhập nhiều Google account chọn đúng account được mời; CT06 — link cũ/track chưa phát hành báo trạng thái rõ; CT07 — báo feedback kèm test case ID; CT08 — kiểm tra enrollment và ngày opt-in không bị suy diễn từ ngày gửi email; CT09 — gỡ cài app không đồng nghĩa tester đã opt-out; CT10 — đối chiếu tester thật đang active với tiêu chí Console trước khi xin production access.

## 4. Trình tự chạy khuyến nghị

1. **Gate build và an toàn** (T00–T05).
2. **Smoke và xác thực** (S01–S09).
3. **Dữ liệu tài chính cốt lõi** (F01–F25).
4. **Hóa đơn và OCR** (R01–R20, rồi toàn bộ B01–B40 trên Redmi QA).
5. **Offline/sync và dữ liệu** (D01–D12).
6. **Hồ sơ, quyền riêng tư, export/restore, thông báo** (P01–P12).
7. **Billing Play sandbox** (G01–G12), chỉ khi tester và track sẵn sàng.
8. **Hồi quy, khả năng dùng và phát hành** (N01–N12).

Không chạy các bước sau destructive hoặc mua thử nếu bước gate chưa PASS. Khi phát hiện blocker P0, dừng nhóm có nguy cơ làm hỏng dữ liệu; vẫn có thể chạy các nhóm độc lập an toàn.

## 5. Gate cài đặt, build và an toàn

| ID | Mức | Thực hiện | Mong đợi |
|---|---|---|---|
| T00 | P0 | Chạy `adb devices`; xác nhận đúng Redmi 7/serial; kiểm tra `pm list packages` có `com.picket.mobile` hay không. | Nhận đúng thiết bị. Production package không bị chạm; chỉ package QA được phép cài/điều khiển. |
| T01 | P0 | Ghi version, versionCode, package, APK SHA-256, ngày build và nguồn build từ manifest/build record. | Metadata khớp artifact bàn giao; package là `com.picket.mobile.bugqa`. |
| T02 | P0 | Cài/cập nhật APK QA; mở app; xem About/version; đóng/mở lại. | App khởi chạy ổn định, không crash; đúng build vừa ghi nhận. |
| T03 | P0 | Tắt rồi bật mạng; khởi động lạnh (force-stop QA app rồi mở lại). | Màn chính tải được hoặc báo trạng thái mạng rõ; không treo màn khởi động. |
| T04 | P0 | Xác nhận tài khoản đang dùng là QA; đối chiếu package ở App info. | Không thao tác nhầm production hoặc tài khoản thật. |
| T05 | P1 | Cấp/thu hồi quyền camera, ảnh và thông báo qua Android Settings rồi mở lại app. | App xin quyền đúng thời điểm, xử lý từ chối và cấp lại; không crash hoặc mở camera ngoài ý muốn. |

## 6. Smoke, onboarding và xác thực

| ID | Mức | Bước kiểm thử | Mong đợi |
|---|---|---|---|
| S01 | P0 | Cài sạch trên package QA và mở lần đầu. | Onboarding/điểm bắt đầu xuất hiện đúng một lần; không lộ stack trace hoặc nội dung dev. |
| S02 | P0 | Chọn dùng chế độ khách. Tạo một ví và một giao dịch QA nhỏ, đóng/mở lại app. | Dùng được không cần tài khoản; dữ liệu local vẫn còn sau restart. |
| S03 | P1 | Bỏ qua onboarding/đi lùi, đóng app giữa onboarding rồi mở lại. | Không lặp vô hạn hoặc kẹt ở bước không thể tiếp tục; lựa chọn đã xác nhận được giữ hợp lý. |
| S04 | P1 | Mở đăng ký, nhập email sai định dạng, mật khẩu ngắn và mật khẩu xác nhận khác. | Client chặn input không hợp lệ, báo lỗi rõ gần trường nhập và không gửi request tạo tài khoản. |
| S05 | P0 | Đăng ký `QA-A` với email hợp lệ; kiểm tra email xác minh và nhập mã/link đúng. | Tài khoản được tạo một lần; trạng thái xác minh hiển thị đúng; không báo thành công nếu backend chưa xác nhận. |
| S06 | P1 | Đăng ký lại email đã tồn tại; thử email sai định dạng/không có mạng. | Thông báo an toàn, không tạo bản ghi trùng hoặc tiết lộ nhiều thông tin tài khoản hơn cần thiết. |
| S07 | P0 | Đăng xuất; đăng nhập bằng mật khẩu đúng, rồi thử sai mật khẩu. | Đăng nhập đúng khôi phục đúng tài khoản; sai mật khẩu không mở app như đã đăng nhập và có lỗi dễ hiểu. |
| S08 | P1 | Quên mật khẩu với email QA tồn tại, email không tồn tại, email sai định dạng; kiểm tra inbox. | Luồng phản hồi không gây crash/tiết lộ quá mức; chỉ email hợp lệ tồn tại nhận hướng dẫn; reset link hết hạn/sai token bị từ chối. |
| S09 | P1 | Chạy Google Sign-In thành công, hủy ở màn chọn tài khoản, mất mạng giữa callback và thử lại. | Thành công gắn đúng user; hủy quay lại form và giữ an toàn; callback lỗi không tạo phiên nửa vời; thử lại được. |

**Bằng chứng xác thực:** che email/token trong screenshot; không ghi password, OTP, access/refresh token vào report/log.

## 7. Dashboard, ví, danh mục và giao dịch

| ID | Mức | Bước kiểm thử | Mong đợi |
|---|---|---|---|
| F01 | P0 | Mở dashboard khi chưa có dữ liệu và khi có fixture. | Empty state hướng dẫn tạo dữ liệu; không hiển thị số dư giả hoặc NaN. |
| F02 | P0 | Với 1.000.000đ + 300.000đ fixture, so dashboard với danh sách ví và giao dịch. | Tổng số dư khớp tổng các ví; đơn vị/locale VND nhất quán. |
| F03 | P1 | Chạm ẩn/hiện số dư nhiều lần, đổi theme, mở lại dashboard. | Giá trị nhạy cảm được che/hiện đúng; icon/nút không bị hình trang trí che; lựa chọn không làm lệch layout. |
| F04 | P1 | Chuyển tháng dashboard tiến/lùi, mở lịch hóa đơn và quay lại tháng hiện tại. | Tháng/năm và dữ liệu thay theo lựa chọn; không dịch một tháng hoặc giữ dữ liệu tháng trước. |
| F05 | P0 | Tạo ví Tiền mặt 1.000.000đ và ví Ngân hàng 300.000đ; sửa tên/số dư rồi lưu. | Validation tiền không âm/không lỗi locale; lưu đúng một lần và tổng số dư cập nhật ngay hoặc trạng thái sync rõ. |
| F06 | P1 | Tạo ví trùng tên, tên rỗng, số dư quá lớn hoặc số âm; thử archive ví đang dùng. | Lỗi được chỉ rõ; không tạo trạng thái không hợp lệ; không mất giao dịch liên kết khi archive. |
| F07 | P0 | Tạo giao dịch chi 12.345đ từ ví Tiền mặt, chọn danh mục và ngày. | Giao dịch xuất hiện một lần; số dư ví thành 987.655đ; dashboard, danh sách và cashflow đồng nhất. |
| F08 | P0 | Tạo giao dịch thu 50.000đ vào ví Tiền mặt. | Số dư tăng đúng 50.000đ; dấu thu/chi, màu và tổng dòng tiền phân biệt rõ. |
| F09 | P1 | Thử lưu form giao dịch thiếu số tiền, danh mục, ví hoặc nhập 0/số âm. | Validation theo quy tắc sản phẩm; không có giao dịch rác hoặc double submit. |
| F10 | P0 | Mở giao dịch vừa tạo, sửa số tiền 12.345→20.000, đổi danh mục/ghi chú, lưu. | Chỉ bản ghi đó thay đổi; số dư được tính lại đúng (ví còn 980.000đ); không tạo bản ghi thứ hai. |
| F11 | P1 | Thử nút back khi form dirty; chọn tiếp tục chỉnh sửa rồi thử bỏ thay đổi. | Cảnh báo bỏ thay đổi đúng lúc; xác nhận hủy quay về và không lưu; tiếp tục sửa giữ draft. |
| F12 | P1 | Xóa/archived một giao dịch QA, xác nhận và kiểm tra dashboard/số dư. | Xóa đúng mục được chọn; số dư và thống kê hoàn tác đúng; có xác nhận trước thao tác nguy hiểm. |
| F13 | P0 | Chuyển 100.000đ từ Tiền mặt sang Ngân hàng. | Tiền mặt 887.655đ, Ngân hàng 400.000đ; tổng tài sản vẫn 1.287.655đ; không tính chuyển tiền thành thu/chi. |
| F14 | P1 | Chuyển số tiền lớn hơn số dư, chuyển cùng ví, nhập 0/âm, đổi ví sau nhập. | Chặn điều kiện sai; không tạo transfer một chiều; cảnh báo đủ tiền dựa trên ví nguồn hiện tại. |
| F15 | P1 | Sửa/xóa giao dịch chuyển tiền và kiểm tra cả hai ví. | Hai vế được cập nhật đồng bộ, không lệch tổng tiền hoặc để lại một giao dịch mồ côi. |
| F16 | P1 | Tạo khoản chi rồi hoàn tiền một phần; thử hoàn số lớn hơn khoản còn lại. | Refund liên kết giao dịch gốc, số còn lại/số dư đúng; không cho hoàn vượt quá hoặc tạo thu độc lập sai ngữ nghĩa. |
| F17 | P1 | Chia giao dịch thành nhiều danh mục; thử tổng phân bổ thiếu/thừa giao dịch gốc. | Tổng split khớp khoản gốc để xác nhận; từng phần hiện đúng trong báo cáo, không nhân đôi tổng chi. |
| F18 | P1 | Chọn nhiều giao dịch QA, bulk edit danh mục; hủy giữa luồng. | Chỉ các dòng chọn được cập nhật; số lượng thành công/thất bại báo rõ; hủy không áp dụng một phần âm thầm. |
| F19 | P1 | Tạo danh mục, sửa icon/tên, chọn khi tạo giao dịch, archive sau đó. | Danh mục hiện nhất quán ở form và bộ lọc; giao dịch cũ vẫn đọc được nếu danh mục bị archive. |
| F20 | P1 | Dùng tìm kiếm, filter loại thu/chi, ví, danh mục, khoảng ngày và sort trong giao dịch. | Bộ lọc kết hợp đúng; reset đưa danh sách về trạng thái ban đầu; kết quả rỗng có hướng dẫn. |
| F21 | P1 | Kiểm tra tiền có dấu chấm/phẩy, paste chuỗi có ký tự, bàn phím số, xóa toàn bộ. | Hiển thị và giá trị lưu không lệch 1.000 lần; không biến chuỗi sai thành số hợp lệ. |
| F22 | P1 | Chuyển ngày qua nửa đêm/đổi timezone nếu có thể; giao dịch đầu/cuối tháng. | Ngày giao dịch giữ đúng ngày đã chọn; thống kê tháng không dịch theo UTC. |
| F23 | P2 | Thử ghi chú dài, emoji, tiếng Việt có dấu, tên ví/danh mục dài. | Text không bị cắt mất dữ liệu khi lưu; UI xuống dòng/ellipsis có chủ đích, không tràn nút. |
| F24 | P1 | Mở cashflow/insights với thu, chi, chuyển và refund fixture. | Chỉ số phân loại đúng; chuyển tiền không làm phồng thu/chi; refund theo đúng quy tắc hiển thị. |
| F25 | P1 | Làm mới màn danh sách sau thao tác, cold restart app. | Dữ liệu đã xác nhận tồn tại sau restart; trạng thái loading/error không che dữ liệu cũ bằng số giả. |

## 8. Ngân sách, kế hoạch và dữ liệu định kỳ

| ID | Mức | Bước kiểm thử | Mong đợi |
|---|---|---|---|
| B01 | P0 | Tạo ngân sách 500.000đ cho danh mục QA, kỳ tháng hiện tại. | Ngân sách lưu đúng kỳ, danh mục và ví scope nếu có; hiển thị chi đã dùng bằng 0. |
| B02 | P0 | Thêm chi 125.000đ cùng danh mục trong kỳ. | Đã dùng 125.000đ, còn 375.000đ; tỷ lệ tiến độ khớp và không tính transfer. |
| B03 | P1 | Thêm chi đúng bằng hạn mức rồi vượt hạn mức 1đ. | Cảnh báo/tiến độ chuyển đúng ngưỡng; không chặn giao dịch nếu chính sách cho phép vượt. |
| B04 | P1 | Tạo ngân sách cùng danh mục nhưng kỳ khác; thử ngày đầu/cuối kỳ. | Giao dịch vào đúng kỳ theo ngày địa phương; không tính nhầm giao dịch kỳ kế bên. |
| B05 | P1 | Tạo/sửa/disable/archive ngân sách; mở lại app. | Trạng thái được giữ đúng; sửa không tạo ngân sách trùng; số liệu dùng lại được tính nhất quán. |
| B06 | P1 | Tạo kế hoạch/chi định kỳ nếu tính năng đang được bật trong build; chạy khi offline và online. | Kỳ, ngày đến hạn, ví và trạng thái enable/end date được giữ; không tự nhân bản khi đồng bộ lại. |
| B07 | P2 | Mở planning và so sánh kế hoạch với dòng tiền thực tế. | Dự tính được gắn nhãn dự tính; không trình bày như giao dịch đã xảy ra. |

## 9. Hóa đơn, lịch hóa đơn và OCR

### 9.1 Luồng chụp/chọn ảnh và xác nhận

| ID | Mức | Bước kiểm thử | Mong đợi |
|---|---|---|---|
| R01 | P0 | Vào Chi tiêu; quan sát quyền camera và thao tác đầu tiên. | Không tự bật camera chỉ vì mở Chi tiêu; camera chỉ mở sau khi người dùng chủ động chọn quét/chụp. |
| R02 | P0 | Chạm quét, cho phép camera, chụp hóa đơn giấy, xem preview, chụp lại, chọn dùng ảnh. | Camera/preview rõ; chụp lại dùng ảnh mới; dùng ảnh mới mở tiến trình nhận diện không nhân đôi request. |
| R03 | P0 | Chọn ảnh từ thư viện hệ thống; chọn ảnh, quay lại picker, hủy, mở lại rồi chọn. | Photo Picker Android mở được; ảnh được trả về đúng; hủy không crash/mất draft; thử lại mở picker bình thường. |
| R04 | P1 | Chọn ảnh độ phân giải lớn, ảnh HEIC/định dạng không hỗ trợ (nếu có), ảnh read-only URI. | Decode giới hạn bộ nhớ; định dạng không hỗ trợ báo lỗi có thể xử lý; app không treo hoặc đọc URI hết hạn. |
| R05 | P1 | Mở picker rồi đưa app xuống nền, xoay màn hình, quay lại; thử huỷ OCR khi đang chạy. | Trạng thái picker/OCR rõ; không treo overlay; hủy đóng tài nguyên và không tự lưu giao dịch. |
| R06 | P0 | Quét ảnh rõ có merchant, ngày, 2+ dòng hàng và total; vào màn review. | Các trường đề xuất có thể chỉnh; người dùng phải xác nhận chủ động mới lưu; kết quả không tự ghi vào lịch sử. |
| R07 | P0 | Quét hóa đơn thiếu merchant nhưng có bằng chứng hàng/tổng theo eligibility. | Có thể mở review theo điều kiện; merchant để trống/cần nhập, không lấy món hàng làm tên cửa hàng. |
| R08 | P0 | Quét ảnh chỉ có số tiền, chỉ 1 dòng không đủ bằng chứng, danh sách mua sắm hoặc tổng mâu thuẫn. | Không giả vờ xác thực thành hóa đơn; yêu cầu chụp lại/nhập tay theo UI; không dùng tay nhập để nâng điểm OCR. |
| R09 | P1 | Sửa tên hàng/qty/đơn giá/thành tiền/merchant/date, xóa dòng, thêm dòng thủ công. | Phân biệt giá trị OCR và do người dùng sửa nếu UI hỗ trợ; phép tính không tự âm thầm sửa; thao tác lưu sau xác nhận. |
| R10 | P0 | Ở review nhấn Hủy/back, rồi mở lại Capture. | Không sinh giao dịch; draft được giữ hoặc bỏ theo đúng lựa chọn; ảnh/kết quả phiên trước không rò vào phiên mới. |
| R11 | P1 | Lưu một hóa đơn QA sau khi đã xác nhận; mở receipts/detail, sửa và xóa bằng tài khoản QA. | Một hóa đơn/giao dịch liên kết đúng; nội dung chi tiết và số dư đồng bộ; xóa có xác nhận và không làm hỏng dữ liệu không liên quan. |
| R12 | P1 | Mở receipt calendar, chọn ngày có/không có hóa đơn, mở “xem tất cả”. | Chọn ngày lọc đúng hóa đơn; empty state rõ; tháng đổi không giữ receipt của ngày trước. |
| R13 | P1 | Chạy hai phiên quét liên tiếp, xoay ảnh giữa hai lần, đóng phiên rồi quét ảnh khác. | Cache chỉ tái sử dụng trong cùng phiên/ảnh; xoay/đóng invalidates; không mang text/merchant/total ảnh trước sang ảnh sau. |

### 9.2 Kiểm tra nội dung OCR cho mỗi ảnh

Trước khi chấm ảnh, người kiểm thử lập ground truth độc lập trên giấy ảnh: merchant (hoặc null), date, từng dòng `tên nguyên văn | qty | unit price | line total`, subtotal, tax, fee/shipping, discount, payable total, currency và metadata bẫy. Chấm từng trường `EXACT / MISSING / WRONG`; với metadata ghi riêng **false positive thành line item**.

- Tổng thanh toán cuối phải được phân biệt với subtotal, VAT/thuế, phí giao/vận chuyển, giảm giá, tiền khách đưa và tiền thừa.
- Không lấy tổng các dòng hàng thay payable total khi ảnh không chứng minh thuế/phí/giảm giá; tổng không đọc được phải để thiếu và cần người dùng kiểm tra.
- SĐT, địa chỉ, mã chứng từ, thu ngân/khách, số bàn, thời gian, `SUBTTL`, `ITEMS 1.00`, phí giao hàng và metadata khác không được thành sản phẩm.
- `quantity × unitPrice = lineTotal` cần nhất quán; khi không nhất quán phải cảnh báo, không tự sửa số. Qty/đơn giá suy ra phải được review; hàng tặng chỉ giữ khi qty rõ và giá `0` được in rõ.
- Token hỏng như `12O000`, `TOTAL SAE3`, số phân nhóm sai hoặc số thập phân VND khác 0 không được cắt thành tiền hợp lệ. Nếu thấy ký hiệu/định dạng ngoại tệ, cảnh báo và chặn lưu thẳng như VND.
- Tên merchant chỉ lấy vùng đầu hóa đơn; giữ thương hiệu hợp lệ có chữ số như `3 Miền`, `7UP`, `PICKET MART QUAN 7`.
- Dùng ít nhất ảnh mờ, ảnh thiếu góc, hóa đơn nhiệt, nhiều cột, chữ xuống dòng, qty dính tên, giá 0, có thuế/phí/discount, total trùng subtotal, metadata số dày và ảnh xoay.

### 9.3 Chạy đủ 40 ảnh Bill trên Redmi 7 QA

Phải chạy **đúng 40 file gốc**, không thay bằng ảnh khác, output parser cũ hoặc test unit. File mapping dưới đây được lấy từ thư mục `Bill/` theo sort tên; tạo manifest SHA-256 trước lần chạy và lưu output riêng theo ID. Chạy từng ảnh qua picker (để kiểm tra lỗi gallery) và luồng OCR; không lưu giao dịch. Có thể chia thành các lượt nhỏ để tránh mất phiên, nhưng phải tổng kết đủ B01–B40.

| ID | File nguồn | ID | File nguồn |
|---|---|---|---|
| OCR-B01 | `1793265184937_9058878019752879756_9058878019752879756_7130f23c6050b143e0d5765f2d4c9757.jpg` | OCR-B21 | `OIP (17).webp` |
| OCR-B02 | `1793265207208_9058878019752879756_9058878019752879756_3e24c7cdf2d011af90727fa90cf46393.jpg` | OCR-B22 | `OIP (18).webp` |
| OCR-B03 | `1793265230636_9058878019752879756_9058878019752879756_4ee571991fdfb9816e27160feb0c3fd9.jpg` | OCR-B23 | `OIP (19).webp` |
| OCR-B04 | `1793265269742_9058878019752879756_9058878019752879756_856ae7ba9628b63eca3ebb1fc47274e0.jpg` | OCR-B24 | `OIP (2).webp` |
| OCR-B05 | `bil-thanh-toán.jpg` | OCR-B25 | `OIP (20).webp` |
| OCR-B06 | `download (1).webp` | OCR-B26 | `OIP (21).webp` |
| OCR-B07 | `download (2).webp` | OCR-B27 | `OIP (22).webp` |
| OCR-B08 | `download (3).webp` | OCR-B28 | `OIP (23).webp` |
| OCR-B09 | `download.webp` | OCR-B29 | `OIP (24).webp` |
| OCR-B10 | `edit-z55509440924291ec1d7f89615792e5b724f8739ccdc92-17187057707982142801900.webp` | OCR-B30 | `OIP (25).webp` |
| OCR-B11 | `hoa-don-ban-hang-app-ban-hang-sapo-1565866j26716.webp` | OCR-B31 | `OIP (26).webp` |
| OCR-B12 | `hoadon-310823-175156.jpg` | OCR-B32 | `OIP (3).webp` |
| OCR-B13 | `OIP (1).webp` | OCR-B33 | `OIP (4).webp` |
| OCR-B14 | `OIP (10).webp` | OCR-B34 | `OIP (5).webp` |
| OCR-B15 | `OIP (11).webp` | OCR-B35 | `OIP (6).webp` |
| OCR-B16 | `OIP (12).webp` | OCR-B36 | `OIP (7).webp` |
| OCR-B17 | `OIP (13).webp` | OCR-B37 | `OIP (8).webp` |
| OCR-B18 | `OIP (14).webp` | OCR-B38 | `OIP (9).webp` |
| OCR-B19 | `OIP (15).webp` | OCR-B39 | `OIP.webp` |
| OCR-B20 | `OIP (16).webp` | OCR-B40 | `viet-hoa-don-hang-khuyen-mai-khong-thu-tien-5.jpg` |

**Mỗi file OCR-B01–OCR-B40:** (1) xác nhận SHA-256 trùng manifest; (2) mở Android picker và chọn ảnh; (3) ghi picker success/cancel/error; (4) ghi OCR latency, timeout/error, merchant/date/currency, item count, total và review warnings; (5) so với nhãn độc lập; (6) chụp màn hình kết quả đã che dữ liệu cá nhân nếu có; (7) thoát review, xác nhận số dư/lịch sử giao dịch không thay đổi.

Kết quả corpus báo cáo riêng: số ảnh đã chạy/40, ảnh đọc lỗi, total **exact/wrong/missing**, từng trường item name/qty/unit price/line total, số metadata false positive, ngoại tệ/cảnh báo, p50/p95 latency, max latency, crash/timeout, PSS trước/sau và nhiệt độ trước/sau nếu thiết bị cung cấp. Các ảnh chưa có ground truth được đánh dấu **chưa chấm độ chính xác**, không coi là PASS. Hiện trạng tài liệu 31/10: QA51 đã đọc 40 ảnh; trong 25 ảnh có nhãn tổng có 19 đúng, 1 sai, 5 thiếu; 1 ảnh không chấm được, 14 ảnh không nhãn; nhãn sản phẩm độc lập còn giới hạn.

### 9.4 Hiệu năng OCR và phục hồi phiên

| ID | Mức | Bước kiểm thử | Mong đợi |
|---|---|---|---|
| R14 | P0 | Chạy 5 ảnh khác nhau liên tiếp, ghi thời gian toàn phiên (từ chọn/chụp đến review). | Không treo/crash; cache không dùng nhầm ảnh; mọi ảnh có kết thúc thành công, cảnh báo hoặc retry rõ. |
| R15 | P1 | Chọn ảnh lớn, ảnh xoay 90/180°, ảnh nhỏ/chữ mờ; đo từng lượt. | Hướng đọc phù hợp; giới hạn decode; xoay buộc đọc lại; không tuyên bố mọi ảnh dưới 20 giây nếu đo thực tế không đạt. |
| R16 | P1 | Đưa app xuống nền, khóa màn hình, hủy picker/OCR, mở lại. | Tài nguyên được đóng; không lưu ngoài ý muốn; draft/phiên cũ được khôi phục hoặc bỏ theo hành vi thiết kế. |
| R17 | P1 | Chạy corpus 40 ảnh, đo PSS trước/sau và quan sát nhiệt độ/battery. | Không tăng bộ nhớ liên tục hoặc mất ổn định; ghi số liệu thô và thiết bị. Không dùng mean latency thay p95 hoặc thời gian toàn luồng. |
| R18 | P0 | Kiểm tra log `PICKET_OCR_PERF`/`PICKET_OCR_STATUS`, screenshot từng ca lỗi. | Log khớp số lượng ảnh, không có dữ liệu tài khoản/ảnh nhạy cảm không cần thiết; trace được image ID + hash. |
| R19 | P1 | Khi OCR lỗi/timeout, thử retry, đổi ảnh, chụp lại và tự nhập thủ công. | Retry hoạt động; dữ liệu phiên cũ không dính; manual path không được ghi nhận nhầm là OCR chính xác. |
| R20 | P1 | Có ảnh mờ/mất chữ và ảnh bị che merchant/total; xác nhận từng kết quả. | Giữ trường đọc chắc chắn; phân biệt thiếu/suy ra/cần nhập nếu UI hỗ trợ; không bịa tổng hoặc tự lưu. |

## 10. Offline, đồng bộ, conflict và cô lập tài khoản

| ID | Mức | Bước kiểm thử | Mong đợi |
|---|---|---|---|
| D01 | P0 | Với guest, tắt mạng; thêm/sửa/xóa giao dịch và mở lại app. | Guest tiếp tục dùng local; dữ liệu sống qua restart; trạng thái không giả vờ đã sync cloud. |
| D02 | P0 | Với QA-A, tạo khoản chi online, tắt mạng, tạo thêm khoản offline, bật lại mạng. | Queue đồng bộ một lần; không mất hoặc nhân đôi; client hiển thị pending/synced đúng. |
| D03 | P1 | Force-stop khi mutation đang pending; mở lại online. | Queue tồn tại đúng user và replay idempotent; không gửi lặp tạo giao dịch. |
| D04 | P0 | Tắt mạng ngay trước/sau bấm lưu; bấm lưu nhanh liên tiếp. | Kết quả rõ ràng; không duplicate; retry không tạo thêm mutation. |
| D05 | P1 | Đăng nhập QA-A trên 2 thiết bị hoặc session, sửa cùng bản ghi lần lượt. | Xung đột được phát hiện/giải quyết theo version; bản server không bị ghi đè âm thầm. |
| D06 | P1 | Mở sync conflicts, chọn phương án theo UI; thử back hoặc mất mạng giữa xử lý. | Conflict vẫn có thể xử lý lại; lựa chọn không ghi dữ liệu vào user khác. |
| D07 | P0 | Đăng xuất QA-A, đăng nhập QA-B; kiểm tra dashboard, giao dịch, ví và queue. | Không hiển thị dữ liệu A trong B; queue scoped; không phát replay dưới chủ sở hữu sai. |
| D08 | P0 | Đăng xuất B rồi đăng nhập lại A. | A nhận lại dữ liệu A; trạng thái B không bị nhập chung. |
| D09 | P1 | Thử refresh/sync khi server trả timeout/5xx, sau đó phục hồi mạng. | Dữ liệu cũ không bị xóa; lỗi được thể hiện; retry hữu hạn/khả dụng. |
| D10 | P1 | Thử restore/backup khi có mutation pending. | Conflict/revision được báo; không áp restore gây mất update đang chờ mà không có xác nhận. |
| D11 | P1 | Xác nhận trạng thái đồng bộ của ví, category, budget, receipt và transaction. | Không có nhóm dữ liệu sync một phần khiến UI báo đồng bộ hoàn tất sai. |
| D12 | P2 | Đổi ngôn ngữ giao diện hệ thống/locale, khởi động lại; dùng vi/en nếu có bộ chọn. | Format ngày/tiền và text thống nhất; không khẳng định locale chưa được bật trong build. |

## 11. Hồ sơ, quyền riêng tư, backup, xóa tài khoản và thông báo

| ID | Mức | Bước kiểm thử | Mong đợi |
|---|---|---|---|
| P01 | P1 | Mở Hồ sơ, đổi tên/avatar/cài đặt liên quan, lưu rồi restart. | UI đồng bộ dashboard; thông tin đúng user; lỗi mạng không làm mất trạng thái cũ. |
| P02 | P1 | Đăng xuất từ tài khoản cloud khi online và offline; thử hủy/xác nhận dialog. | Dialog dùng giao diện app; hủy giữ phiên; xác nhận xóa token/phiên theo chính sách nhưng không xóa nhầm dữ liệu guest. |
| P03 | P1 | Mở quyền riêng tư, đọc policy/permission, từ chối camera/photos/notification. | Không ép quyền trước khi cần; chức năng có fallback khi user từ chối; không mở permission loop. |
| P04 | P0 | Export dữ liệu QA qua share sheet; chọn hủy, lưu vào vị trí được bảo vệ, mở kiểm tra schema. | Export đúng tài khoản và dữ liệu fixture; hủy không mất dữ liệu; cảnh báo file chứa dữ liệu tài chính nhạy cảm. |
| P05 | P0 | Restore file export lên tài khoản QA sạch; chạy dry-run; nhập đúng token xác nhận. | Trước restore có thống kê/validate; chỉ apply sau xác nhận; revision/ownership hợp lệ. |
| P06 | P1 | Restore file sai JSON, version không hỗ trợ, file quá lớn, bản duplicate hoặc token sai. | Từ chối an toàn; không ghi một phần; lỗi không làm app crash hoặc lộ nội dung nhạy cảm. |
| P07 | P0 | Trên tài khoản disposable QA, yêu cầu xóa account; thử không re-auth, sai chữ `DELETE`, quá thời hạn và xác nhận đúng. | Re-auth trong hạn và cụm xác nhận chính xác là bắt buộc; từ chối sai/hết hạn; tài khoản QA bị xóa theo flow sau xác nhận. |
| P08 | P1 | Sau xóa QA, thử đăng nhập lại; kiểm tra media/cloud và thiết bị. | Không còn quyền cloud; không xóa tài khoản hoặc dữ liệu của tester khác; dữ liệu local xử lý theo thông báo sản phẩm. |
| P09 | P1 | Mở Notifications, trạng thái rỗng/có thông báo; nhấn điều hướng và đánh dấu đọc. | Nội dung/đích đến đúng; badge cập nhật; lỗi tải không hiển thị như đã đọc. |
| P10 | P1 | Tạo notification test backend/fixture nếu có sẵn; gửi khi app foreground/background. | Permission và deep link đúng; không gửi tin thật ngoài nhóm QA khi không được phép. |
| P11 | P1 | Kiểm tra phần cài đặt/app version và update checker. | Phiên bản hiện từ Android package; update chỉ mở xác nhận trước khi cài; không báo cập nhật thành công nếu chưa tải/verify. |
| P12 | P2 | Đổi theme Light/Dark, đóng/mở, đi qua dashboard, form, dialog, OCR review. | Màu chữ, icon, border, alert và disabled states có contrast tốt; không có modal hệ thống lệch phong cách nếu app có custom UI. |

## 12. Gói, quota và Google Play Billing sandbox

Chỉ chạy khi Google Play product, license tester, đúng track, backend verifier và tester account sẵn sàng. Current source docs yêu cầu cài qua Google Play để sandbox Billing có ý nghĩa; sideload/emulator không thay bằng chứng này. Tuyệt đối không nhập phương thức thanh toán thật hoặc xác nhận giao dịch tính tiền thật.

| ID | Mức | Bước kiểm thử | Mong đợi |
|---|---|---|---|
| G01 | P0 | Cài từ đúng Play testing link bằng QA-PLAY; mở Hồ sơ → Gói Picket. | Play nhận tester; bốn SKU hiện đúng nếu đang active; giá lấy từ Play, không hardcode hoặc lấy tier client làm chuẩn. |
| G02 | P0 | Mạng ổn định, tải catalog; sau đó offline/Play không trả giá, nhấn thử lại. | Loading, unavailable và retry rõ; không gửi purchase khi SKU/price chưa sẵn sàng. |
| G03 | P0 | Mua gói sandbox (chỉ sau khi Console hiển thị test payment). | Chỉ cấp quyền sau khi server xác minh token thành công; UI hiển thị tier/expiry thực tế. |
| G04 | P0 | Dùng token không hợp lệ hoặc mô phỏng API verifier fail/timeout. | Không cấp quyền/không acknowledge nhầm; giao dịch còn retryable theo API; lỗi không bị báo thành đã mua. |
| G05 | P1 | Khôi phục giao dịch trên cùng user, khôi phục khi đổi/đăng xuất tài khoản app. | Chỉ quyền thuộc app user đã xác minh được nhận; không chuyển token để cấp quyền trái chủ. |
| G06 | P1 | Thử purchase tap nhanh nhiều lần; rời màn khi đang tải Play. | Chỉ một yêu cầu purchase hoạt động; không treo sheet hoặc nhân đôi request. |
| G07 | P1 | Hủy purchase sheet. | Không cấp tier; UI quay lại trạng thái trước, không báo lỗi nghiêm trọng nếu user tự hủy. |
| G08 | P1 | Hủy gia hạn subscription sandbox và kiểm tra trước/sau expiry. | Quyền còn tới expiry hợp lệ, rồi bị thu hồi đúng; không thu hồi sớm chỉ vì hủy renewal. |
| G09 | P1 | Kiểm thử renewal, grace/hold, refund/revoke qua cơ chế sandbox được hỗ trợ. | Backend/RTDN và app state nhất quán; ghi thời điểm sự kiện; không suy trạng thái từ client. |
| G10 | P1 | Mất mạng sau Play charge-test nhưng trước verify, cold restart, bật mạng và restore. | Giao dịch được xác minh lại idempotent; không mất vĩnh viễn và không cấp sớm khi chưa verify. |
| G11 | P0 | Kiểm tra quota OCR ở free và paid tester theo kế hoạch sandbox, gồm đúng ngưỡng và request vượt 1. | Server là nguồn quyết định; quota đạt ngưỡng đúng; request vượt bị từ chối rõ, không tăng lượt do retry. |
| G12 | P1 | Đăng nhập user B sau khi user A có subscription; thử mở premium và restore. | B không nhận entitlement của A; tách chủ sở hữu và không rò token/tier. |

## 13. Khả năng dùng, accessibility và ổn định

| ID | Mức | Bước kiểm thử | Mong đợi |
|---|---|---|---|
| N01 | P1 | Trên Redmi 7, đi qua dashboard → giao dịch → tạo → lưu → back bằng một tay. | Nút chính không dính/che; form không bị bàn phím che; thao tác thường có thể hoàn tất không cuộn ngang. |
| N02 | P1 | Bật font/display size lớn, landscape nếu hỗ trợ, kiểm tra màn nhỏ. | Không mất nút xác nhận; nội dung có thể cuộn; không cắt chữ quan trọng hoặc tràn ngang. |
| N03 | P1 | Kiểm tra các button, filter, dropdown, card, navbar và dialog của các màn mobile. | Kích thước/spacing nhất quán; disabled/loading state dễ hiểu; hit target đủ lớn. |
| N04 | P1 | Dùng TalkBack/Accessibility Scanner với login, nút ẩn tiền, giao dịch và dialogs. | Label/role/state được đọc; focus tuần tự; radio/checkbox trạng thái rõ; không chỉ dựa màu sắc. |
| N05 | P1 | Dùng back gesture/nút Android ở login/register/forgot, modal, picker và review. | Điều hướng không thoát mất dữ liệu âm thầm; không tạo vòng lặp; prompt xác nhận đúng. |
| N06 | P1 | Test app foreground/background, xoay màn hình, khóa máy, nhận cuộc gọi/notification khi form dirty. | Không crash; draft được bảo toàn hợp lý; không nhân đôi mutation khi resume. |
| N07 | P1 | Dùng 1 giờ với 30 thao tác lặp (list, scroll, save, switch tabs) trên Redmi 7. | Không crash/ANR; bộ nhớ không tăng tuyến tính; không nóng bất thường; ghi nhiệt độ/PSS. |
| N08 | P2 | Tắt mạng, server chậm, hết token, API lỗi, thiếu ảnh và thiếu quyền ở từng màn liên quan. | Lỗi có hướng xử lý; nút retry hoạt động; không hiển thị màn trắng hoặc báo thành công giả. |
| N09 | P1 | Dùng Android Back và nút Back trong app luân phiên. | Stack/navigation không tạo màn trùng, không mất form đã lưu hoặc quay về màn sai. |
| N10 | P2 | Chụp screenshot trên các màn quan trọng light/dark; kiểm tra tiếng Việt/English nếu có. | Không có placeholder/debug label hoặc text bị cắt; ngôn ngữ đúng lựa chọn/build. |
| N11 | P0 | Quét/đóng/mở app khi logcat đang thu; rà lỗi fatal/ANR/security-sensitive text. | Không có crash, uncaught error hoặc token/mật khẩu/OTP trong log. |
| N12 | P1 | Nếu có thể, cập nhật QA build mới hơn bằng cơ chế được hỗ trợ với fixture QA còn tồn tại. | Dữ liệu giữ theo thiết kế; migration không làm mất ví/giao dịch; ghi rõ đây chỉ là QA update path. |

## 14. Bộ kiểm thử tự động trên PC để chạy trước thiết bị

Các lệnh dưới đây là đề xuất theo scripts hiện có ở `apps/mobile/package.json`; thực thi trong `apps/mobile`. Ghi kết quả/commit tree thực tế vào test report. Không chạy toàn bộ suite nếu thời lượng/môi trường không phù hợp; tối thiểu chạy nhóm bị ảnh hưởng và các nhóm tích hợp liên quan.

```powershell
npm run test:ui
npm run test:auth
npm run test:transactions
npm run test:subscriptions
npm run test:billing
npm run test:sync
npm run test:ocr
npm run test:export
npm run test:settings
npm run typecheck
npm run lint
```

Gợi ý phạm vi: picker/capture → `test:ocr` và `test:ui`; transaction/wallet/transfer/refund/splits → `test:transactions`, `test:sync`; login/account → `test:auth`; billing/quota → `test:billing`, `test:subscriptions`; backup/restore → `test:export`; theme/accessibility → `test:settings`, `test:ui`. Chạy test OCR hẹp theo skill trước khi dựng APK. Lưu output đầy đủ; không biến test pass thành bằng chứng thiết bị/UI hoặc accuracy corpus.

## 15. Tiêu chí kết thúc vòng nghiệm thu

1. Mọi P0 được PASS trên đúng build/thiết bị hoặc ghi BLOCKED kèm blocker được chấp nhận; không còn lỗi dữ liệu, quyền chủ sở hữu, thanh toán hoặc package.
2. P1 được chạy theo ma trận đã thống nhất; lỗi mở có ID, mức độ, bước tái hiện, build/device, bằng chứng và người phụ trách.
3. OCR: đã chọn đủ 40/40 file Bill trên Redmi 7 bằng Photo Picker trong QA build; có hash, output/ảnh/bằng chứng từng ID; mọi trường có nhãn được chấm exact/wrong/missing và metadata false positive riêng. Ảnh thiếu nhãn không được ghi PASS accuracy.
4. Không có giao dịch từ corpus OCR; số dư trước/sau kiểm thử corpus bằng nhau. Nếu chênh, dừng và điều tra trước khi tiếp tục.
5. Có log p50/p95/max OCR, thời gian toàn luồng, lỗi/timeout, PSS và số ảnh hoàn tất; không gọi một lượt đơn là p95 hoặc tuyên bố “nhận diện tất cả hóa đơn”.
6. Billing chỉ PASS khi cài từ Play sandbox đúng tester và đã đối chiếu entitlement server-side; unit test hoặc sideload không đủ.
7. Kết quả chỉ chứng nhận package/version/hash ghi trên report. Không tự động kết luận tương tự cho landing APK, APKPure hoặc production Play.

## 16. Mẫu báo cáo cho một lượt chạy

```text
Run ID / ngày giờ:
Thiết bị + Android:
App version / versionCode / package:
APK SHA-256 + nguồn build:
Tài khoản QA (đã che thông tin):
Mạng / quyền / track:
IDs đã chạy / tổng:
PASS / FAIL / BLOCKED / N/A:
P0 còn mở:
Bill: số ảnh chọn được /40; labeled totals exact-wrong-missing;
     line fields; metadata false positives; ảnh thiếu nhãn:
OCR: p50 / p95 / max; timeout; lỗi; PSS trước-sau; nhiệt độ:
Giao dịch corpus đã tạo? Mong đợi: Không. Thực tế:
Bằng chứng (ảnh/log/manifest/test output):
Giới hạn và đề xuất chạy lại:
```

## 17. Tài liệu tham chiếu

- [Trạng thái dự án](../PROJECT_STATUS.md)
- [Hướng dẫn OCR và bộ Bill](../../.agents/skills/picket-ocr-testing/SKILL.md)
- [Báo cáo OCR mobile mở rộng](../migration/MOBILE_OCR_EXPANDED_20261028.md)
- [Báo cáo OCR mobile có cấu trúc](../migration/MOBILE_STRUCTURED_OCR_20261028.md)
- [Google Play readback 1.0.14/code 28 — Internal và alpha, 01/11/2026](../migration/STORE_RELEASE_READBACK_20261101.md)
- [Google Play Help: tạo internal/closed test và quản lý tester](https://support.google.com/googleplay/android-developer/answer/9845334)
- [Google Play Help: yêu cầu closed testing cho tài khoản developer cá nhân mới](https://support.google.com/googleplay/android-developer/answer/14151465)
- [README mobile](../../apps/mobile/README.md)
