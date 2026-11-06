# Đồng bộ và xử lý xung đột — 27/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).

[Trạng thái chung](../PROJECT_STATUS.md).

## Lỗi đã tái hiện và sửa

- Hai lần bấm nhanh trước render kế tiếp có thể dispatch hai thao tác bỏ qua hoặc gửi bản ghép.
- Callback/confirmation cũ vẫn có thể dispatch sau unmount hoặc đổi owner.
- Phản hồi đọc cũ có thể đưa xung đột vừa xử lý trở lại màn hình.
- Lỗi lưu queue bị báo nhầm thành JSON sai; lỗi bỏ qua không được xử lý.
- Chuỗi VI hardcoded, timestamp ép vi-VN và nguyên văn reason upstream xuất hiện ở màn hình.

Test RED: f40b58bd. Bản sửa dùng khóa đồng bộ qua ref, kiểm tra vòng đời/owner, revision cho read, confirmation gắn với selection snapshot và thông báo có kiểm soát. Route mỏng, content remount theo owner. Mọi thao tác vẫn dùng owner-fenced queue store có sẵn, không bỏ RLS hoặc thay quy tắc tài chính.

## Giao diện

VI/EN đầy đủ cho màn conflict và merge, gồm loại thao tác, lỗi, dialog và accessibility. Đổi ngôn ngữ cập nhật cả thông báo lỗi hiện tại; nội dung người dùng không dịch. Không hiện nguyên upstream error. Ngày/tiền theo locale, tiền tệ lấy từ ví tương ứng; thiếu currency ghi rõ thay vì đoán VND. Nút đang xử lý bị khóa; touch target ít nhất 48px ở màn conflict.

## Kiểm tra source

- 15 focused tests PASS: callback concurrency/lifecycle/owner, stale reads, language/controlled errors và AST copy checks.
- Root npm test: 10 landing, 908 mobile, 54 web, 140 API cùng 13 SQL suite PASS.
- Mobile lint: 0 lỗi/0 cảnh báo sau xử lý toàn bộ 27 warning cũ.
- Mobile typecheck PASS.
- Hook dependencies bổ sung chỉ là setter useCachedState ổn định; useCachedState đã dùng useCallback không dependency. Không thêm vòng tải do đổi identity.
- Các sửa mechanical: import order, dạng array type, bỏ import router không dùng.

## Native và phát hành

Bản QA đã cài có certificate khác APK lưu sẵn; từ chối cài đè khác chữ ký, không uninstall hoặc xóa dữ liệu. Build package acceptance riêng để kiểm tra source mới. Native acceptance đã chạy trên com.picket.mobile.acceptance, AVD Picket_QA_35. Đăng nhập fixture, mở sửa giao dịch, ngắt mạng rồi sửa độc lập qua API để tạo version conflict. UI chọn tiêu đề local nhưng giữ số tiền server 15.000 VND. Confirmation và queue thành công; truy vấn API xác nhận đúng một giao dịch, title local, amount server, version 3. Màn VI merge và EN empty được xem screenshot. Các ảnh cuộn có nội dung ngoài viewport được kiểm tiếp bằng cuộn; không coi ảnh bị cắt ở biên cuộn là toàn màn đều đã quan sát.

Closed test giữ draft. Thiết bị vật lý do chủ dự án tự test sau. Play production, Billing sandbox, real-history forecast và pilot không tự chuyển PASS từ lượt này.

Log native: conflict-native-build.log, conflict-native-server-proof.log; ảnh conflict-merge-fields-vi.png và conflict-native-empty-en.png trong task mobile-ui. Hai fixture đã xóa qua Admin API đúng ID/namespace, credential local/remote đã dọn, reverse port và AVD acceptance đã đóng. Bản QA cũ không cài đè vì không cùng certificate. Metro localhost ban đầu nghe IPv6 ::1 nên AVD không kết nối; chuyển host mode và xác minh packager status IPv4 trước khi chạy.

Phát hành mới được chủ dự án yêu cầu lên landing và Google Play. Candidate 1.0.6/code 19; giữ alpha draft và chỉ upload Play Internal. Kết quả artifact/triển khai ghi riêng trong báo cáo release mới.
