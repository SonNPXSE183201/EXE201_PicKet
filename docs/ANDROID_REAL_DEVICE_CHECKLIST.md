# Nghiệm thu Picket trên điện thoại Android thật

Ngày lập: 22/10/2026. Đối tượng: bản production **1.0.4 (5)**, package `com.picket.mobile`, ARM64. Không dùng APK có `.qa`, debug, proxy hoặc probe. Trạng thái từng ca bên dưới là **CHỜ NGƯỜI DÙNG TEST**, không phải kết quả máy ảo. Xem [trạng thái hiện hành](PROJECT_STATUS.md).

## Chuẩn bị và cách ghi kết quả

1. Ghi model máy, Android, RAM, dung lượng trống, ngày/giờ và mạng đang dùng. Nên có một máy Android mới và nếu có thể một máy RAM thấp.
2. Giữ nguyên app cũ. Trong app xuất backup có ảnh, đặt mật khẩu, lưu ở thư mục riêng; xác minh file tồn tại. Không gửi backup/mật khẩu/token lên chat hoặc GitHub.
3. Chụp lại tổng số dư, danh sách ví, một số giao dịch và ảnh hóa đơn/kỷ vật đối chứng. Với tài khoản thật, ghi chúng vào nơi riêng của bạn.
4. Dùng dữ liệu test có tiền tố `PHONE-QA-YYYYMMDD-…`. Chỉ xóa chính các dữ liệu này khi kết thúc. Không thực hiện chốt tháng/thu hồi phiên/đầy ổ trên kỳ tài chính hay thiết bị sử dụng hằng ngày nếu chưa có backup.
5. Mỗi ca ghi: mã ca, máy/Android, app version, bước đã làm, kết quả mong đợi/thực tế, PASS/FAIL, ảnh/video, thời điểm. Khi lỗi: dừng ở màn lỗi, ghi đường đi tái hiện; không Clear data hoặc gỡ app để “sửa”.
6. Có thể làm tất cả ca không phá dữ liệu trên tài khoản riêng của bạn; ca A–B cần thêm tài khoản test thứ hai. Ca Billing chỉ làm theo [hướng dẫn sandbox](GOOGLE_PLAY_SANDBOX_TO_PRODUCTION.md), không thử mua thật từ APK landing.

## A. Cài đè và cập nhật

### A01 — Cài đè từ landing, không mất dữ liệu

1. Khi app cũ còn cài, vào Cá nhân và ghi phiên bản cũ.
2. Mở landing HTTPS bằng Chrome, tải APK production mới; không gỡ app cũ.
3. Nếu Android hỏi quyền cài từ nguồn này, chỉ bật cho trình duyệt/trình cài đang dùng. Xem tên ứng dụng và xác nhận cập nhật; không tắt Play Protect.
4. Mở app → Cá nhân: phải hiện **1.0.4 (5)**.
5. So lại phiên đăng nhập, ví, số dư, giao dịch, ảnh và cài đặt với dữ liệu đối chứng. Mở lại app khi mất mạng để kiểm tra cache đã tải.
6. PASS: cài đè thành công, không yêu cầu gỡ app, không mất/trộn dữ liệu. Nếu báo xung đột chữ ký, dừng và báo lại; không gỡ app để vượt lỗi.

### A02 — Cập nhật từ Cá nhân

1. Trên bản cũ đã hỗ trợ updater, mở Cá nhân → cập nhật ứng dụng → kiểm tra.
2. Khi báo có bản mới, tải bằng Wi-Fi, mở trình cài và xác nhận Android. Nếu chưa có bản mới, phải báo đang dùng bản mới nhất, không tự cài lại.
3. Quay lại app sau cài: kiểm tra footer và dữ liệu như A01. Tắt lại quyền cài từ nguồn ngoài sau test nếu không cần.
4. Thử bắt đầu tải khi mất mạng; bật lại mạng và thử lại. Không được mở trình cài cho file tải dở.
5. PASS: chỉ thông báo thành công sau xác minh/cài đúng bản; hủy quyền/hủy cài không làm mất dữ liệu hoặc khóa UI. Không tự động hạ phiên bản.

## B. Đăng nhập, quyền riêng tư và offline

### B01 — Google và mở lạnh

1. Đăng nhập Google bằng tài khoản test; chọn đúng tài khoản và xác nhận nếu Google yêu cầu.
2. Đóng app bằng màn recent rồi mở lại, sau đó dùng Android Settings → Apps → Picket → Force stop → mở lại.
3. Đăng xuất rồi thử email/password nếu bạn có tài khoản phù hợp. Khi bấm một phương thức, chỉ nút tương ứng có spinner.
4. PASS: không quay vòng callback, không về nhầm màn, không yêu cầu đăng nhập lại mỗi lần mở; hủy Google trả về an toàn. Không gửi mật khẩu cho người kiểm thử.

### B02 — Guest, offline và hai tài khoản

1. Với guest, tạo ví và giao dịch test, đính kèm một ảnh, force-stop rồi mở lại khi airplane mode.
2. Với tài khoản A, online tải dữ liệu/ảnh trước; bật airplane mode, tạo ví test và ba giao dịch dùng ví vừa tạo.
3. Force-stop, mở lại offline: ví và giao dịch còn, trạng thái chờ đồng bộ không báo thành công giả.
4. Bật mạng, chờ đồng bộ, kiểm tra chỉ một ví/ba giao dịch và tổng đúng; force-stop/mở lại kiểm tra lần nữa.
5. Đăng xuất A khi offline, bật mạng đăng nhập B; B không được thấy ví, giao dịch, draft hoặc ảnh A. Quay lại A: dữ liệu A phải còn và không nhân đôi.
6. PASS: guest/A/B tách dữ liệu; reconnect không tạo trùng. Chỉ thử thu hồi phiên/hết hạn có kiểm soát với tài khoản test; không đổi giờ hệ thống hay thu hồi tài khoản đang dùng để ép lỗi.

### B03 — Sinh trắc học trên cảm biến thật

1. Bật PIN/mật khẩu khóa màn hình và đăng ký vân tay/khuôn mặt trong Android trước.
2. Mở Picket → Cá nhân → bảo mật/sinh trắc học, bật khóa; xác thực bằng cảm biến.
3. Đưa app xuống nền rồi quay lại; khóa màn hình máy/mở lại; force-stop rồi mở app.
4. Thử xác thực đúng, sai vài lần và bấm hủy. Nếu Android đưa xác thực dự phòng, kiểm tra theo chính sách hiển thị; không ép khóa máy nhiều lần.
5. Tắt sinh trắc học trong app rồi mở lại; thử máy chưa đăng ký sinh trắc học nếu có thiết bị phụ.
6. PASS: không lộ màn tài chính trước mở khóa; hủy không vào được màn bị khóa; thành công không làm app nhấp nháy/reload toàn bộ; máy không hỗ trợ có thông báo và cách xử lý rõ ràng.

## C. Camera, ảnh và OCR thực tế

### C01 — Camera thật, quyền và phần cứng

1. Từ Dashboard bấm icon Quét hóa đơn: camera mở trực tiếp, chỉ có một lựa chọn thư viện đúng vị trí.
2. Thử cho phép camera; ở một lượt khác từ chối, sau đó vào Android Settings cấp lại. Không xóa dữ liệu app.
3. Chụp hóa đơn đủ sáng, thiếu sáng vừa phải, giấy dài, góc nghiêng và có bóng; thử đèn flash/torch nếu UI hỗ trợ, khoảng cách lấy nét gần/xa.
4. Hủy chụp lại, mở thư viện chọn ảnh khác, xoay 90°; tên/số tiền/ngày đang sửa phải không tự mất.
5. PASS: preview không méo/che nút, đúng ảnh được chọn, không hỏi quyền micro không cần thiết, có đường quay lại khi từ chối quyền. Không khẳng định camera trước/zoom nếu UI không cung cấp.

### C02 — OCR online/offline và kiểm tra số tiền

1. Chụp ít nhất 5–10 hóa đơn khác nhau: nhiều dòng hàng, giảm giá, thuế/phí, số tiền lớn; có hóa đơn Việt Nam và ảnh không phải hóa đơn.
2. Chạy một lượt online, một lượt airplane mode. Ghi tên cửa hàng, ngày, tổng tiền OCR và số tiền đúng trên giấy; không mặc định OCR luôn đúng.
3. Sửa các trường OCR sai và dòng hàng trước khi lưu; kiểm tra dấu phân cách số tiền khi nhập/paste/xóa giữa chuỗi.
4. Nếu local OCR không đủ tin cậy và app đề nghị server fallback, xem consent trước khi đồng ý. Offline không được giả báo đã quét server.
5. Lưu giao dịch → chọn về Dashboard hoặc xem hóa đơn. Thử lại cùng ảnh: phải xử lý nghi trùng/exact duplicate theo UI, không âm thầm nhân giao dịch.
6. PASS: số tiền lưu khớp số bạn xác nhận, ảnh và giao dịch liên kết đúng, nhánh lỗi có thể sửa/thử lại; người dùng luôn kiểm tra OCR trước khi lưu.

### C03 — Chọn ngày từ lịch và vòng đời bản nháp

1. Chọn một ngày trống trong lịch → quét → sửa nội dung → lưu. Hóa đơn phải gắn đúng ngày đã chọn, không nhảy về hôm nay.
2. Chọn ngày đó lần nữa: xem được ảnh. Thêm hóa đơn thứ hai cùng ngày và xác minh có đủ cả hai.
3. Tạo draft khác, mở thư viện nhưng chưa chọn → force-stop → mở app. Phải giữ draft đã lưu trước, báo chọn lại nếu Android không giao ảnh; không nhận ảnh từ tài khoản khác.
4. Thử đổi app/chụp rồi quay lại, xoay ảnh, khóa màn hình giữa lúc OCR. Không force-stop đúng lúc ghi trên dữ liệu quan trọng.
5. PASS: không phải Back qua hàng loạt bước để về Dashboard; draft đã hoàn tất không hồi sinh sau restart; mất ảnh không khóa việc sửa metadata.

### C04 — Ảnh offline và kỷ vật

1. Online mở một ảnh hóa đơn và một ảnh kỷ vật để tải trước; bật airplane mode, force-stop và mở lại chúng.
2. Tạo kỷ vật có ảnh offline, sửa ghi chú/ảnh, force-stop, bật mạng; kiểm tra một bản ghi/ảnh đúng nội dung cuối.
3. Mở một ảnh chưa tải lúc offline: phải báo chưa có ảnh, không dùng nhầm ảnh khác. Đổi A–B như B02 để kiểm tra cách ly.
4. PASS: ảnh đã cache còn đọc được trong giới hạn cache, không hứa lưu offline mọi ảnh lịch sử; ảnh không nhảy qua owner hoặc biến mất sau retry.

## D. Luồng tài chính và trải nghiệm

### D01 — Ví/giao dịch/chuyển tiền

1. Tạo hai ví test với số dư ghi rõ; thêm một khoản thu, chi rồi sửa số tiền/ngày/danh mục; đối chiếu số dư từng bước.
2. Chuyển tiền giữa hai ví: tổng tài sản không tăng/giảm do chuyển nội bộ.
3. Thử split, hoàn tiền một phần và hoàn tiền hết giá trị hợp lệ; đối chiếu chi ròng/thống kê/ngân sách.
4. Archive một vài giao dịch test; mở lại app để kiểm tra trạng thái. Chỉ xóa fixture của bạn khi chắc đúng dòng.
5. PASS: tổng khớp phép tính tay; validation lỗi không tạo giao dịch ẩn, retry không tạo trùng.

### D02 — Planning, Review Inbox và conflict

1. Đổi Đơn giản/Phong bì và các phương pháp hiện có: không chèn dòng tải kỹ thuật làm nhảy layout.
2. Tạo ngân sách test, thêm chi/split/refund; kiểm tra số đã dùng/còn lại với phép tính tay.
3. Với kỳ test không có dữ liệu thật, thử chốt tháng/chuyển dư và nhánh từ chối sửa tháng đã đóng. Không chốt kỳ hiện tại đang sử dụng chỉ để test.
4. Mở Review Inbox, sửa một giao dịch chưa phân loại/hóa đơn cần kiểm tra; quay lại các màn phải cập nhật.
5. Nếu có máy thứ hai: cùng tài khoản, sửa cùng một giao dịch test ở hai máy; thử giữ server, hủy merge, sửa local/merge rồi đọc lại cả hai máy.
6. PASS: không mất thay đổi, hiển thị conflict thay vì ghi đè im lặng; kết quả hai máy hội tụ.

### D03 — Tiền, lịch, chữ lớn và phản hồi tức thời

1. Nhập/paste `123456789`, chạm giữa chuỗi, thêm/xóa chữ số, xóa cạnh dấu chấm; kiểm tra caret và số thực lưu.
2. Mở date picker, chọn tháng/ngày khác, hủy rồi mở lại; không phải nhập chuỗi ngày thủ công.
3. Ẩn/hiện số dư nhiều lần: lịch giữ ngày/ảnh, không nhấp nháy hoặc reload toàn app.
4. Android Font size 150%/mức lớn nhất và Display size lớn; rà Dashboard, form, camera, lịch, sheet/dialog, Cá nhân, cập nhật, login/onboarding. Cuộn tới cuối, mở bàn phím, kiểm tra nút lưu còn tới được.
5. Nếu dùng TalkBack: nghe tên icon, tiền, ngày, lỗi form, focus sheet và nút đóng. Đây là regression trên điện thoại, không yêu cầu lặp nghiệm thu spoken đã được bạn xác nhận trên máy ảo.
6. PASS: không nút bị che bởi notch/thanh điều hướng/bàn phím; logo không bị cắt, không log Dart/development trên UI production.

## E. Thông báo, pin và background

### E01 — Nhắc hóa đơn và cảnh báo ngân sách

1. Cho phép thông báo khi app hỏi; nếu từ chối, vào Android Settings cấp lại và thử.
2. Tạo nhắc hóa đơn test sau vài phút; đưa app xuống nền, khóa màn hình và chờ. Ghi thời gian dự kiến/thực tế.
3. Thử reboot trước giờ nhắc trên thiết bị phụ, mở app lại nếu Android yêu cầu sau force-stop; kiểm tra có một thông báo, không nhân đôi.
4. Tạo ngân sách nhỏ và chi test vượt ngưỡng; kiểm tra cảnh báo trong app và notification khi đủ điều kiện. Sửa/hoàn tiền để giảm chi; không được spam mỗi lần refresh.
5. Tắt nhắc trong app, kiểm tra lịch bị hủy. Đăng xuất A/đăng nhập B: không xuất hiện nhắc của A như của B.
6. PASS: thông báo có nội dung an toàn, mở đúng ứng dụng, không trùng. Ghi hãng máy và battery restrictions nếu bị trễ; không vô hiệu mọi cơ chế tiết kiệm pin để che lỗi. Force-stop Android có thể chặn giao việc nền cho tới khi người dùng mở app lại; ghi rõ trạng thái này.

### E02 — Partner Notice

1. Khi hệ thống có nội dung đối tác hợp lệ dành cho Free, mở bằng tài khoản Free test.
2. Kiểm tra chỉ nội dung đang có hiệu lực, mở link bằng HTTPS. Nếu chưa có campaign hợp lệ, ghi NOT APPLICABLE, không tự bật quảng cáo production.
3. Đổi sang Plus/Pro test đã xác thực server; nội dung phải tuân điều kiện gói. Đổi A–B/guest, đưa app xuống nền qua thời điểm hết hạn rồi quay lại.
4. PASS: không nội dung cũ của owner trước; campaign hết hạn không còn hiện. Đây là nội dung trong app, không phải quảng cáo push Android.

## F. Backup, an toàn và bàn giao kết quả

### F01 — Xuất/khôi phục trên Document Picker thật

1. Trên tài khoản/guest test có ảnh, xuất backup có mật khẩu → Share Sheet → lưu vào Documents; ghi file/ngày/kích thước.
2. Chọn file qua Document Picker, nhập sai mật khẩu một lần: không thay đổi dữ liệu hiện tại.
3. Nhập đúng, xem preview và cảnh báo phạm vi restore; chỉ xác nhận trên guest/môi trường test đã backup, không ghi đè dữ liệu thật để thử.
4. So số ví/giao dịch/tổng/ảnh với trước export; export lần nữa để kiểm tra dữ liệu vòng đi-về.
5. Thử một bản sao file hỏng (không phá file gốc): app từ chối và dữ liệu tốt còn nguyên. Không cố làm đầy bộ nhớ điện thoại chính; ca ENOSPC đã có máy ảo riêng.
6. Với file Flutter thật: giữ nguyên file gốc, nhập một bản sao trên môi trường test, đối chiếu từng loại dữ liệu và ảnh. Không ghi PASS nếu chỉ dùng fixture tổng hợp.

### F02 — Gửi kết quả và dọn fixture

1. Tổng hợp PASS/FAIL/NOT RUN/NOT APPLICABLE theo mã ca; đính kèm video/ảnh đã che email, số dư thật và dữ liệu cá nhân.
2. Mỗi lỗi ghi ít nhất: phiên bản app, máy/Android, online/offline, tiền điều kiện, bước cuối và kỳ vọng/thực tế. Không gửi JWT, mật khẩu, file keystore hoặc service-account JSON.
3. Chỉ dọn các ví/giao dịch/kỷ vật có tiền tố test sau khi không còn queue pending; không Clear data/gỡ app khi còn dữ liệu chưa đồng bộ.
4. Điều kiện chốt điện thoại: A01/A02, B01–B03, C01–C04, D01–D03, E01 và F01 đạt trên máy mục tiêu; E02 và Billing ghi rõ phụ thuộc. Lỗi mất dữ liệu, trộn tài khoản, tiền sai, cập nhật mất dữ liệu hoặc bypass khóa là lỗi chặn phát hành tiếp.

## Mẫu kết quả

| Mã | Máy / Android | App | Kết quả | Bằng chứng / ghi chú |
| --- | --- | --- | --- | --- |
| A01 | … | 1.0.4 (5) | NOT RUN | Cài đè từ …; dữ liệu đối chứng … |
| B03 | … | 1.0.4 (5) | NOT RUN | Loại cảm biến; hủy/sai/đúng/background/restart … |
| C02 | … | 1.0.4 (5) | NOT RUN | Tổng đúng / OCR / sau sửa; online/offline … |
| E01 | … | 1.0.4 (5) | NOT RUN | Giờ dự kiến/thực tế; quyền/battery/force-stop … |
