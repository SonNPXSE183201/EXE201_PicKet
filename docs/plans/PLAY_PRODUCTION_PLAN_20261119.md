# Kế hoạch đưa PicKet lên chính thức (Production) trên Google Play — 19/11/2026

Gói `com.picket.mobile`. Tài khoản nhà phát triển cá nhân.
Google đã cấp quyền phát hành công khai (production) và cho phép dùng thử nghiệm mở (open testing).
Đã kiểm tra trực tiếp Play Console ngày 19/11/2026 (bản cập nhật sau khi mở Chrome).

## 0. Hiện trạng trên Play Console

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Quyền phát hành công khai | Đã có | Trang tổng quan: "Ứng dụng của bạn đã được cấp quyền phát hành công khai" |
| Closed testing (alpha) 1.3.1 (36) | Đã xuất bản | Giữ nguyên track, không xoá tester |
| Nội dung ứng dụng (App content) | Xong 11/11 | An toàn dữ liệu, đối tượng mục tiêu, phân loại nội dung, quảng cáo, tính năng tài chính, sức khoẻ, ứng dụng chính phủ, chính sách quyền riêng tư, mã nhận dạng quảng cáo, tư cách người bán, thông tin đăng nhập. Mục "Cần chú ý" trống |
| Tư cách người bán | Đã khai báo 14/11/2026 | Hạn chót của Google là 1/2/2027, đã xong |
| Trang cửa hàng | Đã có | Tiếng Việt và tiếng Anh, 5 ảnh chụp màn hình, ảnh nổi bật |
| Gói đăng ký | 4 gói ACTIVE | Plus/Pro, tháng/năm. **Chỉ có giá ở Việt Nam (VND)** |
| Màn hình gói (bản Play) | Đạt | Có "Tự gia hạn mỗi tháng/năm", nút "Quản lý hoặc hủy gói trên Google Play", ghi chú hoàn tiền/huỷ |
| Đăng nhập trong app | Đạt | Email + mật khẩu, không có OTP |
| Biểu tượng | Giữ nguyên | Theo yêu cầu của chủ dự án, không đổi |
| Thay đổi chưa gửi duyệt | 2 mục | Production: thêm 177 quốc gia và "các nơi khác trên thế giới" |

## 1. Việc còn phải làm trước khi gửi duyệt

### 1.1 Bắt buộc
- [ ] **Hướng dẫn cho người review phải bằng tiếng Anh.** Mục "Thông tin đăng nhập" → "PicKet review access" đang ghi hướng dẫn bằng tiếng Việt. Google yêu cầu tiếng Anh. Nội dung đề xuất:
  > Open PicKet → tap "Đăng nhập" (Sign in) → enter the email and password above. No verification code is needed. The account has the Pro plan active, so all paid features are available. Guest mode works without an account and stores data only on the device.
- [ ] **Kiểm tra tài khoản review vẫn dùng được:** đăng nhập bằng mật khẩu đã khai, tài khoản đang có gói Pro (phần khai báo đã tick "truy cập đầy đủ kể cả nội dung trả phí"). Nếu chưa có Pro, cấp Pro cho tài khoản này từ trang admin.
- [ ] **Chốt quốc gia phát hành.** Đang có thay đổi chờ gửi: phát hành cho 177 quốc gia và các nơi khác. Nhưng gói đăng ký chỉ có giá VND ở Việt Nam, nên người dùng ở nước khác không mua được gói. Chọn một trong hai:
  - Chỉ Việt Nam (đúng với nội dung, tiền tệ, OCR hoá đơn Việt): bỏ 2 thay đổi này.
  - Toàn cầu: giữ, và thêm giá vùng cho 4 gói (Play Console tự quy đổi được).
- [ ] **Rà lại An toàn dữ liệu** (khai ngày 24/10/2026). Từ đó đến nay app đã thêm đăng ký bằng số điện thoại (Firebase) và OCR dự phòng trên server. Phải có: số điện thoại, email, tên; ảnh hoá đơn; thông tin tài chính khác; thống kê tuỳ chọn.

### 1.2 Nên làm (không chặn việc gửi duyệt)
- [ ] Tách 2 câu nói về PayOS khỏi `apps/mobile/src/core/i18n/auth-resources.ts` sang phần chỉ dùng cho APK ngoài Play. Hai câu này không hiện trên bản Play. Có thể làm ở bản cập nhật sau.
- [ ] Thay ảnh chụp màn hình bằng ảnh từ bản 1.3.1 nếu giao diện đã khác ảnh cũ (đăng nhập/đăng ký mới).
- [ ] Rà Android vitals: crash < 1,09%, ANR < 0,47%.

### 1.3 Không cần nữa
- Không cần build bản mới: dùng luôn AAB **1.3.1 (36)** đã qua Internal và Closed testing.
- Không cần thử nghiệm mở (open testing). Đây là tuỳ chọn để ai cũng tham gia thử được. Đã có quyền production thì có thể phát hành thẳng.
- Không cần đổi biểu tượng.
- Không cần tạo tài khoản review mới: đã có, chỉ cần sửa hướng dẫn sang tiếng Anh và kiểm tra (mục 1.1).

## 2. Gửi bản Production (ngày D)
1. Vào **Phát hành → Phát hành công khai → Tạo bản phát hành mới**. Chọn "Thêm từ thư viện" → AAB 1.3.1 (36). Không build lại.
2. Ghi chú phát hành vi-VN và en-US.
3. Bản production đầu tiên phát hành **100%**; lần đầu không dùng staged rollout.
4. Tổng quan về việc xuất bản → "Gửi … thay đổi để được xem xét". Gồm bản phát hành, quốc gia và các sửa đổi ở mục 1.1.
5. Google duyệt từ vài giờ đến 7 ngày. **Không gửi thêm thay đổi trong lúc đang duyệt.**
6. Chế độ xuất bản có quản lý đang bật: duyệt xong, chủ tài khoản bấm "Phát hành thay đổi" thì app mới hiện công khai.

## 3. Sau khi lên chính thức
- Bản cập nhật sau phát hành theo giai đoạn 10% → 50% → 100%, mỗi giai đoạn theo dõi crash/ANR 1–2 ngày.
- Đặt `inAppUpdatePriority` khi tạo bản: 0–2 bản thường, 4–5 bản sửa lỗi nghiêm trọng.
- Closed testing vẫn giữ để thử bản mới trước production.
- APK ngoài Play (landing) và PayOS giữ nguyên. Theo dõi chương trình xác minh nhà phát triển Android (toàn cầu từ 2027) cho APK ngoài Play.
- Trả lời đánh giá trên Play.

## 4. Lý do bị từ chối thường gặp
| Lý do | Cách tránh |
|---|---|
| Người review không đăng nhập được | Hướng dẫn tiếng Anh, tài khoản có Pro, kiểm tra trước khi gửi |
| Data safety không khớp | Rà lại theo mục 1.1 |
| Dẫn sang thanh toán ngoài Play | Bản Play không có màn hình PayOS |
| Gói đăng ký không rõ cách huỷ | Đã có, xem mục 0 |
| Mô tả hoặc ảnh không đúng app | Ảnh chụp từ bản đang gửi |

## 5. Mốc thời gian đề xuất
| Ngày | Việc |
|---|---|
| D-1 | Mục 1.1: sửa hướng dẫn review, kiểm tra tài khoản, chốt quốc gia, rà Data safety |
| D | Tạo bản Production từ AAB 36 và gửi duyệt |
| D+1 → D+7 | Chờ duyệt, không gửi thay đổi khác |
| Sau khi duyệt | Bấm "Phát hành thay đổi", theo dõi vitals 7 ngày |

## Nguồn
- Quyền production cho tài khoản cá nhân: https://support.google.com/googleplay/android-developer/answer/14151465
- Managed publishing, thời gian review: https://support.google.com/googleplay/android-developer/answer/9859654
- App access (thông tin đăng nhập, phải bằng tiếng Anh): https://support.google.com/googleplay/android-developer/answer/15748846
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Gói đăng ký: https://support.google.com/googleplay/android-developer/answer/9900533
- Phát hành và staged rollout: https://support.google.com/googleplay/android-developer/answer/9859348
- Thử nghiệm mở/kín/nội bộ: https://support.google.com/googleplay/android-developer/answer/9845334
- Android vitals: https://developer.android.com/topic/performance/vitals
