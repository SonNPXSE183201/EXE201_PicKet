# Mobile cloud CRUD và owner isolation — 27/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).

Trạng thái chung: [PROJECT_STATUS](../PROJECT_STATUS.md). Thiết bị: Pixel_5 AVD, Android x86_64, package `com.picket.mobile`, **1.0.5/code 18**. Đây là nghiệm thu giao diện mobile với API/Supabase production bằng dữ liệu tổng hợp, không thay thế camera/sinh trắc/hiệu năng ARM64 thật.

## Phạm vi và kiểm soát dữ liệu

- Hai tài khoản dùng một lần: Demo A và Demo B, mailbox test `mobile-cloud-…@example.test`.
- Onboarding qua Dart API: ví A 1.000.000 VND, ví B 300.000 VND.
- Không tạo/sửa/xóa giao dịch của tài khoản Google thật. Đã đăng xuất tài khoản thật theo quyền chủ dự án, rồi khôi phục Google sign-in sau khi test.
- Network chỉ thay đổi trên AVD. Cuối lượt Wi-Fi và mobile data trở về trạng thái ban đầu: bật/bật.
- Credential test không in ra báo cáo hoặc commit. Sau cleanup, file credential local dùng một lần đã xóa.

## Kết quả thực thi

| Ca | Kết quả và bằng chứng |
| --- | --- |
| Login A | PASS: Home đúng A, một ví, số dư 1.000.000 VND |
| Create offline | PASS: tắt Wi-Fi/data, nhập và lưu khoản chi `Cloud Offline Acceptance` 12.345 VND; danh sách có một giao dịch |
| Cold restart offline | PASS: Home còn 987.655 VND, nhịp chi 12.345 VND, một thay đổi chờ đồng bộ; server A/B đều có 0 giao dịch |
| A sign out offline → B online | PASS: B chỉ có 300.000 VND, danh sách 0 giao dịch; server A/B vẫn 0, queue A không dispatch dưới B |
| B cold restart | PASS: giữ phiên B và không lộ giao dịch A |
| Return A online | PASS: server A đúng một giao dịch 12.345 VND, B 0; cold restart/reconnect không tạo bản ghi thứ hai |
| Edit offline | PASS: sửa thành 20.000 VND, chờ UI hoàn tất lưu, force-stop/relaunch offline; số dư 980.000 VND và một thay đổi chờ sync, server còn 12.345 VND trước sync |
| Edit sync | PASS: server cập nhật bản ghi đó thành 20.000 VND, count vẫn 1; B vẫn 0 |
| Delete offline | PASS sau khi UI xác nhận hoàn tất: danh sách 0, cold restart còn 1.000.000 VND và một thay đổi chờ sync |
| Delete sync | PASS: server A có 0 active/1 soft-deleted transaction; B 0/0; không xóa cứng bản ghi tài chính để giả đạt |
| Restore real session | PASS: Google account chooser → Picket callback → Home tài khoản ban đầu; không đọc/nhập mật khẩu Google |
| Cleanup | PASS: xóa đúng hai fixture Auth users bằng Admin API sau kiểm tra ID/email namespace; truy vấn độc lập còn 0 fixture |

Một lượt đầu đã force-stop ngay sau nút xác nhận xóa, trước khi UI xác nhận lưu. Khi mở lại, bản ghi cũ vẫn còn cả local và cloud; không có thông báo thành công được quan sát. Lượt này chỉ là interruption trước acknowledgement, không tính là delete PASS. Đã lặp lại ca đúng tiêu chí: đợi danh sách chuyển về 0 rồi restart, và trạng thái xóa được giữ bền vững.

Đồng bộ là bất đồng bộ: truy vấn đầu sau khi bật mạng vẫn có thể thấy giá trị cũ; chỉ đánh dấu PASS khi truy vấn sau xác nhận trạng thái cuối. Không dùng độ trễ của một truy vấn đầu để bịa thành lỗi mất dữ liệu hoặc xác nhận thành công sớm.

## Bằng chứng

Local dưới `.artifacts/completion-20261027/`:

- `mobile-cloud-before.json`, `mobile-cloud-owner-b.json`, `mobile-cloud-after.json`.
- `mobile-cloud-edit-before.json`, `mobile-cloud-edit-settled.json`, `mobile-cloud-delete-final.json`.
- `mobile-fixture-cleanup.log`, `mobile-cleanup-confirmation.json`.
- Ảnh synthetic trong `mobile-ui/`: `cloud-offline-restart.png`, `cloud-owner-b-isolated.png`, `cloud-edit-offline-restart.png`, `cloud-delete-durable-offline.png`.

Không upload XML OAuth/tài khoản thật lên listing hoặc Git. Không tuyên bố toàn bộ conflict editor, cloud receipt media, Billing hoặc thiết bị thật đã được kiểm tra bởi các ca này.

## Phân công thiết bị thật

Chủ dự án xác nhận sẽ tự test sau. Các ca thiết bị thật giữ trạng thái chờ chủ dự án, không chặn việc agent tiếp tục các phần source/CI khác.
