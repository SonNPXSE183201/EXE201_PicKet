# Kế hoạch đưa PicKet lên chính thức (Production) trên Google Play — 19/11/2026

Gói `com.picket.mobile`. Tài khoản nhà phát triển cá nhân. Google đã duyệt quyền phát hành production.
Nguồn chính sách: các trang support.google.com và developer.android.com được liệt kê ở cuối file (đọc ngày 19/11/2026).

## 0. Hiện trạng đã kiểm tra

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Target API | Đạt | Nhắm API 36; từ 31/8/2026 bản mới và bản cập nhật bắt buộc API 36 |
| Quyền ảnh | Đạt | Dùng Photo Picker, không khai `READ_MEDIA_IMAGES`; `READ_EXTERNAL_STORAGE` chỉ áp dụng đến Android 12 (`maxSdk 32`) |
| Quyền SMS | Đạt | Không có `READ_SMS`/`RECEIVE_SMS` (OTP qua Firebase) |
| Thanh toán bản Play | Đạt | Gói Plus/Pro dùng Play Billing; PayOS chỉ có trong APK ngoài Play |
| Xoá tài khoản | Đạt | Có trong app và trên web (`picketfinance.com/account-deletion.html`) |
| Chính sách quyền riêng tư | Đạt | `picketfinance.com/privacy.html`, có liên kết trong app |
| Chữ "PayOS" trong bản Play | **Cần sửa** | Còn 2 câu tiếng Anh trong file bản dịch dùng chung (không hiển thị trên bản Play, nhưng nên tách hẳn ra) |
| Tên trên biểu tượng | **Cần sửa** | Ảnh biểu tượng (launcher và 512×512 trên Play) vẫn ghi "Picket" |
| Tài khoản cho người review | **Chưa có** | Cần tài khoản demo đăng nhập được mà không cần OTP |
| Closed testing (alpha) | Giữ nguyên | Không đóng track, không xoá tester; chỉ thêm bản mới |

## 1. Việc cần làm trước khi gửi duyệt (ước tính 2–4 ngày)

### 1.1 Mã nguồn và build
- [ ] Tách các câu nói về PayOS ra khỏi file bản dịch dùng chung, để chúng chỉ có trong APK ngoài Play. Sau khi build, quét lại AAB: chữ "PayOS" phải bằng 0.
- [ ] Đổi ảnh biểu tượng có chữ "PicKet" (adaptive icon và ảnh 512×512 PNG 32-bit, tối đa 1 MB).
- [ ] Màn hình gói (Play Billing) phải ghi rõ: giá bằng VND, chu kỳ, tự gia hạn, cách huỷ (liên kết tới trang quản lý gói đăng ký của Play), và rằng app vẫn dùng được khi không mua gói. Không chỉ hiện giá quy ra tháng cho gói năm.
- [ ] Rà lại Android vitals của các bản test: tỉ lệ crash dưới 1,09%, ANR dưới 0,47%.

### 1.2 Tài khoản cho người review (mục App access)
- [ ] Tạo tài khoản demo **email + mật khẩu**, không có OTP, luôn hợp lệ, không chặn theo vùng. Mở sẵn gói Pro, hoặc ghi cách vào tính năng trả phí. Viết hướng dẫn bằng tiếng Anh.
- [ ] Không dùng số điện thoại thử của Firebase làm đường chính cho người review (chưa xác nhận được Google có chấp nhận hay không).

### 1.3 Trang cửa hàng (Store listing)
- [ ] Tên: "PicKet - Quản lý thu chi" (24/30 ký tự). Không dùng emoji hay "#1", không nhắc giá hoặc khuyến mãi.
- [ ] Mô tả ngắn tối đa 80 ký tự, mô tả đầy đủ tối đa 4.000 ký tự, chỉ mô tả tính năng app thật sự có.
- [ ] Ảnh nổi bật (feature graphic) 1024×500 JPEG hoặc PNG 24-bit.
- [ ] Ít nhất 4 ảnh chụp màn hình điện thoại 1080×1920 (9:16), chụp từ bản 1.3.1.
- [ ] Email hỗ trợ: picketfinance@gmail.com.

### 1.4 Khai báo nội dung ứng dụng (App content)
- [ ] **Data safety**, khớp với hành vi thật của app và các SDK (Firebase):
  - Ảnh hoá đơn gửi lên server khi OCR dự phòng → "Photos".
  - Số điện thoại, email, tên → "Personal info".
  - Thống kê (có hỏi đồng ý) → "App interactions" / "App info and performance", đánh dấu là tuỳ chọn.
  - Dữ liệu tài chính người dùng nhập (giao dịch, ngân sách) → "Financial info → Other financial info".
  - Dữ liệu được mã hoá khi truyền; người dùng yêu cầu xoá được (dán URL trang xoá tài khoản).
- [ ] **Tính năng tài chính:** chọn "My app doesn't provide any financial features", vì app chỉ ghi chép chi tiêu, không cho vay, không giữ hay chuyển tiền. Cần xác nhận lại trong Play Console.
- [ ] **Sức khoẻ:** chọn không có tính năng sức khoẻ. **Tin tức, chính phủ:** chọn không.
- [ ] **Quảng cáo:** chọn không. **Đối tượng mục tiêu:** từ 18 tuổi trở lên (tránh chính sách Families).
- [ ] **Phân loại nội dung (IARC):** điền bảng câu hỏi.
- [ ] **Quốc gia:** Việt Nam (có thể thêm sau). **Giá:** miễn phí; gói đăng ký là mua trong ứng dụng.

## 2. Gửi bản Production (ngày D)
1. Tạo bản Production từ **cùng AAB đã thử ở Internal/Closed** (không build lại). Ghi chú phát hành bằng vi-VN và en-US.
2. Bản production đầu tiên phát hành **100%** cho các quốc gia đã chọn; lần đầu không dùng được phát hành theo giai đoạn (staged rollout).
3. Bấm "Gửi để xem xét". Google review từ vài giờ đến **7 ngày**. **Không gửi thêm thay đổi trong lúc đang review**, vì có thể bị đẩy về cuối hàng đợi.
4. Managed publishing: lần phát hành đầu có thể không áp dụng. Với các bản cập nhật sau, thay đổi chờ ở "Tổng quan về việc xuất bản" và chủ tài khoản bấm "Phát hành thay đổi".

## 3. Sau khi lên chính thức
- Các bản cập nhật sau phát hành theo giai đoạn: 10% → 50% → 100%. Mỗi giai đoạn theo dõi crash/ANR 1–2 ngày; dừng lại (halt) nếu vượt ngưỡng.
- Đặt `inAppUpdatePriority` khi tạo bản phát hành: 0–2 cho bản thường, 4–5 cho bản sửa lỗi nghiêm trọng (giá trị này không sửa được sau khi tạo).
- Closed testing vẫn giữ để thử bản mới trước production.
- APK ngoài Play (landing, APKPure) và PayOS vẫn giữ nguyên. Chương trình xác minh nhà phát triển Android áp dụng toàn cầu từ 2027; cần theo dõi để đăng ký kịp cho APK ngoài Play.
- Trả lời đánh giá trên Play và cập nhật phần Câu hỏi thường gặp trên landing.

## 4. Lý do bị từ chối thường gặp và cách tránh
| Lý do | Cách tránh |
|---|---|
| Người review không đăng nhập được (OTP, tài khoản hết hạn) | Tài khoản demo email/mật khẩu cố định (mục 1.2) |
| Data safety không khớp app hoặc SDK | Đối chiếu mục 1.4 với mã nguồn và Firebase |
| Dẫn người dùng sang thanh toán ngoài Play | Tách hẳn PayOS khỏi bản Play (mục 1.1) |
| Mô tả hoặc ảnh không đúng với app | Chụp ảnh từ đúng bản gửi duyệt |
| Gói đăng ký gây hiểu lầm, không có cách huỷ | Mục 1.1, màn hình gói |
| App lỗi hoặc quá sơ sài | Thử đủ luồng chính trên Redmi trước khi gửi |

## 5. Mốc thời gian đề xuất
| Ngày | Việc |
|---|---|
| D-4 → D-2 | Mục 1.1 (build 1.3.2), tạo tài khoản demo, chuẩn bị ảnh và trang cửa hàng |
| D-1 | Điền App content; thử bản 1.3.2 qua Internal → Closed |
| D | Gửi bản Production |
| D+1 → D+7 | Chờ duyệt; không gửi thay đổi khác |
| Sau khi duyệt | Theo dõi vitals 7 ngày; bản sau phát hành theo giai đoạn |

## Nguồn
- Quyền production cho tài khoản cá nhân: https://support.google.com/googleplay/android-developer/answer/14151465
- Managed publishing, thời gian review: https://support.google.com/googleplay/android-developer/answer/9859654
- Trang cửa hàng và đồ hoạ: https://support.google.com/googleplay/android-developer/answer/9859152, https://support.google.com/googleplay/android-developer/answer/9866151
- App content, App access: https://support.google.com/googleplay/android-developer/answer/9859455, https://support.google.com/googleplay/android-developer/answer/15748846
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Khai báo tính năng tài chính: https://support.google.com/googleplay/android-developer/answer/13849271
- Xoá tài khoản: https://support.google.com/googleplay/android-developer/answer/13327111
- Thanh toán: https://support.google.com/googleplay/android-developer/answer/9858738, https://support.google.com/googleplay/android-developer/answer/10281818
- Gói đăng ký: https://support.google.com/googleplay/android-developer/answer/9900533
- Target API: https://support.google.com/googleplay/android-developer/answer/11926878
- Quyền ảnh và media: https://support.google.com/googleplay/android-developer/answer/14115180
- SMS: https://support.google.com/googleplay/android-developer/answer/10208820
- Phát hành và staged rollout: https://support.google.com/googleplay/android-developer/answer/9859348, https://support.google.com/googleplay/android-developer/answer/6346149
- Android vitals: https://developer.android.com/topic/performance/vitals
- Xác minh nhà phát triển: https://developer.android.com/developer-verification
