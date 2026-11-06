# Billing lifecycle, ảnh Google Play và APK 1.0.9 — 28/10/2026

## Phát hành đã xác minh

- Landing production cung cấp APK trực tiếp 1.0.9/code 22 ARM64, 82.830.432 byte, SHA-256 `38248068f79e631eefb69273d14db32480ba95add22968625ee17f2d8cd8b56b`. Chữ ký khớp bản cũ; package/ABI/minSdk/quyền installer đúng kênh. Tải toàn bộ APK HTTPS và đối chiếu checksum đạt.
- Build thêm x86_64 cùng source/chữ ký để kiểm thử cập nhật native code 18 → 22: tài khoản, số dư và 4 ví giữ nguyên. Không xóa dữ liệu tài khoản thật. Đây không thay thế nghiệm thu cập nhật trên điện thoại ARM64.
- Deploy bằng script chuẩn; web/API/OCR không thay container. Backup `/opt/picket/deploy/backups/landing-20261027T173232305720Z/before`.
- Thay 7 phoneScreenshots VI và en-US bằng ảnh native Paper sáng/tối có dữ liệu tổng hợp. Lưu ảnh cũ trước khi thay trong một edit; đọc lại độc lập đúng thứ tự/hash. Các màn chung không thay sau lượt QA Paper; ảnh không giả là screenshot của binary code 22, không công bố tài chính tài khoản thật. Ảnh màn gói code 22 giữ ở báo cáo trước, không dùng số liệu mua test làm marketing.
- Play Internal vẫn code 22 completed; alpha code 6 draft, production/beta không đổi. API commit ảnh không đồng nghĩa ảnh đã công khai với mọi người dùng: app vẫn draft/chưa review, Console còn gate thiết lập và closed test theo quyết định chủ dự án.
- Finance category đã đọc lại. Website hỗ trợ đổi từ sslip sang `https://picketfinance.com`, email Picket và số +84369076214 đã lưu. Bổ sung khai báo Advertising ID: Không, sau khi rà source/dependency/manifest không có AD_ID. Đọc lại 10 khai báo processed, không còn mục Cần chú ý; URL privacy mới đã lưu. Nút gửi review đang khóa; không gửi alpha draft.
- APKPure đã đăng nhập và đọc lại: code 19/1.0.6 vẫn Publishing/Pending Approval, developer Verified, nút Publishing disabled. Không hủy hồ sơ đang duyệt. Bộ upload 1.0.9 đã chuẩn bị trong artifact; chưa thể submit bản mới trong trạng thái này.

## Thanh toán và RTDN

| Ca | Bằng chứng |
| --- | --- |
| Acknowledgement | Android Publisher subscriptionsv2 đọc cả bốn token test: ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED |
| Hủy gia hạn | Hai gói năm từ ACTIVE → CANCELED, expiry giữ nguyên; backend vẫn active trước expiry |
| Hết hạn | Server tự chuyển hai gói năm về active=false tại expiry mà app không mở; gói Pro tháng hết vòng test cũng được thu hồi; mở app về Free 3/3 |
| Refund/revoke | Plus tháng xác nhận testPurchase trước mutation; full refund/revoke làm EXPIRED, backend active=false |
| Từ chối mua | Always declines trả lỗi Google; quay về app vẫn Free, không cấp quyền sớm |
| Mất mạng sau mua | Plus tháng mới bằng Test card: Payment successful, ngắt Wi-Fi/data trước về app, UI còn Free; bật mạng, force-stop/mở lại tự PLUS 30/30, không Restore/mua lại |
| Chủ khác | Tài khoản Picket tạm gọi verify với token Google thuộc chủ thật bị từ chối HTTP 502; tier Free, tài khoản tạm đã xóa |
| RTDN thực | Subscription pull QA quan sát renewal(2), cancellation(3), purchase(4), revoke(12); server verified_at/expiry/active tương ứng được đọc lại |
| Grace period | Payment method của riêng Plus tháng đổi sang always declines. Publisher IN_GRACE_PERIOD, RTDN loại 6, server vẫn active/PLUS 30/30 |
| Account hold | Sau grace, Publisher ON_HOLD; RTDN loại 5; backend active=false khi app đóng. Mở lại UI FREE 3/3 |
| Recovery từ hold | Play Billing Lab Restore → Publisher ACTIVE, RTDN loại 1, server active=true, UI PLUS 30/30. Đã dừng gia hạn gói test sau QA; còn quyền tới expiry |
| Trùng/sai thứ tự | Offline test chạy handler RTDN thật với Google/JWT/RPC giả lập: lặp và event cũ đều đọc trạng thái Google hiện tại, dùng cùng token hash; không tin notificationType để cấp quyền |

Chỉ dùng Google test instruments, không thẻ thật. Mọi mutation qua Publisher đều kiểm `testPurchase` trước. Token chỉ xử lý trong bộ nhớ, không ghi vào báo cáo/source/log. Không sửa số dư hoặc giao dịch tài chính của chủ dự án.

## Giới hạn còn mở

- Live replay RTDN bị automatic approval review từ chối “blocked by policy”; không đổi đường gửi để vượt block. Offline handler test không thay bằng chứng live replay.
- Pending native: **không áp dụng cho bốn base plan auto-renew hiện hành**. Google chỉ hỗ trợ pending subscription cho prepaid plans; Picket chưa bán prepaid. UI test chỉ có ba test instrument phù hợp. Source vẫn kiểm PENDING/PENDING_PURCHASE_CANCELED không cấp/ack. Không tạo thêm sản phẩm prepaid chỉ để đóng checklist. [Giới hạn pending chính thức](https://developer.android.com/google/play/billing/subscriptions#pending).
- Renewal failure/grace/hold đã được kiểm chứng thực tế. Không coi test source là bằng chứng pending native hoặc live replay.
- APKPure còn chờ review nền tảng. Play production và closed-test rollout không thực hiện.

## Kiểm tra

Đã dọn 30 thư mục output sinh tự động (4,97 GiB), kiểm lại 50 APK/AAB backup giữ nguyên hash.

11 tests thực thi verifier/RTDN source trong Node VM (mock network/JWT, không gọi Google), 13 SQL migration suites và quota Free/Plus/Pro PASS. Không thay schema hoặc Edge Function runtime để tạo bằng chứng. Bằng chứng riêng tư: `.artifacts/billing-lifecycle-20261028/`. Subscription pull QA tạm đã xóa; production push không thay đổi. Wi-Fi/data đã bật lại, hồ sơ Android QA tạm đã xóa, account Owner của emulator cập nhật vẫn giữ dữ liệu.

Nguồn: [Google Billing testing](https://developer.android.com/google/play/billing/test), [cancel API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/cancel), [revoke API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/revoke). [Trạng thái](../PROJECT_STATUS.md) · [Backlog](../BACKLOG.md).
